/**
 * @fileoverview Math Quiz Elimination Screen for mobile players
 * 
 * This component provides:
 * - Feedback display when a player is eliminated from the Math Quiz
 * - Different messaging for team mode vs individual play
 * - Sequence counter showing which equation caused elimination
 * - Points display with running total
 * 
 * @module Components/Mobile/ScreensBetweenRounds/MathQuizEliminatedAnswer
 */
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * Math Quiz Eliminated Answer component
 * 
 * Displays a failure screen when a player is eliminated from 
 * the Math Quiz game after answering incorrectly.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.points_earned - Points earned before elimination
 * @param {number} props.total_points - Player's/team's total score
 * @param {number} props.currentSequence - The sequence number when eliminated
 * @param {number} props.totalSequences - Total number of sequences in the quiz
 * @param {boolean} props.isTeamMode - Whether game is in team mode
 * @param {string} props.teamName - Team name ('blue' or 'red') when in team mode
 * @returns {JSX.Element} The rendered elimination screen
 */
const MathQuizEliminatedAnswer = ({ points_earned, total_points, currentSequence, totalSequences, isTeamMode, teamName }) => {
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
          mb: 1
        }}
      >
        Vyřazen!
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
        {isTeamMode ? (
          <>
            Bohužel, váš {teamName === 'blue' ? 'modrý' : 'červený'} tým byl vyřazen v příkladu {currentSequence} z {totalSequences}.
          </>
        ) : (
          <>
            Bohužel, byli jste vyřazeni v příkladu {currentSequence} z {totalSequences}.
          </>
        )}
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

export default MathQuizEliminatedAnswer;