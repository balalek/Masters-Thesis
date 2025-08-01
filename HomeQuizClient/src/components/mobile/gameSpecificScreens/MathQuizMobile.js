/**
 * @fileoverview Math Quiz Mobile component for solving equations
 * 
 * This component provides:
 * - Input field for submitting numeric answers to math equations
 * - Real-time validation and feedback via Socket.IO
 * - Visual states for correct answers, errors, and player elimination
 * - Team synchronization during multiplayer matches
 * - Automatic input focus for improved usability
 * @author Bc. Martin Baláž
 * @module Components/Mobile/GameSpecificScreens/MathQuizMobile
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getSocket } from '../../../utils/socket';

/**
 * Math Quiz Mobile component for solving equation sequences
 * 
 * Handles user input for math equation answers, with special behaviors
 * for team play and player elimination in the "survival" style math quiz.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onAnswer - Callback when answer is submitted
 * @param {string} props.playerName - Current player's name
 * @returns {JSX.Element} The rendered math quiz interface
 */
const MathQuizMobile = ({ onAnswer, playerName }) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isEliminated, setIsEliminated] = useState(false);
  const [eliminationMessage, setEliminationMessage] = useState('');
  const [hasCorrectAnswer, setHasCorrectAnswer] = useState(false);
  const inputRef = useRef(null);
  
  /**
   * Keep input field focused for better user experience
   */
  useEffect(() => {
    if (inputRef.current && !isEliminated) {
      inputRef.current.focus();
    }
  }, [feedback, isEliminated]);
  
  /**
   * Focus input field after errors occur
   */
  useEffect(() => {
    // If there's an error, focus the input field
    if (error && inputRef.current && !isEliminated) {
      // Slight delay to ensure DOM is updated before focusing
      setTimeout(() => {
        inputRef.current.focus();
      }, 50);
    }
  }, [error, isEliminated]);
  
  /**
   * Set up Socket.IO event listeners for math quiz gameplay
   * 
   * Handles:
   * - Feedback on submitted answers
   * - Sequence changes
   * - Player status updates for team mode
   * - Elimination tracking
   */
  useEffect(() => {
    const socket = getSocket();
    
    socket.on('math_feedback', (data) => {
      setIsSubmitting(false);
      
      if (data.correct) {
        // Answer was correct
        setAnswer('');
        setError('');
        setFeedback(data.message || 'Správná odpověď!');
        setHasCorrectAnswer(true);
        
        // Don't clear feedback for correct answers - keep the points message visible
        // (removed the timeout that was clearing feedback)
      } else {
        // Answer was incorrect - check for elimination
        if (data.message.includes('vyřazen')) {
          setIsEliminated(true);
          setEliminationMessage(data.message); // Set elimination message from server
        } else {
          setError(data.message || 'Nesprávná odpověď');
        }
      }
    });
    
    socket.on('math_sequence_change', () => {
      setAnswer('');
      setFeedback('');
      setError('');
      setHasCorrectAnswer(false); // Reset flag for new sequence
      
      // Focus on the input field for the new equation
      if (inputRef.current && !isEliminated) {
        inputRef.current.focus();
      }
    });
    
    socket.on('math_quiz_update', (data) => {
      
      // Get current sequence index
      const currentIdx = data.current_sequence;
      
      // Check if this player should be marked as having answered based on player statuses
      if (data.player_statuses && data.player_statuses[playerName]) {
        const myStatus = data.player_statuses[playerName];
        
        // Update eliminated status if needed
        if (myStatus.isEliminated) {
          setIsEliminated(true);
        }
        
        // Update hasCorrectAnswer status if the player is marked as having answered
        if (myStatus.hasAnswered && !isEliminated) {
          // Mark as having answered regardless of team mode
          setHasCorrectAnswer(true);
          
          // Only show team-related feedback when in team mode
          if (data.is_team_mode) {
            // Check if this player has personally answered the CURRENT sequence
            const hasPersonallyAnsweredCurrent = 
              data.player_answers && 
              data.player_answers[currentIdx] && 
              data.player_answers[currentIdx].some(a => a.player === playerName);
            
            // Only show the "team already answered" message to players who didn't 
            // personally answer the current sequence
            if (!hasPersonallyAnsweredCurrent) {
              setFeedback('Tvůj tým již odpověděl správně!');
            }
          }
        }
      }
    });
    
    return () => {
      socket.off('math_feedback');
      socket.off('math_sequence_change');
      socket.off('math_quiz_update');
    };
  }, [playerName, isEliminated]);
  
  /**
   * Handle form submission of math answers
   * 
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!answer.trim()) {
      setError('Zadejte odpověď');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    // Call the parent handler
    onAnswer(answer.trim());
  };
  
  /**
   * Handle keyboard Enter key for form submission
   * 
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /**
   * Filter input to only allow valid numeric characters
   * 
   * @param {React.ChangeEvent} e - Input change event
   */
  const handleAnswerChange = (e) => {
    const value = e.target.value;
    // Only allow digits, commas, periods, and minus sign
    const filteredValue = value.replace(/[^0-9,.,-]/g, '');
    setAnswer(filteredValue);
  };
  
  // If player is eliminated, show elimination screen
  if (isEliminated) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100vh',
          width: '100%',
          p: 2,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          bgcolor: 'error.main'
        }}
      >
        <Typography variant="h3" color="white" gutterBottom fontWeight="bold">
          VYŘAZEN!
        </Typography>
        <Typography variant="h5" color="white" sx={{ mb: 4 }}>
          {eliminationMessage || 'Odpověděl jste špatně a byl jste vyřazen z matematického kvízu.'}
        </Typography>
      </Box>
    );
  }
  
  // Always show the input form for math quiz
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
        bgcolor: hasCorrectAnswer ? 'success.main' : 'primary.main', 
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <Typography variant="h5" component="div">
          {hasCorrectAnswer ? 'Čekej na další příklad' : 'Zadejte výsledek rovnice:'}
        </Typography>
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
            severity="success" 
            sx={{ 
              width: '100%',
              borderRadius: 0,
              fontSize: '1.1rem',
              py: 1.5
            }}
          >
            {feedback}
          </Alert>
        ) : error ? (
          <Alert 
            severity="error" 
            sx={{ 
              width: '100%',
              borderRadius: 0,
              fontSize: '1.1rem',
              py: 1.5
            }}
          >
            {error}
          </Alert>
        ) : (
          <Box sx={{ height: '60px' }} /> // Empty space placeholder when no feedback
        )}
      </Box>
      
      {/* Input area - positioned to avoid keyboard */}
      <Box sx={{ 
        height: '30vh',
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
            justifyContent: 'space-between',
            backgroundColor: hasCorrectAnswer ? 'rgba(76, 175, 80, 0.08)' : 'background.paper'
          }}
        >
          {hasCorrectAnswer ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" color="success.main" align="center">
                Správná odpověď!
              </Typography>
            </Box>
          ) : (
            <>
              <TextField
                inputRef={inputRef}
                fullWidth
                label="Vaše odpověď"
                variant="outlined"
                value={answer}
                onChange={handleAnswerChange}
                onKeyDown={handleKeyDown}
                type="number"
                autoFocus
                autoComplete="off"
                error={!!error}
                disabled={isSubmitting || hasCorrectAnswer}
                slotProps={{ 
                  input: {
                    inputMode: 'decimal',
                    pattern: '[0-9,.,-]*',
                  }
                }}
                sx={{ 
                  flex: 3,
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.5rem',
                    height: '100%'
                  },
                  '& .MuiInputBase-input': {
                    height: '100% !important',
                    overflow: 'auto',
                    alignItems: 'flex-start',
                    padding: '14px',
                    textAlign: 'center'
                  }
                }}
              />
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || !answer.trim() || hasCorrectAnswer}
                fullWidth
                size="large"
                endIcon={isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                sx={{ 
                  height: '60px',
                  fontSize: '1.2rem',
                  flex: 1
                }}
              >
                {isSubmitting ? 'Odesílání...' : 'Odeslat'}
              </Button>
            </>
          )}
        </Paper>
      </Box>
      
      {/* Empty space below form */}
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};

export default MathQuizMobile;