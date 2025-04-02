import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';

const DrawingQuiz = ({ question, question_end_time }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [drawingSubmissions, setDrawingSubmissions] = useState(0);
  const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
  const [showDrawing, setShowDrawing] = useState(false);
  const [displayedDrawings, setDisplayedDrawings] = useState([]);
  const [currentRealTimeDrawing, setCurrentRealTimeDrawing] = useState(null);
  const [isRealTimeDrawing, setIsRealTimeDrawing] = useState(true);
  const [currentDrawer, setCurrentDrawer] = useState(question?.player || null);
  const [selectedWord, setSelectedWord] = useState(null);
  const socket = getSocket();

  // Timer effect
  useEffect(() => {
    if (question_end_time) {
      console.log('DrawingQuiz: Setting up timer with end time:', new Date(question_end_time).toLocaleTimeString());
      
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((question_end_time - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
          console.log('DrawingQuiz: Time up triggered');
          socket.emit('time_up');  // Emit time_up immediately when timer ends
        } else {
          setTimeRemaining(remaining);
        }
      }, 100); // Update 10 times per second for smoother countdown

      return () => clearInterval(timer);
    }
  }, [question_end_time, socket]);

  // Set the current drawer from the question
  useEffect(() => {
    if (question && question.player) {
      setCurrentDrawer(question.player);
    }
  }, [question]);

  // Socket event listener for drawing submissions
  useEffect(() => {
    const socket = getSocket();
    
    console.log("Setting up drawing socket listeners");

    // Change from 'drawing_submitted' to 'drawing_answer_submitted' to match server event
    socket.on('drawing_answer_submitted', (data) => {
      console.log('Received drawing_answer_submitted:', data);
      setDrawingSubmissions(data.correct_count);
    });

    // Listen for drawing display instructions
    socket.on('display_drawing', (data) => {
      console.log('Received display_drawing instruction:', data);
      setDisplayedDrawings(prev => [...prev, data]);
      setCurrentDrawingIndex(prev => prev + 1);
      setShowDrawing(true);
      // Hide real-time drawing when showing a submitted drawing
      setIsRealTimeDrawing(false);
    });

    // Listen for real-time drawing updates with improved rendering
    socket.on('drawing_update_broadcast', (data) => {
      if (data.action === 'draw') {
        // Only update if the drawing data actually changed to prevent flashing
        setCurrentRealTimeDrawing(prevDrawing => {
          // If it's the same data, don't trigger a re-render
          if (prevDrawing === data.drawingData) return prevDrawing;
          return data.drawingData;
        });
        setIsRealTimeDrawing(true);
      } else if (data.action === 'clear') {
        setCurrentRealTimeDrawing(null);
      }
    });

    // Listen for word selection
    socket.on('word_selected', (data) => {
      if (!data.is_drawer) {
        setSelectedWord(data.word);
        setIsRealTimeDrawing(true);
      }
    });

    // Cleanup
    return () => {
      socket.off('drawing_answer_submitted'); // Update this to match the new event name
      socket.off('display_drawing');
      socket.off('drawing_update_broadcast');
      socket.off('word_selected');
    };
  }, []);

  // Optimize image rendering
  const renderDrawingImage = () => {
    if (!isRealTimeDrawing || !currentRealTimeDrawing) {
      return (
        <Typography variant="body1" color="text.secondary">
          {selectedWord 
            ? "Čeká se na kresbu od hráče" 
            : "Čeká se na výběr slova od hráče"} {currentDrawer || '...'}
        </Typography>
      );
    }
    
    // Use an optimized image rendering approach
    return (
      <img 
        src={currentRealTimeDrawing} 
        alt="Real-time drawing"
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
    );
  };

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'flex-start',
      gap: 4,
      height: '100vh', 
      p: 2,
      overflow: 'hidden'
    }}>
      {/* Timer bubble on left */}
      <Box sx={{ 
        width: 120,
        height: 120,
        borderRadius: '50%',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: '2px solid #3B82F6',
        alignSelf: 'center'
      }}>
        <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
          {timeRemaining ?? '--'}
        </Typography>
      </Box>

      {/* Center column with question and drawing canvas */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Question text at top */}
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            textAlign: 'center',
            fontWeight: 500,
            mb: 3,
            mt: 1
          }}
        >
          {question?.question}
        </Typography>

        {/* Word being drawn (if available) */}
        {selectedWord && (
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 3,
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            Hádané slovo: {selectedWord}
          </Typography>
        )}

        {/* Real-time drawing canvas - takes remaining height */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '1px solid #ddd',
          backgroundColor: 'white',
          borderRadius: 2,
          overflow: 'hidden',
          mb: 2
        }}>
          {renderDrawingImage()}
        </Box>
      </Box>

      {/* Submissions counter on right */}
      <Box sx={{ 
        width: 120,
        height: 120,
        borderRadius: '50%',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        border: '2px solid #3B82F6',
        alignSelf: 'center'
      }}>
        <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
          {drawingSubmissions}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt: -1.5 }}>
          odpovědí
        </Typography>
      </Box>
    </Box>
  );
};

export default DrawingQuiz;