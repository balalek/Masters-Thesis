import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

const TrueFalseAnswers = ({ question, correctAnswer, answerCounts }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      gap: 2
    }}>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#186CF6',
          color: 'white',
          flex: '1 1 45%',
          height: '150px',
          fontSize: '2.5em',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 2,
          paddingRight: 2,
          textTransform: 'none',
          opacity: correctAnswer === 0 ? 1 : 0.4
        }}
        startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[0]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[0]}×
        </Typography>
      </Button>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#EF4444',
          color: 'white',
          flex: '1 1 45%',
          height: '150px',
          fontSize: '2.5em',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 2,
          paddingRight: 2,
          textTransform: 'none',
          opacity: correctAnswer === 1 ? 1 : 0.4
        }}
        startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[1]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[1]}×
        </Typography>
      </Button>
    </Box>
  );
};

export default TrueFalseAnswers;
