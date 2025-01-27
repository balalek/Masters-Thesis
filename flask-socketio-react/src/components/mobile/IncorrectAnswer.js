import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const IncorrectAnswer = () => {
  return (
    <Box
      sx={{
        backgroundColor: 'red',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="h1" component="h1" sx={{ color: 'white', fontSize: '5em' }}>
        Špatně!
      </Typography>
    </Box>
  );
};

export default IncorrectAnswer;