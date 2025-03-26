import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const MoreLessVoteMobile = ({ onAnswer, firstTeamAnswer }) => {
  const [selected, setSelected] = useState(null);

  const handleSelect = (choice) => {
    setSelected(choice);
    onAnswer(choice);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      width: '100%'
    }}>
      {/* Header with first team's answer */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center'
      }}>
        <Box sx={{ fontSize: '1.25rem', fontWeight: 'medium' }}>
          Správná odpověď je
        </Box>
        <Typography variant="h4" sx={{ mt: 1 }}>
          {firstTeamAnswer ? `${firstTeamAnswer}` : '...'}
        </Typography>
      </Box>
      
      {/* More/Less buttons taking up all remaining space */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: selected === 'more' ? '#186CF6' : '#186CF6AA',
            color: 'white',
            flex: 1,
            borderRadius: 0,
            fontSize: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
          onClick={() => handleSelect('more')}
        >
          <ArrowUpwardIcon sx={{ fontSize: '4rem' }} />
          <Typography variant="h4">VÍCE</Typography>
        </Button>
        
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: selected === 'less' ? '#EF4444' : '#EF4444AA',
            color: 'white',
            flex: 1,
            borderRadius: 0,
            fontSize: '2rem',
            display: 'flex', 
            flexDirection: 'column',
            gap: 2
          }}
          onClick={() => handleSelect('less')}
        >
          <ArrowDownwardIcon sx={{ fontSize: '4rem' }} />
          <Typography variant="h4">MÉNĚ</Typography>
        </Button>
      </Box>
    </Box>
  );
};

export default MoreLessVoteMobile;
