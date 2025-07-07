/**
 * @fileoverview Image Block Reveal component for progressive image unveiling
 * 
 * This component provides:
 * - Progressive image reveal through a 3x3 grid of blocks
 * - Randomized reveal sequence for visual interest
 * - Time-based reveal calculation synchronized with question timer
 * - Responsive sizing based on image dimensions and viewport
 * - Smooth transition effects for block removal
 * @author Bc. Martin Baláž
 * @module Components/Desktop/Miscellaneous/ImageBlockReveal
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

/**
 * Image Block Reveal component for gradually unveiling images
 * 
 * Divides an image into 9 blocks that progressively reveal the image
 * as time passes, creating anticipation and visual interest during
 * the question answering period.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.imageUrl - URL of the image to display and reveal
 * @param {number} props.timeRemaining - Time remaining in milliseconds
 * @param {number} props.totalTime - Total question time in milliseconds
 * @param {Function} props.onError - Handler for image loading errors
 * @returns {JSX.Element} The rendered image block reveal component
 */
const ImageBlockReveal = ({ imageUrl, timeRemaining, totalTime, onError }) => {
  const [revealedBlocks, setRevealedBlocks] = useState([]);
  const blocksToRevealRef = useRef(null);
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Initialize the blocks reveal sequence once
  useEffect(() => {
    if (!blocksToRevealRef.current) {
      // Create array of all 9 block indexes
      const allBlocks = [...Array(9).keys()];
      
      // Shuffle blocks for randomized reveal order
      const shuffledBlocks = [...allBlocks].sort(() => Math.random() - 0.5);
      
      // Store the reveal sequence
      blocksToRevealRef.current = shuffledBlocks;
      
      // Reveal the first block immediately
      setRevealedBlocks([shuffledBlocks[0]]);
    }
  }, []);

  // Update revealed blocks based on time passed
  useEffect(() => {
    if (timeRemaining === null || !blocksToRevealRef.current) return;
    
    // Calculate time passed percentage
    const timePassed = totalTime - timeRemaining;
    const timePassedPercent = timePassed / totalTime;
    
    // Determine how many blocks should be revealed at this time
    // We want all 9 blocks revealed by 80% of time
    // The first block is revealed at 0%, and then one additional block every 10%
    const targetRevealCount = Math.min(9, Math.ceil(timePassedPercent * 9 / 0.8));
    
    // If we need to show more blocks than currently revealed
    if (targetRevealCount > revealedBlocks.length) {
      const newRevealedBlocks = blocksToRevealRef.current.slice(0, targetRevealCount);
      setRevealedBlocks(newRevealedBlocks);
    }
  }, [timeRemaining, totalTime, revealedBlocks.length]);

  /**
   * Handles image load event and captures natural dimensions
   * 
   * @function handleImageLoad
   * @param {Event} e - Image load event
   */
  const handleImageLoad = (e) => {
    const img = e.target;
    const { naturalWidth, naturalHeight } = img;
    
    // Store the natural dimensions of the image
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
    setImageLoaded(true);
  };

  /**
   * Calculates container dimensions based on image aspect ratio
   * 
   * Determines optimal container size considering image aspect ratio,
   * viewport dimensions, and maximum width/height constraints.
   * 
   * @function getContainerStyle
   * @returns {Object} CSS style object with width, height, and position
   */
  const getContainerStyle = () => {
    if (!imageLoaded) {
      return { width: '100%', maxWidth: '800px' };
    }
    
    const { width, height } = imageDimensions;
    const aspectRatio = height / width;
    
    // Limit max width to 800px and max height to 60vh
    const maxWidth = 800;
    const maxHeight = window.innerHeight * 0.6; // 60vh
    
    let finalWidth, finalHeight;
    
    if (aspectRatio > 1) {
      // Portrait image - height is the limiting factor
      finalHeight = Math.min(maxHeight, maxWidth * aspectRatio);
      finalWidth = finalHeight / aspectRatio;
    } else {
      // Landscape image - width is the limiting factor
      finalWidth = Math.min(maxWidth, maxHeight / aspectRatio);
      finalHeight = finalWidth * aspectRatio;
    }
    
    return {
      width: finalWidth + 'px',
      height: finalHeight + 'px',
      position: 'relative',
    };
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: '800px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          ...getContainerStyle(),
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: 4,
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        {/* Main image */}
        <Box 
          component="img"
          src={imageUrl}
          alt="Question Media"
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 1,
          }}
          onLoad={handleImageLoad}
          onError={onError}
        />

        {/* Overlay grid cells */}
        {imageLoaded && [...Array(9)].map((_, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const isRevealed = revealedBlocks.includes(index);

          return (
            <Box
              key={index}
              sx={{
                gridRow: row + 1,
                gridColumn: col + 1,
                backgroundColor: 'black',
                zIndex: isRevealed ? 0 : 2,
                transition: 'opacity 0.5s ease',
                opacity: isRevealed ? 0 : 1,
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ImageBlockReveal;