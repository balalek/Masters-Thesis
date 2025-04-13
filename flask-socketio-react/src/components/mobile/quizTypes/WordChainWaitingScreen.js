import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';

const WordChainWaitingScreen = ({ currentLetter, currentPlayer, lastWord }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      p: 2 
    }}>
      {/* Header with current letter */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: 2,
        mb: 3
      }}>
        <Typography variant="h6" component="div">
          Aktuální písmeno:
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
      
      {/* Waiting message */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography variant="h5" color="text.secondary">
          Čekej na svůj tah
        </Typography>
        
        <Typography variant="h6" color="primary" fontWeight="bold">
          Na tahu je: {currentPlayer}
        </Typography>
        
        {lastWord && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Poslední slovo:
            </Typography>
            <Chip 
              label={lastWord} 
              color="success" 
              sx={{ 
                fontSize: '1.2rem', 
                py: 2.5,
                px: 1
              }} 
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default WordChainWaitingScreen;
