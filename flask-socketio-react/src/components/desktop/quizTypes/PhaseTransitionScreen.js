import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getServerTime } from '../../../utils/socket';

const PhaseTransitionScreen = ({ question, firstTeamAnswer, activeTeam, transitionEndTime, onTransitionComplete }) => {
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
        Fáze 2
      </Typography>

      {/* Middle section with content - restructured for better timer positioning */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            textAlign: 'center',
            maxWidth: '80%',
            mb: 5 // Add more space below question
          }}
        >
          {question?.question}
        </Typography>
        
        {/* Content arranged to position timer in the middle */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10 // Add more gap between elements
        }}>
          {/* First team answer */}
          <Typography variant="h4">
            <span style={{ color: prevTeamColor, fontWeight: 'bold' }}>{prevTeamName} tým</span> tipoval: 
            <span style={{ fontWeight: 'bold', display: 'block', fontSize: '1.8em', mt: 1 }}>
              {firstTeamAnswer}
            </span>
          </Typography>
          
          {/* Large timer positioned in middle */}
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
      </Box>

      {/* Bottom section with next team */}
      <Typography variant="h4" sx={{ mb: 1 }}>
        Nyní je na řadě <span style={{ color: teamColor, fontWeight: 'bold' }}>{teamName} tým</span>
      </Typography>
    </Box>
  );
};

export default PhaseTransitionScreen;
