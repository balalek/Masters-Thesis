/**
 * @fileoverview Incorrect Answer screen for mobile players
 * 
 * This component provides:
 * - Visual feedback for incorrect answers
 * - Points display even when incorrect (partial points)
 * - Special messaging for team games or specific situations
 * - Customizable title and message for different game contexts
 * @author Bc. Martin Baláž
 * @module Components/Mobile/ScreensBetweenRounds/IncorrectAnswer
 */
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * Incorrect Answer component for displaying failure feedback
 * 
 * Shows a screen when player answers incorrectly, with styling
 * and messaging that can be customized based on game context.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.points_earned - Points earned despite incorrect answer
 * @param {number} props.total_points - Player's total score after this answer
 * @param {boolean} props.exactGuess - Whether opposing team got an exact guess for guess a number type
 * @param {string} props.customTitle - Optional custom title text
 * @param {string} props.customMessage - Optional custom message text
 * @returns {JSX.Element} The rendered incorrect answer screen
 */
const IncorrectAnswer = ({ points_earned, total_points, exactGuess, customTitle, customMessage }) => {
  return (
    <Box
      sx={{
        backgroundColor: '#EF4444',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3
      }}
    >
      <CancelIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />
      
      <Typography 
        variant="h1" 
        sx={{ 
          color: 'white', 
          fontSize: '3em',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: exactGuess || customMessage ? 1 : 3
        }}
      >
        {customTitle || (exactGuess ? 'Nevadí!' : 'Špatně!')}
      </Typography>
      
      {(exactGuess || customMessage) && (
        <Typography 
          variant="h5" 
          sx={{ 
            color: 'white', 
            textAlign: 'center',
            mb: 2,
            px: 2
          }}
        >
          {customMessage || (
            <>
              Druhý tým uhádl přesnou odpověď!
              <br />
              Příště to určitě bude lepší.
            </>
          )}
        </Typography>
      )}

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

export default IncorrectAnswer;