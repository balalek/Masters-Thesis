import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getSocket } from '../../../utils/socket';
import WordChainWaitingScreen from './WordChainWaitingScreen';

const WordChainQuizMobile = ({ onAnswer, question, playerName }) => {
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [currentLetter, setCurrentLetter] = useState(question?.first_letter || '');
  const [currentPlayer, setCurrentPlayer] = useState(question?.current_player || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [lastAddedWord, setLastAddedWord] = useState(question?.first_word || '');
  const [isEliminated, setIsEliminated] = useState(false); // New state to track elimination
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]); // Track all eliminated players
  const inputRef = useRef(null);
  
  // Initialize from question prop if available
  useEffect(() => {
    if (question?.first_letter) {
      setCurrentLetter(question.first_letter);
      console.log("Initialized current letter from question:", question.first_letter);
    }
    if (question?.current_player) {
      setCurrentPlayer(question.current_player);
    }
    if (question?.first_word) {
      setLastAddedWord(question.first_word);
    }
  }, [question]);
  
  // Keep input focused when it's the player's turn
  useEffect(() => {
    if (isPlayerTurn() && inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback, currentPlayer, playerName]);
  
  // Add a new effect specifically for focusing after errors
  useEffect(() => {
    // If there's an error and it's the player's turn, focus the input field
    if (error && isPlayerTurn() && inputRef.current) {
      // Slight delay to ensure DOM is updated before focusing
      setTimeout(() => {
        inputRef.current.focus();
      }, 50);
    }
  }, [error]);
  
  useEffect(() => {
    const socket = getSocket();
    
    // Listen for word chain updates
    socket.on('word_chain_update', (data) => {
      if (data.current_letter) {
        setCurrentLetter(data.current_letter);
      }
      if (data.current_player) {
        setCurrentPlayer(data.current_player);
      }
      
      // Get the last word from the word chain
      if (data.word_chain && data.word_chain.length > 0) {
        const lastWordObj = data.word_chain[data.word_chain.length - 1];
        setLastAddedWord(lastWordObj.word);
      }
      
      // Check if this player is in the eliminated list
      if (data.eliminated_players) {
        setEliminatedPlayers(data.eliminated_players);
        if (data.eliminated_players.includes(playerName)) {
          setIsEliminated(true);
        }
      }
    });
    
    // Listen for feedback on word submissions
    socket.on('word_chain_feedback', (data) => {
      setIsSubmitting(false);
      
      if (data.success) {
        // Word was accepted
        setWord('');
        setError('');
        setFeedback(data.message || 'Slovo přijato!');
        
        // Clear feedback after 2 seconds
        setTimeout(() => {
          setFeedback('');
        }, 2000);
      } else {
        // Word was rejected
        setError(data.message || 'Neplatné slovo');
        // Re-focus is now handled by the dedicated useEffect above
      }
    });
    
    return () => {
      socket.off('word_chain_update');
      socket.off('word_chain_feedback');
    };
  }, [playerName]);
  
  // Helper function to check if it's this player's turn
  const isPlayerTurn = () => {
    return playerName === currentPlayer && !isEliminated;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!word.trim()) {
      setError('Zadej slovo');
      return;
    }
    
    // Basic client-side validation
    if (currentLetter && !startsWithLetter(word.trim(), currentLetter)) {
      setError(`Slovo musí začínat na písmeno ${currentLetter}`);
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    // Call the parent handler
    onAnswer(word.trim());
  };
  
  const handleKeyDown = (e) => {
    // Submit the form when Enter key is pressed
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Helper function to check if word starts with letter, accounting for diacritics
  const startsWithLetter = (word, letter) => {
    if (!word || !letter) return false;
    
    // Convert to lowercase for comparison
    const wordLower = word.toLowerCase();
    const letterLower = letter.toLowerCase();
    
    // Direct match
    if (wordLower.startsWith(letterLower)) return true;
    
    // Map of Czech characters to their non-diacritic versions
    const diacriticMap = {
      'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 
      'í': 'i', 'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's', 
      'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z'
    };
    
    // Check if word starts with diacritic version of the letter
    for (let diacritic in diacriticMap) {
      if (diacriticMap[diacritic] === letterLower && wordLower.startsWith(diacritic)) {
        return true;
      }
    }
    
    return false;
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
          Došel ti čas. Jsi vyřazen ze hry.
        </Typography>
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            borderRadius: 2,
            width: '90%',
            maxWidth: '500px'
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aktuální hráč:
          </Typography>
          <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
            {currentPlayer}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            Aktuální písmeno:
          </Typography>
          <Typography variant="h3" color="primary" fontWeight="bold">
            {currentLetter}
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  // If it's not the player's turn, show the waiting screen
  if (!isPlayerTurn()) {
    return (
      <WordChainWaitingScreen 
        currentLetter={currentLetter}
        currentPlayer={currentPlayer}
        lastWord={lastAddedWord}
        eliminatedPlayers={eliminatedPlayers}
      />
    );
  }
  
  // Otherwise, show the input form for the active player
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
      {/* Top instruction area with current letter */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <Typography variant="h6" component="div">
          Zadej slovo na:
        </Typography>
        <Typography 
          variant="h2" 
          component="div"
          sx={{ 
            fontWeight: 'bold',
            letterSpacing: 2
          }}
        >
          {currentLetter || '?'}
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
            justifyContent: 'space-between'
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            label="Tvoje slovo"
            variant="outlined"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            error={!!error}
            disabled={isSubmitting}
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
                padding: '14px'
              }
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || !word.trim()}
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
        </Paper>
      </Box>
      
      {/* Empty space below form */}
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};

export default WordChainQuizMobile;
