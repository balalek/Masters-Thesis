/**
 * @fileoverview Blind Map Phase Transition screen for mobile devices
 * 
 * This component provides:
 * - Phase transition screens between anagram solving and map guessing
 * - Team-specific instructions and feedback
 * - Visual indicators for active team and game progress
 * - Different messaging based on game state (success/failure)
 * 
 * @module Components/Mobile/ScreensBetweenRounds/BlindMapPhaseTransitionMobile
 */
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Blind Map Phase Transition component for mobile devices
 * 
 * Displays the transition screen between different phases of the Blind Map game,
 * showing the correct city name and providing team-specific instructions.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.cityName - The name of the city to display
 * @param {string} props.mapType - Map type ('cz' or 'europe')
 * @param {string} props.teamName - Current player's team name
 * @param {string} props.activeTeam - Currently active team ('blue' or 'red')
 * @param {number} props.phase - Current game phase (2 or 3)
 * @returns {JSX.Element} The rendered phase transition screen
 */
const BlindMapPhaseTransitionMobile = ({ 
  cityName, 
  mapType,
  teamName,
  activeTeam,
  phase = 2, // Default to phase 2, but can be 3 if first team failed
}) => {
  const mapName = mapType === 'cz' ? 'České republiky' : 'Evropy';
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
        {`Fáze ${phase}`}
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
          {teamName ? 'Město:' : 'Správná odpověď je:'}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
          {cityName}
        </Typography>
      </Paper>
      
      {/* For team mode */}
      {teamName && (
        <>
          {phase === 2 && (
            <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
              <span style={{ 
                color: teamColor,
                fontWeight: 'bold'
              }}>
                {teamText} tým
              </span> správně vyřešil přesmyčku
            </Typography>
          )}
          
          {isActiveTeam ? (
            <>
              <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold', color: teamColor }}>
                Váš tým je nyní na řadě!
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {phase === 2 
                  ? 'Najděte město na mapě' 
                  : 'Druhý tým neuspěl. Nyní máte druhý pokus najít město na mapě'}
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h5" sx={{ mt: 2 }}>
                Nyní hraje <span style={{ color: teamColor, fontWeight: 'bold' }}>{teamText} tým</span>
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {phase === 2 
                  ? 'Počkejte, až druhý tým dokončí svůj pokus' 
                  : 'První tým neuspěl. Nyní je na řadě druhý tým.'}
              </Typography>
            </>
          )}
        </>
      )}
      
      {/* For free-for-all mode */}
      {!teamName && (
        <Typography variant="h5" sx={{ mt: 2 }}>
          Nyní najdi město na mapě {mapName}
        </Typography>
      )}
    </Box>
  );
};

export default BlindMapPhaseTransitionMobile;