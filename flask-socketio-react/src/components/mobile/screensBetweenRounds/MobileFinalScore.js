/**
 * @fileoverview Mobile Final Score component for game conclusion screen
 * 
 * This component provides:
 * - Final score display for both team and individual game modes
 * - Placement indicator for individual players
 * - Team comparison scores in team mode
 * - Visual win/lose/draw indicators for team games
 * - Player-specific color theming
 * 
 * @module Components/Mobile/ScreensBetweenRounds/MobileFinalScore
 */
import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Mobile Final Score component for displaying end-of-game results
 * 
 * Shows a personalized final score screen with either team comparison
 * or individual placement results based on game mode.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.playerName - Name of the current player
 * @param {number} props.score - Player's or team's final score
 * @param {number} props.placement - Player's final ranking position (individual mode)
 * @param {string} props.color - Player's color for theming
 * @param {boolean} props.isTeamMode - Whether the game was in team mode
 * @param {string} props.teamName - Player's team name ('blue' or 'red')
 * @param {Object} props.teamScores - Team score object with blue and red properties
 * @returns {JSX.Element} The rendered final score screen
 */
const MobileFinalScore = ({ 
  playerName, 
  score, 
  placement, 
  color, 
  isTeamMode = false, 
  teamName = '', 
  teamScores = { blue: 0, red: 0 } 
}) => {
  if (isTeamMode) {
    const teamColor = teamName === 'blue' ? '#186CF6' : '#EF4444';
    const isWinner = teamName === 'blue' ? 
      teamScores.blue > teamScores.red : 
      teamScores.red > teamScores.blue;
    const isDraw = teamScores.blue === teamScores.red;

    return (
      <Box sx={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4
      }}>
        {/* Winner/Draw/Loser Status */}
        <Typography variant="h2" sx={{ 
          color: teamColor,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          mb: 2,
          textAlign: 'center',
          letterSpacing: 1
        }}>
          {isDraw ? 'Remíza' : (isWinner ? 'Vítězství!' : 'Porážka')}
        </Typography>

        {/* Team Name */}
        <Typography variant="h4" sx={{ 
          color: teamColor,
          opacity: 0.9,
          mb: 6,
          textAlign: 'center'
        }}>
          {teamName === 'blue' ? 'Modrý tým' : 'Červený tým'}
        </Typography>

        {/* Score */}
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          maxWidth: 300,
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `4px solid ${teamColor}`,
          borderRadius: '50%',
          mb: 6,
          boxShadow: `0 0 30px ${teamColor}30`
        }}>
          <Typography sx={{ 
            fontSize: '5rem',
            fontWeight: 'bold',
            color: teamColor,
            fontFamily: 'monospace',
            textShadow: `0 0 20px ${teamColor}40`
          }}>
            {score}
          </Typography>
        </Box>

        {/* Final Scores */}
        <Box sx={{ 
          display: 'flex',
          gap: 4,
          justifyContent: 'center',
          width: '100%',
          maxWidth: 300
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#186CF6', mb: 1 }}>
              Modrý tým
            </Typography>
            <Typography variant="h4" sx={{ color: '#186CF6', fontFamily: 'monospace' }}>
              {teamScores.blue}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#EF4444', mb: 1 }}>
              Červený tým
            </Typography>
            <Typography variant="h4" sx={{ color: '#EF4444', fontFamily: 'monospace' }}>
              {teamScores.red}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Individual mode remains mostly the same but with updated styling
  return (
    <Box sx={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4
    }}>
      <Typography variant="h2" sx={{ 
        color: color,
        fontWeight: 'bold',
        mb: 6 
      }}>
        {placement}. místo
      </Typography>

      <Box sx={{
        width: '75%',
        maxWidth: '280px',
        aspectRatio: '1',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 40px ${color}40`,
        mb: 6
      }}>
        <Typography variant="h1" sx={{ 
          color: 'white',
          fontWeight: 'bold',
          fontSize: '5rem',
          fontFamily: 'monospace'
        }}>
          {score}
        </Typography>
      </Box>

      <Typography variant="h4" sx={{ 
        color: color,
        fontFamily: 'monospace',
        opacity: 0.9
      }}>
        {playerName}
      </Typography>
    </Box>
  );
};

export default MobileFinalScore;