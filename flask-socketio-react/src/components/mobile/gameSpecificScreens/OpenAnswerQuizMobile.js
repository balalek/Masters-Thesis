/**
 * @fileoverview Open Answer Quiz Mobile component for text-based answer submission
 * 
 * This module provides:
 * - Interface for users to submit free-text answers to open questions
 * - Real-time feedback on answer validity via Socket.IO
 * - Auto-focusing input field for rapid answer entry
 * - Visual feedback for incorrect or invalid submissions
 * 
 * @module Components/Mobile/GameSpecificScreens/OpenAnswerQuizMobile
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Alert, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getSocket } from '../../../utils/socket';

/**
 * Open Answer Quiz Mobile component for text-based answer submission
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onAnswer - Callback function to submit player's answer
 * @returns {JSX.Element} The rendered open answer quiz component
 */
const OpenAnswerQuizMobile = ({ onAnswer }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const inputRef = useRef(null);
  const socket = getSocket();

  // Focus the input field initially and after any feedback
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback]);

  // Listen for feedback on incorrect answers
  useEffect(() => {
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

  /**
   * Handle form submission of player's text answer
   * 
   * Validates non-empty input and passes answer to parent component
   * 
   * @function
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    // Submit the answer and clear the input field
    onAnswer(answer);
    setAnswer('');
  };

  /**
   * Handle keyboard input in the answer field
   * 
   * Enables Enter key submission for faster gameplay
   * 
   * @function
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = (e) => {
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
      
      {/* Use 40% of the screen height to keep keyboard visible - positioned at top */}
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
            label="Tvoje odpověď"
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

export default OpenAnswerQuizMobile;