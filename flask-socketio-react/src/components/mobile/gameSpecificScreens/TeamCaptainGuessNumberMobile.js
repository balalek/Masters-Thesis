import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, TextField, Button, Typography, Paper, List, 
  ListItem, ListItemText, Divider, Radio, RadioGroup,
  FormControlLabel, FormControl, Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getSocket } from '../../../utils/socket';

const TeamCaptainGuessNumberMobile = ({ onAnswer, teamName }) => {
  const [customAnswer, setCustomAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('custom');
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const [teamGuesses, setTeamGuesses] = useState([]);
  const [averageGuess, setAverageGuess] = useState(null);
  const inputRef = useRef(null);
  const socket = getSocket();

  // Listen for team member guesses
  useEffect(() => {
    socket.on('team_guesses_update', (data) => {
      if (data.teamName === teamName) {
        setTeamGuesses(data.guesses);
        
        // Calculate average
        if (data.guesses.length > 0) {
          const sum = data.guesses.reduce((acc, guess) => acc + guess.value, 0);
          setAverageGuess(Math.round((sum / data.guesses.length) * 100) / 100);
        }
      }
    });

    socket.on('guess_feedback', (data) => {
      setFeedback(data.message);
      setFeedbackSeverity(data.severity || 'warning');
      
      setTimeout(() => {
        setFeedback('');
      }, 3000);
    });

    return () => {
      socket.off('team_guesses_update');
      socket.off('guess_feedback');
    };
  }, [socket, teamName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalAnswer;
    
    if (selectedOption === 'custom') {
      const numValue = Number(customAnswer.replace(',', '.'));
      if (isNaN(numValue) || customAnswer.trim() === '') {
        setFeedback('Zadej platné číslo');
        setFeedbackSeverity('error');
        return;
      }
      finalAnswer = numValue;
    } else if (selectedOption === 'average' && averageGuess !== null) {
      finalAnswer = averageGuess;
    } else if (selectedOption.startsWith('player_')) {
      const playerIndex = parseInt(selectedOption.split('_')[1]);
      finalAnswer = teamGuesses[playerIndex].value;
    } else {
      setFeedback('Vyber některou z možností nebo zadej vlastní tip');
      setFeedbackSeverity('error');
      return;
    }
    
    // Call the onAnswer callback with the final choice
    onAnswer(finalAnswer);
    
    // Reset the form
    setCustomAnswer('');
    setSelectedOption('custom');
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
      {/* Top title area */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center'
      }}>
        <Box sx={{ fontSize: '1.25rem', fontWeight: 'medium' }}>
          Kapitáne, tvá odpověď je rozhodující pro tým
        </Box>
      </Box>
      
      {/* Feedback message area */}
      <Box sx={{ minHeight: '60px' }}>
        {feedback && (
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
        )}
      </Box>
      
      {/* Main content area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Paper elevation={3} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {/* Custom answer option */}
              <FormControlLabel 
                value="custom" 
                control={<Radio />} 
                label="Vlastní tip" 
              />
              
              {selectedOption === 'custom' && (
                <TextField
                  fullWidth
                  label="Tvůj tip"
                  variant="outlined"
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  type="number"
                  slotProps={{ 
                    input: {
                      inputMode: 'decimal',
                      pattern: '[0-9]*(\.[0-9]+)?'
                    }
                  }}
                  sx={{ 
                    mb: 2,
                    ml: 4,
                    width: 'calc(100% - 2rem)'
                  }}
                />
              )}
              
              {/* Average option */}
              {averageGuess !== null && (
                <FormControlLabel 
                  value="average" 
                  control={<Radio />} 
                  label={`Průměr: ${averageGuess}`} 
                />
              )}
              
              {/* Divider before team guesses */}
              {teamGuesses.length > 0 && (
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tipy členů týmu
                  </Typography>
                </Divider>
              )}
              
              {/* Team member guesses */}
              {teamGuesses.map((guess, index) => (
                <FormControlLabel 
                  key={index}
                  value={`player_${index}`} 
                  control={<Radio />} 
                  label={`${guess.playerName}: ${guess.value}`} 
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Paper>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          endIcon={<SendIcon />}
          sx={{ 
            height: '60px',
            fontSize: '1.2rem'
          }}
        >
          Potvrdit finální odpověď
        </Button>
      </Box>
    </Box>
  );
};

export default TeamCaptainGuessNumberMobile;
