import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';

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
