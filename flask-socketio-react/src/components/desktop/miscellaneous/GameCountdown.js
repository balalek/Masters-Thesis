/**
 * @fileoverview Game Countdown component for displaying a synchronized pre-game timer
 * 
 * This component provides:
 * - Server-synchronized countdown timer for game start coordination
 * - Visual display of remaining seconds
 * - Automatic completion callback when countdown reaches zero
 * - Smooth timer updates with sub-second precision
 * 
 * @module Components/Desktop/Miscellaneous/GameCountdown
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { getServerTime } from '../../../utils/socket';

/**
 * Game Countdown component for pre-game timing display
 * 
 * Displays a large countdown timer synchronized with the server time,
 * automatically triggering the provided callback when complete.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onCountdownComplete - Callback triggered when countdown reaches zero
 * @param {number} props.showAt - Server timestamp (ms) when countdown should complete
 * @returns {JSX.Element} The rendered countdown component
 */
const GameCountdown = ({ onCountdownComplete, showAt }) => {
  const [count, setCount] = useState(2);

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