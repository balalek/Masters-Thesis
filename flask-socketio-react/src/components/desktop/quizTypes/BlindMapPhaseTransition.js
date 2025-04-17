import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { getServerTime } from '../../../utils/socket';

const BlindMapPhaseTransition = ({ 
  correctAnswer, 
  activeTeam, 
  transitionEndTime, 
  onTransitionComplete,
  phase = 2,
  mapType = 'cz',
  previousGuesses = [],
  isTeamMode = false
}) => {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (transitionEndTime) {
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((transitionEndTime - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
          onTransitionComplete();
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [transitionEndTime, onTransitionComplete]);

  const teamColor = activeTeam === 'blue' ? '#3B82F6' : '#EF4444';
  const teamName = activeTeam === 'blue' ? 'modrý' : 'červený';
  const prevTeamName = activeTeam === 'blue' ? 'Červený' : 'Modrý';
  const prevTeamColor = activeTeam === 'blue' ? '#EF4444' : '#3B82F6';
  const mapName = mapType === 'cz' ? 'České republiky' : 'Evropy';

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      p: 3,
      textAlign: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Top section with phase title */}
      <Typography variant="h5" sx={{ mb: 0, pt: 3 }}>
        Fáze {phase}
      </Typography>

      {/* Middle section with content */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        {/* City name revealed */}
        <Paper 
          elevation={3}
          sx={{ 
            px: 5, 
            py: 3, 
            mb: 5, 
            backgroundColor: 'primary.light', 
            borderRadius: 2
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
            {correctAnswer}
          </Typography>
        </Paper>
        
        {/* Phase-specific content - conditionally render based on isTeamMode */}
        {isTeamMode ? (
          // Team mode content
          phase === 2 ? (
            <Typography variant="h4" sx={{ mb: 5 }}>
              <span style={{ color: teamColor, fontWeight: 'bold' }}>
                {teamName.charAt(0).toUpperCase() + teamName.slice(1)} tým
              </span> nyní určí polohu města na mapě {mapName}
            </Typography>
          ) : (
            <Typography variant="h4" sx={{ mb: 5 }}>
              <span style={{ color: prevTeamColor, fontWeight: 'bold' }}>
                {prevTeamName} tým
              </span> neurčil polohu správně. Nyní je na řadě{' '}
              <span style={{ color: teamColor, fontWeight: 'bold' }}>
                {teamName} tým
              </span>
            </Typography>
          )
        ) : (
          // Free-for-all content
          <Typography variant="h4" sx={{ mb: 5 }}>
            Všichni hráči nyní určí polohu města {correctAnswer} na mapě {mapName}
          </Typography>
        )}
        
        {/* Large timer */}
        <Typography 
          variant="h1" 
          sx={{
            fontSize: '5rem',
            fontWeight: 'bold',
            color: '#3B82F6',
          }}
        >
          {timeRemaining ?? '...'}
        </Typography>
      </Box>

      {/* Bottom section */}
      <Typography variant="h5" sx={{ mb: 4 }} >
        Najdi město na svém telefonu
      </Typography>
    </Box>
  );
};

export default BlindMapPhaseTransition;
