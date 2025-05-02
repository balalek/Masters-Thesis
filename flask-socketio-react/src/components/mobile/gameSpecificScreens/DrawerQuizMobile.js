/**
 * @fileoverview Drawer Quiz Mobile component for drawing game mode
 * 
 * This component provides:
 * - Canvas-based drawing interface for mobile devices
 * - Multiple drawing tools (pencil, fill)
 * - Color selection and stroke size adjustment
 * - Real-time drawing updates via Socket.IO
 * - Undo functionality with history tracking
 * - Touch and mouse input support
 * - Responsive canvas sizing for various devices
 * 
 * @module Components/Mobile/GameSpecificScreens/DrawerQuizMobile
 */
import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Menu } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CreateIcon from '@mui/icons-material/Create';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import PaletteIcon from '@mui/icons-material/Palette';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteIcon from '@mui/icons-material/Delete';
import { getSocket } from '../../../utils/socket';

/**
 * Drawer Quiz Mobile component for the drawing player's interface
 * 
 * Provides a drawing canvas with tools for the player assigned to draw
 * during the drawing game round, with tools for creating and editing drawings
 * and real-time synchronization with viewers.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.selectedWord - The word that the player must draw
 * @param {string} props.playerName - Name of the current player
 * @returns {JSX.Element} The rendered drawing interface
 */
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
  
  // Drawing tool states
  const [currentTool, setCurrentTool] = useState('pencil');
  const [currentColor, setCurrentColor] = useState('#000000');
  const brushSize = 5; // Default brush size
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Colors for color picker
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#008000', '#800000', '#008080', '#000080', '#808080'
  ];

  /**
   * Toggle visibility of the word to draw
   * 
   * Allows the player to hide/show the word they need to draw
   * to prevent others from seeing it.
   * 
   * @function toggleWordVisibility
   */
  const toggleWordVisibility = () => {
    setIsWordVisible(prev => !prev);
  };

  /**
   * Change the current drawing tool
   * 
   * Updates the drawing context properties based on the selected tool.
   * 
   * @function handleToolChange
   * @param {string} tool - The tool to switch to ('pencil', 'fill')
   */
  const handleToolChange = (tool) => {
    setCurrentTool(tool);
    
    if (context) {
      context.globalCompositeOperation = 'source-over';
    }
  };

  /**
   * Open the color selection menu
   * 
   * @function handleColorOpen
   * @param {Object} event - The click event
   */
  const handleColorOpen = (event) => {
    setColorMenuAnchor(event.currentTarget);
  };

  /**
   * Close the color selection menu
   * 
   * @function handleColorClose
   */
  const handleColorClose = () => {
    setColorMenuAnchor(null);
  };

  /**
   * Select a drawing color
   * 
   * @function handleColorSelect
   * @param {string} color - Hex color code
   */
  const handleColorSelect = (color) => {
    setCurrentColor(color);
    if (context) {
      context.strokeStyle = color;
      context.fillStyle = color;
    }
    handleColorClose();
  };

  /**
   * Save the current canvas state to history
   * 
   * Manages history stack for undo functionality while
   * preventing excessive memory usage.
   * 
   * @function saveToHistory
   */
  const saveToHistory = () => {
    if (canvasRef.current) {
      try {
        const imageData = canvasRef.current.toDataURL('image/png');
        
        // Only save if different from the last state and canvas isn't empty
        const isEmpty = isCanvasEmpty();
        
        if (!isEmpty && (historyIndex === -1 || imageData !== canvasHistory[historyIndex])) {
          // Trim history to prevent memory issues (keep last 20 states max)
          const maxHistoryLength = 20;
          let newHistory = canvasHistory.slice(0, historyIndex + 1);
          newHistory.push(imageData);
          
          // If history gets too long, remove oldest items
          if (newHistory.length > maxHistoryLength) {
            newHistory = newHistory.slice(newHistory.length - maxHistoryLength);
          }
          
          setCanvasHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          setCanvasImageData(imageData);
        }
      } catch (error) {
        console.error('Error saving to history:', error);
      }
    }
  };

  /**
   * Check if the canvas is empty
   * 
   * @function isCanvasEmpty
   * @returns {boolean} True if canvas has no content
   */
  const isCanvasEmpty = () => {
    if (!canvasRef.current || !context) return true;
    
    const pixelBuffer = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
    
    // Check if all pixel alpha values are 0 (transparent)
    for (let i = 3; i < pixelBuffer.length; i += 4) {
      if (pixelBuffer[i] !== 0) {
        return false; // Canvas has content
      }
    }
    return true; // Canvas is empty
  };

  /**
   * Undo the last drawing action
   * 
   * Restores the previous state from history and updates
   * the remote view.
   * 
   * @function handleUndo
   */
  const handleUndo = () => {
    if (!context || historyIndex < 0) return;
    
    try {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        
        const img = new Image();
        img.onload = () => {
          // Clear the canvas first to avoid any artifacts
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          
          // Send drawing update after undo is complete
          sendDrawingUpdate(true);
        };
        img.src = canvasHistory[newIndex];
      } else {
        // If at the beginning of history, just clear the canvas
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        setHistoryIndex(-1); // Reset history index
        setCanvasHistory([]); // Clear history when canvas is cleared
        setCanvasImageData(null);
        sendDrawingUpdate(true);
      }
    } catch (error) {
      console.error('Error during undo:', error);
      // If undo fails, reset the canvas and history as a fallback
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      setCanvasHistory([]);
      setHistoryIndex(-1);
      setCanvasImageData(null);
      sendDrawingUpdate(true);
    }
  };

  /**
   * Clear the entire canvas
   * 
   * Resets the canvas to blank and clears history.
   * 
   * @function handleClear
   */
  const handleClear = () => {
    if (context) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      setCanvasHistory([]);
      setHistoryIndex(-1);
      setCanvasImageData(null);
      sendDrawingUpdate(true);
    }
  };

  /**
   * Perform flood fill from a starting point
   * 
   * Implements a breadth-first search algorithm to fill connected
   * areas with the current color.
   * 
   * @function floodFill
   * @param {number} startX - X coordinate to start fill
   * @param {number} startY - Y coordinate to start fill
   */
  const floodFill = (startX, startY) => {
    if (!context || !canvasRef.current) return;
    
    try {
      // Get canvas image data
      const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;
      
      // Get the color at the starting position
      const startPos = (startY * canvasWidth + startX) * 4;
      const startR = data[startPos];
      const startG = data[startPos + 1];
      const startB = data[startPos + 2];
      const startA = data[startPos + 3];
      const targetColor = context.fillStyle || currentColor;
      
      let r, g, b;
      
      // Parse the target color
      const rgbMatch = targetColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        r = parseInt(rgbMatch[1], 10);
        g = parseInt(rgbMatch[2], 10);
        b = parseInt(rgbMatch[3], 10);
      } else {
        const hexColor = targetColor.startsWith('#') ? targetColor : currentColor;
        r = parseInt(hexColor.slice(1, 3), 16);
        g = parseInt(hexColor.slice(3, 5), 16);
        b = parseInt(hexColor.slice(5, 7), 16);
      }
      
      const isBlackPixel = startR < 10 && startG < 10 && startB < 10;
      
      // Check if the starting pixel is already the target color
      if (startR === r && startG === g && startB === b && startA === 255) {
        return;
      }
      
      const pixelsToCheck = [];
      pixelsToCheck.push([startX, startY]);
      
      const tolerance = isBlackPixel ? 10 : 30;
      
      /**
       * Function to check if a pixel is similar to the target color with some tolerance
       * 
       * @function isSimilarColor
       * @param {number} pos - Position in the image data array
       * @returns {boolean} True if the pixel color is similar to the target color
       */
      const isSimilarColor = (pos) => {
        return (
          Math.abs(data[pos] - startR) <= tolerance &&
          Math.abs(data[pos + 1] - startG) <= tolerance &&
          Math.abs(data[pos + 2] - startB) <= tolerance &&
          Math.abs(data[pos + 3] - startA) <= tolerance
        );
      };
      
      const visited = new Set();
      
      // Perform flood fill using a stack (iterative approach)
      while (pixelsToCheck.length > 0) {
        const [x, y] = pixelsToCheck.pop();
        
        // Check if the pixel is within canvas bounds
        if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) {
          continue;
        }
        
        // Get the pixel position in the image data array
        const pos = (y * canvasWidth + x) * 4;
        
        // Check if the pixel has already been visited or is not similar to the target color
        const pixelKey = `${x},${y}`;
        if (visited.has(pixelKey) || !isSimilarColor(pos)) {
          continue;
        }
        
        visited.add(pixelKey);
        
        // Set the pixel to the target color
        data[pos] = r;
        data[pos + 1] = g;
        data[pos + 2] = b;
        data[pos + 3] = 255;
        
        // Add neighboring pixels to the stack
        pixelsToCheck.push([x + 1, y]);
        pixelsToCheck.push([x - 1, y]);
        pixelsToCheck.push([x, y + 1]);
        pixelsToCheck.push([x, y - 1]);
      }
      
      // Update the canvas with the new image data
      context.putImageData(imageData, 0, 0);
      
      // Save the current state to history
      setTimeout(() => {
        saveToHistory();
        sendDrawingUpdate(true);
      }, 0);
    } catch (error) {
      console.error('Error during fill operation:', error);
    }
  };

  // Initialize canvas when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /**
     * Update canvas size and context
     * 
     * Sets the canvas size to match the parent element and initializes
     * the drawing context with the current color and brush size.
     * 
     * @function updateCanvasSize
     */
    const updateCanvasSize = () => {
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      
      const containerWidth = canvas.parentElement.clientWidth;
      const containerHeight = window.innerHeight;
      
      // Set canvas size to match parent element
      if (prevWidth !== containerWidth || prevHeight !== containerHeight) {
        if (context) {
          try {
            const imageData = canvas.toDataURL('image/png');
            setCanvasImageData(imageData);
          } catch (e) {
            console.error("Failed to save canvas state:", e);
          }
        }
        
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // Set up the drawing context
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
        ctx.globalCompositeOperation = 'source-over';
        setContext(ctx);
        setCanvasWidth(containerWidth);
        setCanvasHeight(containerHeight);
        
        if (canvasImageData) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = canvasImageData;
        }
      }
    };

    updateCanvasSize();
    
    /**
     * Handle window resize events
     * 
     * Debounces the resize event to prevent excessive updates
     * to the canvas size and context.
     * 
     * @function handleResize
     */
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        updateCanvasSize();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [canvasImageData, context, currentColor, brushSize, currentTool]);

  /**
   * Initialize canvas drawing
   * 
   * @function startDrawing
   * @param {Object} e - Mouse event
   */
  const startDrawing = (e) => {
    if (!context || e.type.includes('touch')) return;
    
    // Clear any existing throttle timer
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    e.preventDefault();
    setIsDrawing(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Calculate scale factors to correct mouse position
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    // Apply scaling to get accurate coordinates
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    // Depending on the tool, set the context properties
    if (currentTool === 'pencil') {
      context.beginPath();
      context.arc(x, y, brushSize / 2, 0, Math.PI * 2, true);
      context.fill();
      context.beginPath();
      context.moveTo(x, y);
    } else if (currentTool === 'fill') {
      floodFill(x, y);
    }
    
    // Send drawing update to server
    sendDrawingUpdate(false);
  };

  /**
   * Continue drawing while mouse is moving
   * 
   * @function draw
   * @param {Object} e - Mouse event
   */
  const draw = (e) => {
    if (!isDrawing || !context || e.type.includes('touch') || currentTool === 'fill') return;
    
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Calculate scale factors to correct mouse position
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    // Apply scaling to get accurate coordinates
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    context.lineTo(x, y);
    context.stroke();
    
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        sendDrawingUpdate(false);
        throttleTimerRef.current = null;
      }, 50);
    }
  };

  /**
   * End drawing when mouse is released
   * 
   * @function stopDrawing
   */
  const stopDrawing = () => {
    if (isDrawing) {
      context.closePath();
      setIsDrawing(false);
      
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      
      saveToHistory();
      
      setTimeout(() => {
        sendDrawingUpdate(true);
      }, 10);
    }
  };

  // Handle touch events for mobile devices
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    /**
     * Handle touch start event
     * 
     * Sets up the drawing context and starts drawing on touch devices.
     * 
     * @function handleTouchStart
     * @param {Object} e - Touch event
     */
    const handleTouchStart = (e) => {
      e.preventDefault();
      if (!context) return;
      
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      
      setIsDrawing(true);
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      
      // Calculate scale factors to correct touch position
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Apply scaling to get accurate coordinates
      const x = Math.floor((touch.clientX - rect.left) * scaleX);
      const y = Math.floor((touch.clientY - rect.top) * scaleY);
      
      if (currentTool === 'pencil') {
        context.beginPath();
        context.arc(x, y, brushSize / 2, 0, Math.PI * 2, true);
        context.fill();
        context.beginPath();
        context.moveTo(x, y);
      } else if (currentTool === 'fill') {
        floodFill(x, y);
      }
      
      sendDrawingUpdate(false);
    };
    
    /**
     * Handle touch move event
     * 
     * Continues drawing on the canvas while the finger is moving.
     * 
     * @function handleTouchMove
     * @param {Object} e - Touch event
     */
    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawing || !context || currentTool === 'fill') return;
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      
      // Calculate scale factors to correct touch position
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Apply scaling to get accurate coordinates
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      
      context.lineTo(x, y);
      context.stroke();
      
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          if (isDrawing) {
            sendDrawingUpdate(false);
          }
          throttleTimerRef.current = null;
        }, 50);
      }
    };
    
    /**
     * Handle touch end event
     * 
     * Ends the drawing session and saves the current state to history.
     * 
     * @function handleTouchEnd
     * @param {Object} e - Touch event
     */
    const handleTouchEnd = (e) => {
      if (isDrawing) {
        context.closePath();
        setIsDrawing(false);
        
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        
        saveToHistory();
        
        setTimeout(() => {
          sendDrawingUpdate(true);
        }, 10);
      }
    };
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [context, isDrawing, currentTool, brushSize, canvasWidth, canvasHeight]);

  /**
   * Send drawing updates to server
   * 
   * Transmits canvas image data to the main screen.
   * 
   * @function sendDrawingUpdate
   * @param {boolean} shouldSaveState - Whether to save state in history
   */
  const sendDrawingUpdate = (shouldSaveState = false) => {
    if (!canvasRef.current) return;
    
    try {
      if (isDrawing || shouldSaveState) {
        const drawingData = canvasRef.current.toDataURL('image/png', 0.6);
        
        if (shouldSaveState) {
          setCanvasImageData(drawingData);
        }
        
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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {selectedWord && (
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 1,
          zIndex: 10,
          borderBottom: '1px solid rgba(0,0,0,0.1)'
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
      
      <Box
        sx={{
          position: 'absolute',
          top: selectedWord ? '56px' : 0,
          left: 0,
          right: 0,
          bottom: '70px',
          overflow: 'hidden',
          px: 1
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
              touchAction: 'none',
            }}
          />
        </Box>
      </Box>

      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex', 
          justifyContent: 'space-around', 
          padding: 1,
          borderTop: '1px solid rgba(0,0,0,0.1)',
          zIndex: 10
        }}
      >
        <IconButton 
          color={currentTool === 'pencil' ? 'primary' : 'default'}
          sx={{ 
            backgroundColor: currentTool === 'pencil' ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
            border: currentTool === 'pencil' ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.5)',
            p: 1.5
          }}
          onClick={() => handleToolChange('pencil')}
        >
          <CreateIcon />
        </IconButton>
        
        <IconButton 
          color={currentTool === 'fill' ? 'primary' : 'default'}
          sx={{ 
            backgroundColor: currentTool === 'fill' ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
            border: currentTool === 'fill' ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.5)',
            p: 1.5
          }}
          onClick={() => handleToolChange('fill')}
        >
          <FormatColorFillIcon />
        </IconButton>
        
        <IconButton 
          sx={{ 
            p: 1.5,
            backgroundColor: 'white',
            border: '1px solid rgba(0,0,0,0.5)',
            position: 'relative',
            width: 50,
            height: 50,
            '&::after': {
              content: '""',
              position: 'absolute',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: currentColor,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }
          }}
          onClick={handleColorOpen}
        >
          <PaletteIcon sx={{ color: 'transparent', fontSize: '1.2rem' }} />
        </IconButton>
        
        <IconButton 
          sx={{ 
            p: 1.5,
            border: '1px solid rgba(0,0,0,0.5)'
          }}
          onClick={handleUndo}
          disabled={historyIndex <= 0}
        >
          <UndoIcon />
        </IconButton>
        
        <IconButton 
          color="error"
          sx={{ 
            p: 1.5,
            border: '1px solid rgba(0,0,0,0.5)'
          }}
          onClick={handleClear}
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      <Menu
        anchorEl={colorMenuAnchor}
        open={Boolean(colorMenuAnchor)}
        onClose={handleColorClose}
      >
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 1,
          p: 1
        }}>
          {colors.map((color) => (
            <Box
              key={color}
              onClick={() => handleColorSelect(color)}
              sx={{
                width: 36,
                height: 36,
                backgroundColor: color,
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: '0 0 5px rgba(0,0,0,0.2)'
                }
              }}
            />
          ))}
        </Box>
      </Menu>
    </Box>
  );
};

export default DrawerQuizMobile;