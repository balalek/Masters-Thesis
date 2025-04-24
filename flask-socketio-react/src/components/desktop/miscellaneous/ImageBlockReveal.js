import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const ImageBlockReveal = ({ imageUrl, timeRemaining, totalTime, onError }) => {
  const [revealedBlocks, setRevealedBlocks] = useState([]);
  const blocksToRevealRef = useRef(null);
  
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

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '800px', // Increased from 600px to 800px
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 4,
        border: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {/* Background image (full image) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      >
        <img
          src={imageUrl}
          alt="Question Media"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain', // Changed from 'cover' to 'contain'
          }}
          onError={onError}
          onLoad={(e) => {
            // Adjust the container height based on the loaded image
            const parentBox = e.target.parentNode.parentNode;
            const imgRatio = e.target.naturalHeight / e.target.naturalWidth;
            parentBox.style.height = `${parentBox.offsetWidth * imgRatio}px`;
          }}
        />
      </Box>

      {/* Grid of block masks - each cell is a black overlay that hides part of the image */}
      {[...Array(9).keys()].map(blockIndex => {
        const isRevealed = revealedBlocks.includes(blockIndex);
        const row = Math.floor(blockIndex / 3);
        const col = blockIndex % 3;

        return (
          <Box
            key={blockIndex}
            sx={{
              gridRow: row + 1,
              gridColumn: col + 1,
              backgroundColor: 'black',
              zIndex: isRevealed ? 0 : 2, // Place behind image if revealed, above if not
              transition: 'opacity 0.5s ease',
              opacity: isRevealed ? 0 : 1,
            }}
          />
        );
      })}
    </Box>
  );
};

export default ImageBlockReveal;
