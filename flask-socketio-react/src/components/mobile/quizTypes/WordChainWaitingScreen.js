import React from 'react';
import { Box, Typography, Paper, Chip, List, ListItem, ListItemText } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

const WordChainWaitingScreen = ({ currentLetter, currentPlayer, lastWord, eliminatedPlayers = [] }) => {
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
      
      {/* Eliminated players section - only show if there are eliminated players */}
      {eliminatedPlayers && eliminatedPlayers.length > 0 && (
        <Paper 
          elevation={2}
          sx={{ 
            p: 2,
            mt: 2,
            bgcolor: 'error.light'
          }}
        >
          <Typography variant="h6" color="error.dark" gutterBottom>
            Vyřazení hráči:
          </Typography>
          <List dense>
            {eliminatedPlayers.map(player => (
              <ListItem key={player}>
                <CancelIcon color="error" sx={{ mr: 1 }} />
                <ListItemText 
                  primary={player} 
                  slotProps={{
                    primary: { sx: { fontWeight: 'medium' } }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default WordChainWaitingScreen;
