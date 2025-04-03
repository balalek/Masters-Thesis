import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import { createInitialMask, shouldRevealLetter } from '../../../utils/letterReveal';

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
  const [letterMask, setLetterMask] = useState('');
  const [lastReveal, setLastReveal] = useState(0);
  const socket = getSocket();

  // Set up initial mask when word is selected
  useEffect(() => {
    if (selectedWord) {
      const mask = createInitialMask(selectedWord);
      setLetterMask(mask);
    }
  }, [selectedWord]);

  // Make sure the word is initialized correctly when component mounts
  useEffect(() => {
    // Check if we have a question but no selected word yet
    if (question) {
      const socket = getSocket();
      
      // Request the current word from the server
      console.log('Requesting current drawing word from server');
      socket.emit('get_current_drawing_word');
      
      // Add listener for the response
      const handleDrawingWordResponse = (data) => {
        console.log('Received drawing word response:', data);
        if (data.word) {
          setSelectedWord(data.word);
          setLetterMask(data.word);
        }
      };
      
      socket.on('drawing_word_response', handleDrawingWordResponse);
      
      return () => {
        socket.off('drawing_word_response', handleDrawingWordResponse);
      };
    }
  }, [question]);

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
          
          // Only attempt to reveal letters if a word has been selected
          if (selectedWord) {
            // Calculate letters to reveal using the utility function
            const totalTime = question.length || 30;
            const elapsedTime = totalTime - remaining;
            const timePassedPercent = elapsedTime / totalTime;
            
            const { shouldReveal } = shouldRevealLetter({
              timePassedPercent,
              answer: selectedWord,
              currentMask: letterMask,
              lastRevealTime: lastReveal,
              currentTime: remaining
            });
            
            if (shouldReveal) {
              socket.emit('reveal_drawing_letter');
              setLastReveal(remaining);
            }
          }
        }
      }, 100); // Update 10 times per second for smoother countdown

      return () => clearInterval(timer);
    }
  }, [question_end_time, socket, question, lastReveal, selectedWord, letterMask]);

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
        setLetterMask(data.word); // Initialize mask with the masked word
        setIsRealTimeDrawing(true);
      }
    });

    // Listen for letter reveals
    socket.on('drawing_letter_revealed', (data) => {
      setLetterMask(data.mask);
    });

    // Cleanup
    return () => {
      socket.off('drawing_answer_submitted');
      socket.off('display_drawing');
      socket.off('drawing_update_broadcast');
      socket.off('word_selected');
      socket.off('drawing_letter_revealed');
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

  // Display the masked answer - similar to OpenAnswerQuiz
  const renderMaskedAnswer = () => {
    if (!letterMask) return null;
    
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        my: 2
      }}>
        {letterMask.split('').map((char, index) => (
          <Paper
            key={index}
            elevation={2}
            sx={{
              width: '40px',
              height: '50px',
              m: 0.5,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: char === '_' ? 'grey.200' : 'primary.light',
              visibility: char === ' ' ? 'hidden' : 'visible',
              // Make underscore placeholders slightly bigger
              ...(char === '_' && { 
                width: '42px',
                border: '1px dashed grey' 
              })
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {char === '_' ? '' : char}
            </Typography>
          </Paper>
        ))}
      </Box>
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
        
        {/* Letter revelation area BELOW the canvas - moved outside to be always visible */}
        {selectedWord && (
          <Box sx={{ 
            width: '100%', 
            p: 2, 
            backgroundColor: 'rgba(240, 240, 240, 0.8)',
            borderRadius: 2,
            border: '1px solid #ddd',
            mb: 2
          }}>
            {renderMaskedAnswer()}
          </Box>
        )}
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