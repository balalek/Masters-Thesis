import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const CorrectAnswer = ({ points_earned, total_points }) => {
  return (
    <Box
      sx={{
        backgroundColor: '#14A64A',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3
      }}
    >
      <CheckCircleIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />
      
      <Typography 
        variant="h1" 
        sx={{ 
          color: 'white', 
          fontSize: '3em',  // Reduced from 4.5em
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 3
        }}
      >
        Správně!
      </Typography>

      <Typography 
        sx={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '2.5em',
          fontFamily: 'monospace',
          fontWeight: 'light'
        }}
      >
        +{points_earned} bodů
      </Typography>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography 
          sx={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '1.2em',
            mb: 1
          }}
        >
          Celkové skóre
        </Typography>
        <Typography 
          sx={{ 
            color: 'white', 
            fontSize: '3.5em',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
        >
          {total_points}
        </Typography>
      </Box>
    </Box>
  );
};

export default CorrectAnswer;