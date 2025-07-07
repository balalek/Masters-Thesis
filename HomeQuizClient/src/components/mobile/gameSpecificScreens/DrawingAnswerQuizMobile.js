/**
 * @fileoverview Drawing Answer Quiz Mobile component for guessing drawings
 * 
 * This component provides:
 * - Text input interface for submitting drawing guesses
 * - Real-time feedback for incorrect guesses
 * - Auto-focus functionality for improved user experience
 * - Customizable placeholder text and button labels
 * - Form submission via button or enter key
 * @author Bc. Martin Baláž
 * @module Components/Mobile/GameSpecificScreens/DrawingAnswerQuizMobile
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Alert, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getSocket } from '../../../utils/socket';

/**
 * Drawing Answer Quiz Mobile component for guessing what's being drawn
 * 
 * Renders a form for players to submit their guesses during a drawing round,
 * with feedback for incorrect answers and customizable UI text.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onAnswer - Callback when answer is submitted
 * @param {string} props.placeholder - Placeholder text for input field
 * @param {string} props.buttonText - Label for submit button
 * @param {string} props.title - Title displayed at the top of the screen
 * @returns {JSX.Element} The rendered drawing answer component
 */
const DrawingAnswerQuizMobile = ({ onAnswer, placeholder = "Co je na obrázku?", buttonText = "Odeslat odpověď", title = "Uhádni co je na obrázku" }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const inputRef = useRef(null);
  const socket = getSocket();

  /**
   * Keeps the input field focused for better user experience
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback]);

  /**
   * Sets up listener for feedback on incorrect answers
   */
  useEffect(() => {
    
    socket.on('drawing_answer_feedback', (data) => {
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
      socket.off('drawing_answer_feedback');
    };
  }, [socket]);

  /**
   * Handles form submission
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    // Submit the answer and clear the input field
    onAnswer(answer);
    setAnswer('');
  };

  /**
   * Handles keyboard input for form submission on Enter key
   * 
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
          {title}
        </Box>
      </Box>
      
      {/* Feedback message area - always present but conditionally visible */}
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
          <Box sx={{ height: '60px' }} /> // Empty space placeholder when no feedback - so it doesn't jump
        )}
      </Box>
      
      {/* Use approx 40% of the screen height - positioned at top */}
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
            label={placeholder}
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
            {buttonText}
          </Button>
        </Paper>
      </Box>
      
      {/* Empty space below form */}
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};

export default DrawingAnswerQuizMobile;