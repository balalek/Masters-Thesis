import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../utils/socket';

const QuestionPreview = ({ question, onPreviewComplete, showAt }) => { // Added showAt prop
  const [count, setCount] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getServerTime();
      const remaining = Math.ceil((showAt - now) / 1000);

      if (remaining <= 0) {
        clearInterval(timer);
        onPreviewComplete();
        return;
      }

      setCount(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [onPreviewComplete, showAt]); // Added showAt dependency

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: 4,
      padding: 4
    }}>
      <Typography 
        variant="h2" 
        component="div" 
        sx={{ 
          textAlign: 'center',
          maxWidth: '80%'
        }}
      >
        {question}
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

export default QuestionPreview;
