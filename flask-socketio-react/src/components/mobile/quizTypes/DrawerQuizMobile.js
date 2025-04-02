import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { getSocket } from '../../../utils/socket';

const DrawerQuizMobile = ({ selectedWord, playerName }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [isWordVisible, setIsWordVisible] = useState(false);
  const [canvasImageData, setCanvasImageData] = useState(null);
  const socket = getSocket();
  const throttleTimerRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  // Toggle word visibility
  const toggleWordVisibility = () => {
    setIsWordVisible(prev => !prev);
  };

  // Initialize canvas when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions to fill the parent container
    const updateCanvasSize = () => {
      // Get current dimensions
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      
      // Calculate new dimensions
      const containerWidth = canvas.parentElement.clientWidth;
      const containerHeight = window.innerHeight * 0.75;
      
      // Only update if dimensions have changed
      if (prevWidth !== containerWidth || prevHeight !== containerHeight) {
        // Save current canvas content
        if (context) {
          try {
            const imageData = canvas.toDataURL('image/png');
            setCanvasImageData(imageData);
          } catch (e) {
            console.error("Failed to save canvas state:", e);
          }
        }
        
        // Update canvas dimensions
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // Get context with new dimensions
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        setContext(ctx);
        setCanvasWidth(containerWidth);
        setCanvasHeight(containerHeight);
        
        // Restore saved canvas content
        if (canvasImageData) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = canvasImageData;
        }
      }
    };

    // Initial setup
    updateCanvasSize();
    
    // Handle window resize with debounce to avoid too many updates
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        updateCanvasSize();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [canvasImageData, context]);

  // More reliable throttling for touch handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Touch event handlers
    const handleTouchStart = (e) => {
      e.preventDefault();
      if (!context) return;
      
      // Cancel any pending throttle timer first
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      
      setIsDrawing(true);
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Draw a dot immediately for a single tap
      context.beginPath();
      context.arc(x, y, context.lineWidth / 2, 0, Math.PI * 2, true);
      context.fill();
      context.beginPath();
      context.moveTo(x, y);
      
      // Send the dot immediately
      sendDrawingUpdate(false);
    };
    
    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawing || !context) return;
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      context.lineTo(x, y);
      context.stroke();
      
      // Improved throttling that doesn't accumulate timers
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          if (isDrawing) { // Only send if still drawing
            sendDrawingUpdate(false);
          }
          throttleTimerRef.current = null;
        }, 50); // Keep at 50ms for better responsiveness
      }
    };
    
    const handleTouchEnd = (e) => {
      if (isDrawing) {
        context.closePath();
        setIsDrawing(false);
        
        // Cancel any pending throttle timer
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        
        // Add a tiny delay before sending final update to avoid race conditions
        setTimeout(() => {
          sendDrawingUpdate(true);
        }, 10);
      }
    };
    
    // Add event listeners with passive: false
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Cleanup
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [context, isDrawing]);

  // Save current canvas state
  const saveCanvasState = () => {
    if (!canvasRef.current || !context) return;
    try {
      const imageData = canvasRef.current.toDataURL('image/png');
      setCanvasImageData(imageData);
    } catch (e) {
      console.error("Failed to save canvas state:", e);
    }
  };

  // Fix the same issue in mouse event handlers
  const startDrawing = (e) => {
    if (!context || e.type.includes('touch')) return;
    
    // Cancel any pending throttle timer first
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    e.preventDefault();
    setIsDrawing(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Draw a dot immediately for a single click
    context.beginPath();
    context.arc(x, y, context.lineWidth / 2, 0, Math.PI * 2, true);
    context.fill();
    context.beginPath();
    context.moveTo(x, y);
    
    // Send the dot immediately
    sendDrawingUpdate(false);
  };

  const draw = (e) => {
    if (!isDrawing || !context || e.type.includes('touch')) return;
    
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
    
    // Throttle drawing updates - send real-time updates while drawing
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        // Don't save canvas state during active drawing, just send update
        sendDrawingUpdate(false);
        throttleTimerRef.current = null;
      }, 50);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      context.closePath();
      setIsDrawing(false);
      
      // Cancel any pending throttle timer
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      
      // Add a tiny delay before sending final update to avoid race conditions
      setTimeout(() => {
        sendDrawingUpdate(true);
      }, 10);
    }
  };

  // Send current canvas state to server in real-time
  const sendDrawingUpdate = (shouldSaveState = false) => {
    if (!canvasRef.current) return;
    
    try {
      // Only send the drawing data if we're actively drawing or explicitly saving state
      // This prevents unnecessary updates that cause flashing
      if (isDrawing || shouldSaveState) {
        // Use a lower quality setting for more efficient network usage
        const drawingData = canvasRef.current.toDataURL('image/png', 0.6);
        
        // Only save the canvas state if requested (typically on stroke completion)
        if (shouldSaveState) {
          setCanvasImageData(drawingData);
        }
        
        // Emit drawing update
        socket.emit('drawing_update', {
          drawingData: drawingData,
          player_name: playerName, 
          action: 'draw'
        });
      }
    } catch (error) {
      console.error('Error sending drawing update:', error);
    }
  };

  // Clear the canvas
  const clearCanvas = () => {
    if (!context) return;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    setCanvasImageData(null); // Clear saved state
    
    // Emit clear action
    socket.emit('drawing_update', {
      player_name: playerName,
      action: 'clear'
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 2
      }}
    >
      {selectedWord && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 2, 
          position: 'relative',
          width: '100%'
        }}>
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              textAlign: 'center',
              fontWeight: 'bold'
            }}
          >
            Nakresli: {isWordVisible ? selectedWord : '*******'}
          </Typography>
          <IconButton 
            onClick={toggleWordVisibility} 
            sx={{ ml: 1 }}
            color="primary"
          >
            {isWordVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Box>
      )}
      
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          mb: 2,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            bgcolor: '#ffffff'
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              border: '1px solid #ddd',
              cursor: 'crosshair',
              touchAction: 'none', // Prevents scrolling on touch devices
            }}
          />
        </Box>
      </Paper>

      <Button
        variant="outlined"
        color="primary"
        onClick={clearCanvas}
        sx={{ width: '40%' }}
      >
        Vymazat
      </Button>
    </Box>
  );
};

export default DrawerQuizMobile;
