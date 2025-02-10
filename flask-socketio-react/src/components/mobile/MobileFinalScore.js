import React from 'react';
import { Box, Typography } from '@mui/material';

const MobileFinalScore = ({ playerName, score, placement, color }) => {
  return (
    <Box sx={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 3
    }}>
      {/* Title at top */}
      <Typography variant="h3" sx={{ fontWeight: 'semi-bold', textAlign: 'center', mb: 4 }}>
        Finální umístění
      </Typography>

      {/* Content in center */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4
      }}>
        {/* Circle and Score */}
        <Box sx={{
          width: '240px',
          height: '240px',
          mb:4,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <Typography 
            variant="h1" 
            sx={{ 
              color: 'white',
              fontWeight: 'bold',
              fontSize: '6rem'
            }}
          >
            {placement}.
          </Typography>
        </Box>

        <Typography 
          sx={{ 
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '2.5rem'
          }}
        >
          Skóre: {score}
        </Typography>
      </Box>
    </Box>
  );
};

export default MobileFinalScore;
