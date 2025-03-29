import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const TeamWaitingScreen = ({ message, phase, teamName }) => {
  
  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Typography variant="h4" gutterBottom>
        {message || (phase === 1 
          ? "Čekej, až bude tvůj tým na řadě" 
          : "Čekej, nyní hraje druhý tým")}
      </Typography>
      
      <CircularProgress 
        size={60} 
        thickness={4} 
        sx={{ 
          color: 'white', 
          mt: 4
        }} 
      />
    </Box>
  );
};

export default TeamWaitingScreen;
