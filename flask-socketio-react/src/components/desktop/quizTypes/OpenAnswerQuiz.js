import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import { createInitialMask, shouldRevealLetter } from '../../../utils/letterReveal';
import ImageBlockReveal from '../miscellaneous/ImageBlockReveal';

const OpenAnswerQuiz = ({ question, question_end_time }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [letterMask, setLetterMask] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [lastReveal, setLastReveal] = useState(0);
  const socket = getSocket();

  // Add a ref for the audio element
  const audioRef = React.useRef(null);

  // Create initial mask with underscores and spaces using the utility function
  useEffect(() => {
    if (question && question.open_answer) {
      const mask = createInitialMask(question.open_answer);
      setLetterMask(mask);
    }
  }, [question]);

  // Timer effect
  useEffect(() => {
    if (question_end_time) {
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((question_end_time - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
          socket.emit('time_up');
        } else {
          setTimeRemaining(remaining);
          
          // Calculate letters to reveal using the utility function
          if (question?.open_answer) {
            const totalTime = question.length || 30;
            const elapsedTime = totalTime - remaining;
            const timePassedPercent = elapsedTime / totalTime;
            
            const { shouldReveal } = shouldRevealLetter({
              timePassedPercent,
              answer: question.open_answer,
              currentMask: letterMask,
              lastRevealTime: lastReveal,
              currentTime: remaining
            });
            
            if (shouldReveal) {
              socket.emit('reveal_open_answer_letter');
              setLastReveal(remaining);
            }
          }
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [question_end_time, lastReveal, question, socket, letterMask]);

  // Effect to handle audio autoplay when question changes
  useEffect(() => {
    if (question?.media_url && question?.media_type === 'audio' && audioRef.current) {
      // Use a small delay to ensure the audio element is fully loaded
      const playPromise = setTimeout(() => {
        try {
          // Try to play the audio
          const playAttempt = audioRef.current.play();
          
          // Handle autoplay restrictions
          if (playAttempt !== undefined) {
            playAttempt.catch(error => {
              console.warn('Autoplay prevented:', error);
              // Add a visible play button or notification if autoplay is blocked
            });
          }
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }, 500);
      
      return () => clearTimeout(playPromise);
    }
  }, [question]);

  // Listen for letter reveals
  useEffect(() => {
    socket.on('open_answer_letter_revealed', (data) => {
      setLetterMask(data.mask);
    });

    socket.on('open_answer_submitted', (data) => {
      setCorrectCount(data.correct_count);
      setTotalPlayers(data.player_count);
    });

    return () => {
      socket.off('open_answer_letter_revealed');
      socket.off('open_answer_submitted');
    };
  }, [socket]);

  // Display the masked answer
  const renderMaskedAnswer = () => {
    if (!letterMask) return null;
    
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        my: 4
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
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      justifyContent: 'space-between', 
      p: 2 
    }}>
      {/* Center content grid - updated to match ABCDQuiz layout */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        px: 4
      }}>
        {/* Timer bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {timeRemaining ?? '--'}
          </Typography>
        </Box>

        {/* Question and media content in center column */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              textAlign: 'center',
              lineHeight: 1.3,
              fontWeight: 500,
              mb: 4
            }}
          >
            {question?.question}
          </Typography>

          {/* Media content if present - conditional rendering based on show_image_gradually */}
          {question?.media_url && question?.media_type === 'image' && (
            <Box sx={{ 
              mb: 4, 
              width: '100%', 
              maxWidth: '800px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              {question.show_image_gradually ? (
                <ImageBlockReveal 
                  imageUrl={question.media_url}
                  timeRemaining={timeRemaining}
                  totalTime={question.length || 30}
                  onError={(e) => {
                    console.error("Error loading image:", e);
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/400x300?text=Image+not+available";
                  }}
                />
              ) : (
                <Box sx={{ 
                  overflow: 'hidden',
                  borderRadius: 2,
                  boxShadow: 4,
                  border: '1px solid rgba(0,0,0,0.1)',
                  width: '100%',
                }}>
                  <img 
                    src={question.media_url} 
                    alt="Question Media" 
                    style={{ 
                      width: '100%',
                      maxHeight: '60vh',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      console.error("Error loading image:", e);
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/400x300?text=Image+not+available";
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Audio media if present */}
          {question?.media_url && question?.media_type === 'audio' && (
            <Box sx={{ 
              mt: 2, 
              mb: 4, 
              width: '80%', 
              maxWidth: '500px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <audio
                ref={audioRef}
                controls
                autoPlay
                loop
                style={{ width: '100%' }}
              >
                <source src={question.media_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </Box>
          )}

          {/* Masked Answer Display */}
          {renderMaskedAnswer()}
        </Box>

        {/* Correct answers counter*/}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {correctCount}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt:-1.5 }}>
            odpovědí
          </Typography>
        </Box>
      </Box>

      {/* Instructions */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Piš odpověď na svém telefonu. Postupně se budou odhalovat písmena.
        </Typography>
      </Box>
    </Box>
  );
};

export default OpenAnswerQuiz;
