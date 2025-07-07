/**
 * @fileoverview Correct Answer success screen for mobile players
 * 
 * This component provides:
 * - Visual feedback for correct answers
 * - Special highlight for exact/perfect answers
 * - Points display with both earned and total points
 * - Customizable title and message text
 * @author Bc. Martin Baláž
 * @module Components/Mobile/ScreensBetweenRounds/CorrectAnswer
 */
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';

/**
 * Correct Answer component for displaying success feedback
 * 
 * Shows a celebratory screen when a player has answered correctly,
 * with special visual indicators for exact/perfect guesses and
 * detailed point information.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.points_earned - Points earned for this answer
 * @param {number} props.total_points - Player's total score after this answer
 * @param {boolean} props.exactGuess - Whether this was an exact or perfect answer
 * @param {string} props.customTitle - Optional custom title text
 * @param {string} props.customMessage - Optional custom message text
 * @returns {JSX.Element} The rendered success screen
 */
const CorrectAnswer = ({ points_earned, total_points, exactGuess, customTitle, customMessage }) => {
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
      {exactGuess ? (
        <StarIcon sx={{ fontSize: '120px', color: 'gold', mb: 2 }} />
      ) : (
        <CheckCircleIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />
      )}
      
      <Typography 
        variant="h1" 
        sx={{ 
          color: 'white', 
          fontSize: '3em',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 1
        }}
      >
        {customTitle || (exactGuess ? 'Přesně!' : 'Správně!')}
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
              GRATULACE!
              <br />
              Získáváte dvojnásobný počet bodů!
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

export default CorrectAnswer;