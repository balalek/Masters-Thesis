/**
 * @fileoverview Guess A Number Placement screen for mobile players
 * 
 * This component provides:
 * - Visual feedback about guess accuracy with different icons and colors
 * - Score display with points earned and running total
 * - Comparison between player's guess and correct answer
 * - Special celebration display for exact guesses
 * 
 * @module Components/Mobile/ScreensBetweenRounds/GuessANumberPlacement
 */
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import StarIcon from '@mui/icons-material/Star';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

/**
 * Guess A Number Placement component for showing guess accuracy results
 * 
 * Displays a screen with feedback about the player's numerical guess,
 * showing different visuals based on how close they were to the correct answer.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.points_earned - Points earned for this guess
 * @param {number} props.total_points - Player's total score after this guess
 * @param {string} props.accuracy - Textual description of guess accuracy
 * @param {number} props.yourGuess - The player's guess value
 * @param {number} props.correctAnswer - The correct answer value
 * @returns {JSX.Element} The rendered guess accuracy screen
 */
const GuessANumberPlacement = ({ points_earned, total_points, accuracy, yourGuess, correctAnswer }) => {
  // Simple check for exact match based on accuracy text
  const isExactMatch = accuracy === "Přesně!";
  
  // Determine display color based on exactness
  const getColor = () => {
    if (isExactMatch) return '#14A64A'; // Green for exact guess
    return '#3B82F6'; // Blue for others
  };
  
  // Get icon based on accuracy text
  const getIcon = () => {
    if (isExactMatch) {
      return <StarIcon sx={{ fontSize: '120px', color: 'gold', mb: 2 }} />;
    }
    
    if (accuracy === "Velmi přesné!" || accuracy === "Velmi blízko!") {
      return <MilitaryTechIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />;
    }
    
    return <PriorityHighIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />;
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
        gap: 3,
        p: 3
      }}
    >
      {getIcon()}
      
      {isExactMatch ? (
        <>
          <Typography 
            variant="h1" 
            sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 1,
              fontSize: '3em',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Přesně!
          </Typography>
          
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'white', 
              textAlign: 'center',
              mb: 2,
              px: 2
            }}
          >
            GRATULACE!
            <br />
            Získáváte bonusové body!
          </Typography>
        </>
      ) : (
        <>
          <Typography 
            variant="h1" 
            sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 1,
              fontSize: '2.8em'
            }}
          >
            Přesnost: {accuracy}
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            mb: 2
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
          </Box>
        </>
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

export default GuessANumberPlacement;