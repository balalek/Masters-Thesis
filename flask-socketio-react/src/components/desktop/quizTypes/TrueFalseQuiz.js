import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';
import { getServerTime } from '../../../utils/socket';

const TrueFalseQuiz = ({ question, answersCount, question_end_time }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (question_end_time) {
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((question_end_time - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [question_end_time]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      justifyContent: 'space-between', 
      padding: 2 
    }}>
      {/* Center content grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        px: 4
      }}>
        {/* Timer bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {timeRemaining ?? '--'}
          </Typography>
        </Box>

        {/* Question */}
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            textAlign: 'center',
            lineHeight: 1.3,
            fontWeight: 500
          }}
        >
          {question?.question}
        </Typography>

        {/* Answers count bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {answersCount}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt:-1.5 }}>
            odpovědí
          </Typography>
        </Box>
      </Box>

      {/* Answer buttons - only two for True/False */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: 2 
      }}>
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: '#186CF6', 
            color: 'white', 
            flex: '1 1 45%', // Changed from flex: '1'
            height: '150px', 
            fontSize: '2.5em', 
            justifyContent: 'flex-start', 
            paddingLeft: 2, 
            textTransform: 'none'
            // Removed maxWidth
          }}
          startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question?.options[0]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ 
            backgroundColor: '#EF4444', 
            color: 'white', 
            flex: '1 1 45%', // Changed from flex: '1'
            height: '150px', 
            fontSize: '2.5em', 
            justifyContent: 'flex-start', 
            paddingLeft: 2, 
            textTransform: 'none'
            // Removed maxWidth
          }}
          startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question?.options[1]}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};

export default TrueFalseQuiz;
