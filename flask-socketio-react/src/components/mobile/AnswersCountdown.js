import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

const AnswersCountdown = ({ onCountdownComplete }) => {
  const [count, setCount] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCountdownComplete]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: 4
    }}>
      <Typography variant="h4" sx={{ textAlign: 'center' }}>
        Odpovědi za
      </Typography>
      <Typography variant="h1" sx={{
        fontSize: '5rem',
        fontWeight: 'bold',
        color: '#3B82F6'
      }}>
        {count}
      </Typography>
    </Box>
  );
};

export default AnswersCountdown;
