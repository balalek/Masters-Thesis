import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import StarIcon from '@mui/icons-material/Star';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

const GuessANumberPlacement = ({ points_earned, total_points, placement, totalPlayers, accuracy, yourGuess, correctAnswer }) => {
  // Determine display color based on placement
  const getColor = () => {
    if (placement === 1) return '#FFD700'; // Gold for 1st place
    if (placement === 2) return '#C0C0C0'; // Silver for 2nd place
    if (placement === 3) return '#CD7F32'; // Bronze for 3rd place
    return '#3B82F6'; // Blue for others
  };
  
  // Get icon based on placement
  const getIcon = () => {
    if (placement === 1) return <StarIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />;
    if (placement <= 3) return <MilitaryTechIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />;
    return <PriorityHighIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />;
  };
  
  // Get placement message
  const getMessage = () => {
    if (placement === 1) return 'Nejbližší odpověď!';
    if (placement === 2) return 'Druhá nejbližší!';
    if (placement === 3) return 'Třetí nejbližší!';
    
    // For others, show simple placement info
    return `${placement}. nejbližší z ${totalPlayers}`;
  };

  return (
    <Box
      sx={{
        backgroundColor: getColor(),
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        p: 3
      }}
    >
      {getIcon()}
      
      <Typography 
        variant="h3" 
        sx={{ 
          color: 'white', 
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 1
        }}
      >
        {getMessage()}
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        mb: 3,
        mt: 1
      }}>
        <Typography 
          sx={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontSize: '1.1rem',
            fontWeight: 'light'
          }}
        >
          Tvůj tip: {yourGuess}
        </Typography>
        <Typography 
          sx={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontSize: '1.1rem',
            fontWeight: 'light'
          }}
        >
          Správná odpověď: {correctAnswer}
        </Typography>
        <Typography 
          sx={{ 
            color: 'white', 
            fontSize: '1.2rem',
            fontWeight: 'medium',
            mt: 1
          }}
        >
          Přesnost: {accuracy}
        </Typography>
      </Box>

      <Typography 
        sx={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '2.5rem',
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
            fontSize: '3.5rem',
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

export default GuessANumberPlacement;
