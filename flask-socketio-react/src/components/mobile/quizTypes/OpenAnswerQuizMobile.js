import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Alert, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getSocket } from '../../../utils/socket';

const OpenAnswerQuizMobile = ({ onAnswer }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const inputRef = useRef(null);
  const socket = getSocket();

  // Keep input focused
  useEffect(() => {
    // Focus the input field initially and after any feedback
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback]);

  useEffect(() => {
    // Listen for feedback on incorrect answers
    socket.on('open_answer_feedback', (data) => {
      setFeedback(data.message);
      setFeedbackSeverity('warning');
      
      // Clear feedback after a timeout
      setTimeout(() => {
        setFeedback('');
        // Re-focus the input field
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 3000);
    });

    return () => {
      socket.off('open_answer_feedback');
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
          Napiš správnou odpověď
        </Box>
      </Box>
      
      {/* Feedback message area - always present but conditionally visible */}
      <Box sx={{ 
        minHeight: '60px', // Reserve space for feedback
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
          <Box sx={{ height: '60px' }} /> // Empty space placeholder when no feedback
        )}
      </Box>
      
      {/* Use approx 40% of the screen height - positioned at top */}
      <Box sx={{ 
        height: '40vh', // Reduced from 50vh to 40vh
        p: 2,
        pt: 1, // Reduced top padding
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
            label="Tvoje odpověď"
            variant="outlined"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            multiline={false} // Explicitly set to false
            sx={{ 
              flex: 3,
              mb: 2,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.3rem',
                height: '100%'
              },
              '& .MuiInputBase-input': {
                height: '100% !important',
                overflow: 'auto', // Allow scrolling if text is long
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

export default OpenAnswerQuizMobile;
