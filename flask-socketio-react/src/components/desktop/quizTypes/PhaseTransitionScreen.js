import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
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

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      justifyContent: 'center', 
      alignItems: 'center',
      p: 3,
      textAlign: 'center' 
    }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Fáze 2
      </Typography>

      <Typography variant="h2" component="h1" sx={{ mb: 4 }}>
        {question?.question}
      </Typography>
      
      <Paper elevation={3} sx={{ p: 4, maxWidth: '600px', mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {activeTeam === 'blue' ? 'Červený' : 'Modrý'} tým tipoval:
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
          {firstTeamAnswer}
        </Typography>
        
        <Typography variant="h5" gutterBottom>
          Nyní je na řadě <span style={{ color: teamColor, fontWeight: 'bold' }}>{teamName} tým</span>
        </Typography>
        <Typography variant="body1">
          Je správná odpověď větší nebo menší?
        </Typography>
      </Paper>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={30} />
        <Typography variant="h6">
          Další fáze začne za {timeRemaining} sekund
        </Typography>
      </Box>
    </Box>
  );
};

export default PhaseTransitionScreen;
