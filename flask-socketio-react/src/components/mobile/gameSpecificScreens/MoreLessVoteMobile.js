import React, { useState } from 'react';
import { Box, Button, Typography, Radio } from '@mui/material';
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
      {/* Header with instruction text only, no number (shown on desktop) */}
      <Box sx={{ 
        p: 3, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Typography variant="h5" sx={{ fontSize: '1.6rem', fontWeight: 'medium' }}>
          Je správná odpověď větší nebo menší?
        </Typography>
      </Box>
      
      {/* More/Less buttons side by side */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'row',
        p: 2,
      }}>
        {/* LESS button */}
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: selected === 'less' ? '#EF4444' : '#EF4444AA',
            color: 'white',
            flex: 1,
            borderRadius: 2,
            mr: 1,
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            p: 2
          }}
          onClick={() => handleSelect('less')}
        >
          <ArrowDownwardIcon sx={{ fontSize: '4rem', mb: 1 }} />
          <Typography variant="h4" sx={{ fontSize: '2rem', mb: 2 }}>MENŠÍ</Typography>
          
          <Radio 
            checked={selected === 'less'} 
            sx={{ 
              color: 'white',
              '&.Mui-checked': {
                color: 'white',
              },
              '& .MuiSvgIcon-root': {
                fontSize: 40
              },
              mt: 2
            }}
          />
        </Button>
        
        {/* MORE button */}
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: selected === 'more' ? '#186CF6' : '#186CF6AA',
            color: 'white',
            flex: 1,
            borderRadius: 2,
            ml: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            p: 2
          }}
          onClick={() => handleSelect('more')}
        >
          <ArrowUpwardIcon sx={{ fontSize: '4rem', mb: 1 }} />
          <Typography variant="h4" sx={{ fontSize: '2rem', mb: 2 }}>VĚTŠÍ</Typography>
          
          <Radio 
            checked={selected === 'more'} 
            sx={{ 
              color: 'white',
              '&.Mui-checked': {
                color: 'white',
              },
              '& .MuiSvgIcon-root': {
                fontSize: 40
              },
              mt: 2
            }}
          />
        </Button>
      </Box>
    </Box>
  );
};

export default MoreLessVoteMobile;
