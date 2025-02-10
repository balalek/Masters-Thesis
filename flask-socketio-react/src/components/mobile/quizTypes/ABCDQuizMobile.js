import React from 'react';
import { Box, Button } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

const ABCDQuizMobile = ({ onAnswer }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-around', gap: 2, height: '50%' }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#14A64A', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => onAnswer(0)}
        >
          <StarIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#186CF6', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => onAnswer(1)}
        >
          <SquareIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
      </Box>
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-around', gap: 2, height: '50%' }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EF4444', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => onAnswer(2)}
        >
          <PentagonIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EAB308', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => onAnswer(3)}
        >
          <CircleIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
      </Box>
    </Box>
  );
};

export default ABCDQuizMobile;
