/**
 * @fileoverview Phase Transition screen for mobile devices for team guess a number question type
 * 
 * This component provides:
 * - Display for the transition between game phases
 * - Team-specific messaging based on active team
 * - Display of the opponent's initial answer
 * - Visual cues for waiting vs. active states
 * 
 * @module Components/Mobile/ScreensBetweenRounds/PhaseTransitionMobile
 */
import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';

/**
 * Phase Transition component for mobile devices
 * 
 * Displays transition information between game phases,
 * showing different content based on whether the player's team
 * is currently active or waiting.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.firstTeamAnswer - The answer provided by the first team
 * @param {string} props.activeTeam - The currently active team ('blue' or 'red')
 * @param {string} props.teamName - The current player's team name
 * @returns {JSX.Element} The rendered phase transition screen
 */
const PhaseTransitionMobile = ({ firstTeamAnswer, activeTeam, teamName }) => {
  const isActiveTeam = teamName === activeTeam;
  const teamColor = activeTeam === 'blue' ? '#186CF6' : '#EF4444';
  const teamText = activeTeam === 'blue' ? 'modrý' : 'červený';
  
  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
        textAlign: 'center'
      }}
    >
      <Typography variant="h4" gutterBottom color="text.primary">
        Fáze 2
      </Typography>
      
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          my: 3, 
          width: '100%', 
          maxWidth: '400px',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="h6" gutterBottom>
          {isActiveTeam ? 
            'Soupeřův tým tipoval:' : 
            `Váš tým tipoval:`
          }
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
          {firstTeamAnswer}
        </Typography>
      </Paper>
      
      {isActiveTeam ? (
        <>
          <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold', color: teamColor }}>
            Váš tým je nyní na řadě!
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Rozhodněte, zda je správná odpověď větší nebo menší
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="h5" sx={{ mt: 2 }}>
            Nyní hraje <span style={{ color: teamColor, fontWeight: 'bold' }}>{teamText} tým</span>
          </Typography>
          <CircularProgress 
            size={40} 
            thickness={4} 
            sx={{ 
              color: teamColor, 
              mt: 3
            }} 
          />
        </>
      )}
    </Box>
  );
};

export default PhaseTransitionMobile;