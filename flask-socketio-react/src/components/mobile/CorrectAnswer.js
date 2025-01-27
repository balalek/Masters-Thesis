import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const CorrectAnswer = () => {
  return (
    <Box
      sx={{
        backgroundColor: 'green',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="h1" component="h1" sx={{ color: 'white', fontSize: '5em' }}>
        Správně!
      </Typography>
    </Box>
  );
};

export default CorrectAnswer;