/**
 * @fileoverview Too Late Answer screen for mobile players
 * 
 * This component provides:
 * - Visual feedback when player answers after time has expired
 * - Score display showing zero or minimal points earned
 * - Total score tracking despite time expiration
 * - Consistent styling with other result screens
 * @author Bc. Martin Baláž
 * @module Components/Mobile/ScreensBetweenRounds/TooLateAnswer
 */
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TimerOffIcon from '@mui/icons-material/TimerOff';

/**
 * Too Late Answer component for displaying timeout feedback
 * 
 * Shows a screen indicating that the player answered too late,
 * displaying their current score and any consolation points awarded.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.total_points - Player's total score after this answer
 * @param {number} props.points_earned - Points earned (usually 0) for late answer
 * @returns {JSX.Element} The rendered too late screen
 */
const TooLateAnswer = ({ total_points, points_earned = 0 }) => {
  return (
    <Box
      sx={{
        backgroundColor: '#EF4444', // red
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3
      }}
    >
      <TimerOffIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />
      
      <Typography 
        variant="h1" 
        sx={{ 
          color: 'white', 
          fontSize: '3em',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 3
        }}
      >
        Pozdě!
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

export default TooLateAnswer;