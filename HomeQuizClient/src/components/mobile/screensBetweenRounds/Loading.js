/**
 * @fileoverview Loading indicator component for mobile screens
 * 
 * This component provides:
 * - Visual loading indicator with spinning animation
 * - Informative waiting message for users
 * - Full-screen display for use between game phases
 * @author Bc. Martin Baláž
 * @module Components/Mobile/ScreensBetweenRounds/Loading
 */
import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Loading component for displaying waiting states
 * 
 * Displays a simple full-screen loading indicator with a waiting message
 * for use during transitions and data loading periods.
 * 
 * @component
 * @returns {JSX.Element} The rendered loading component
 */
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