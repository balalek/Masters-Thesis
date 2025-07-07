/**
 * @fileoverview Guess A Number Quiz Mobile component for numeric guessing
 * 
 * This component provides:
 * - Text input for submitting numeric guesses
 * - Input validation to ensure only valid numbers are submitted
 * - Real-time feedback on guess accuracy via Socket.IO
 * - Automatic input focus for improved user experience
 * - Numeric keyboard input mode for mobile devices
 * @author Bc. Martin Baláž
 * @module Components/Mobile/GameSpecificScreens/GuessANumberQuizMobile
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Alert, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getSocket } from '../../../utils/socket';

/**
 * Guess A Number Quiz Mobile component for submitting numeric guesses
 * 
 * Renders a form for players to submit numeric guesses during a 
 * Guess A Number question, with feedback and validation.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onAnswer - Callback for submitting answers
 * @returns {JSX.Element} The rendered guess number input component
 */
const GuessANumberQuizMobile = ({ onAnswer }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const inputRef = useRef(null);
  const socket = getSocket();

  /**
   * Maintains focus on the input field
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback]);

  /**
   * Sets up Socket.IO event listeners for guess feedback
   */
  useEffect(() => {
    socket.on('guess_feedback', (data) => {
      setFeedback(data.message);
      setFeedbackSeverity(data.severity || 'warning');
      
      setTimeout(() => {
        setFeedback('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 3000);
    });

    return () => {
      socket.off('guess_feedback');
    };
  }, [socket]);

  /**
   * Handles form submission with numeric validation
   * 
   * @function handleSubmit
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    // Validate numeric input
    const numValue = Number(answer.replace(',', '.'));
    if (isNaN(numValue)) {
      setFeedback('Zadej platné číslo');
      setFeedbackSeverity('error');
      return;
    }
    
    // Submit the answer and clear the input field
    onAnswer(numValue);
    setAnswer('');
  };

  /**
   * Handles Enter key press for form submission
   * 
   * @function handleKeyDown
   * @param {React.KeyboardEvent} e - Keyboard event
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
          Zadej svůj tip
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
      
      {/* Form area */}
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
            label="Tvůj tip"
            variant="outlined"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            type="number"
            slotProps={{ 
              input: { 
                inputMode: 'decimal',
                pattern: '[0-9]*(\.[0-9]+)?'
              } 
            }}
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

export default GuessANumberQuizMobile;