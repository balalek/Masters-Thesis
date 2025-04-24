import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Alert, Paper, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getSocket } from '../../../utils/socket';

const BlindMapQuizMobile = ({ onAnswer, phase = 1 }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const inputRef = useRef(null);
  const socket = getSocket();

  // Keep input focused
  useEffect(() => {
    // Focus the input field initially and after any feedback
    if (inputRef.current && !isCorrect) {
      inputRef.current.focus();
    }
  }, [feedback, isCorrect]);

  useEffect(() => {
    // Listen for feedback on answers
    socket.on('blind_map_feedback', (data) => {
      setFeedback(data.message);
      setFeedbackSeverity(data.severity);
      
      if (data.isCorrect) {
        setIsCorrect(true);
        setCorrectAnswer(data.correctAnswer || '');
      }
      
      // Clear feedback after a timeout if not correct
      if (!data.isCorrect) {
        setTimeout(() => {
          setFeedback('');
          // Re-focus the input field
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 3000);
      }
    });

    return () => {
      socket.off('blind_map_feedback');
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    // Submit the answer and clear the input field
    onAnswer(answer);
    setAnswer('');
  };

  const handleKeyDown = (e) => {
    // Submit the form when Enter key is pressed
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // If player already got the correct answer, show success screen
  if (isCorrect) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#14A64A' // Using the same green as CorrectAnswer
      }}>
        <CheckCircleIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />
        <Typography 
          variant="h1" 
          sx={{ 
            color: 'white', 
            fontSize: '3em',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mb: 3
          }}
        >
          Správně!
        </Typography>
        
        <Typography 
          variant="h5" 
          sx={{ 
            color: 'white', 
            textAlign: 'center',
            mb: 3,
            px: 3,
            maxWidth: '80%'
          }}
        >
          {phase === 1 
            ? "Čekej až ostatní hráči dokončí první fázi" 
            : "Čekej na další otázku..."}
        </Typography>
        
        {/* Simple loading indicator with white dots */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          {[0, 1, 2].map((dot) => (
            <Box
              key={dot}
              sx={{
                width: '12px',
                height: '12px',
                backgroundColor: 'white',
                borderRadius: '50%',
                opacity: 0.8,
                animation: 'pulse 1.5s infinite ease-in-out',
                animationDelay: `${dot * 0.3}s`,
                '@keyframes pulse': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 0.6 },
                  '50%': { transform: 'scale(1.3)', opacity: 1 }
                }
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit}
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        width: '100%',
        p: 0
      }}
    >
      {/* Top instruction area */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center'
      }}>
        <Box sx={{ fontSize: '1.25rem', fontWeight: 'medium' }}>
          Rozlušti přesmyčku
        </Box>
      </Box>
      
      {/* Feedback message area */}
      <Box sx={{ 
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {feedback ? (
          <Alert 
            severity={feedbackSeverity} 
            sx={{ 
              width: '100%',
              borderRadius: 0,
              fontSize: '1.1rem',
              py: 1.5
            }}
          >
            {feedback}
          </Alert>
        ) : (
          <Box sx={{ height: '60px' }} />
        )}
      </Box>
      
      {/* Input area - positioned at top */}
      <Box sx={{ 
        height: '40vh',
        p: 2,
        pt: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between'
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            label="Název města"
            variant="outlined"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            multiline={false}
            sx={{ 
              flex: 3,
              mb: 2,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.3rem',
                height: '100%'
              },
              '& .MuiInputBase-input': {
                height: '100% !important',
                overflow: 'auto',
                alignItems: 'flex-start',
                padding: '14px'
              }
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!answer.trim()}
            fullWidth
            size="large"
            endIcon={<SendIcon />}
            sx={{ 
              height: '60px',
              fontSize: '1.2rem',
              flex: 1
            }}
          >
            Odeslat
          </Button>
        </Paper>
      </Box>
      
      {/* Empty space below form */}
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};

export default BlindMapQuizMobile;
