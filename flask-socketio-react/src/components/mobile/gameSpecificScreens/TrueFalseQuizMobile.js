import React from 'react';
import { Box, Button } from '@mui/material';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

const TrueFalseQuizMobile = ({ onAnswer }) => {
  return (
    <Box sx={{ display: 'flex', height: '100vh', gap: 2, p: 2 }}>
      <Button
        variant="contained"
        sx={{ 
          backgroundColor: '#186CF6', 
          color: 'white', 
          flex: 1,
          fontSize: '2.5em', 
          justifyContent: 'center'
        }}
        onClick={() => onAnswer(0)}
      >
        <SquareIcon sx={{ fontSize: '3em', color: 'white' }} />
      </Button>
      <Button
        variant="contained"
        sx={{ 
          backgroundColor: '#EF4444', 
          color: 'white', 
          flex: 1,
          fontSize: '2.5em', 
          justifyContent: 'center'
        }}
        onClick={() => onAnswer(1)}
      >
        <CircleIcon sx={{ fontSize: '3em', color: 'white' }} />
      </Button>
    </Box>
  );
};

export default TrueFalseQuizMobile;
