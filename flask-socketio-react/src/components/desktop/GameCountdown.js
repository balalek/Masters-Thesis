import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { getServerTime } from '../../utils/socket';

const GameCountdown = ({ onCountdownComplete, showAt }) => {
  const [count, setCount] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getServerTime();
      const remaining = Math.ceil((showAt - now) / 1000);

      if (remaining <= 0) {
        clearInterval(timer);
        onCountdownComplete();
        return;
      }

      setCount(remaining);
    }, 100); // Update more frequently for smoother countdown

    return () => clearInterval(timer);
  }, [onCountdownComplete, showAt]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: 4
    }}>
      <Typography variant="h2" component="div">
        Hra začíná za
      </Typography>
      <Typography variant="h1" component="div" sx={{
        fontSize: '15rem',
        fontWeight: 'bold',
        color: '#3B82F6'
      }}>
        {count}
      </Typography>
    </Box>
  );
};

export default GameCountdown;
