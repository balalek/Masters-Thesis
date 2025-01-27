import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const Loading = () => {
  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h4" component="h1" sx={{ color: 'text.primary', marginBottom: '20px' }}>
        Čekej prosím
      </Typography>
      <CircularProgress />
    </Box>
  );
};

export default Loading;