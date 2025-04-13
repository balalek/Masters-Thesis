import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CancelIcon from '@mui/icons-material/Cancel';
import Paper from '@mui/material/Paper';

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