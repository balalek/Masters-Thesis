/**
 * @fileoverview Team Waiting Screen for mobile players during team games
 * 
 * This component provides:
 * - Waiting screen display during team-based turn games
 * - Loading spinner with customizable waiting message
 * - Phase-specific default messages when waiting for team turns
 * @author Bc. Martin Baláž
 * @module Components/Mobile/ScreensBetweenRounds/TeamWaitingScreen
 */
import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

/**
 * Team Waiting Screen component for displaying waiting state in team games
 * 
 * Shows a loading screen with appropriate messaging when players need to
 * wait during team-based turn games.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom waiting message
 * @param {number} props.phase - Current game phase (affects default message)
 * @returns {JSX.Element} The rendered waiting screen
 */
const TeamWaitingScreen = ({ message, phase }) => {
  
  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Typography variant="h4" sx={{color: 'text.primary'}} gutterBottom>
        {message || (phase === 1 
          ? "Čekej, až bude tvůj tým na řadě" 
          : "Čekej, nyní hraje druhý tým")}
      </Typography>
      
      <CircularProgress 
        size={60} 
        thickness={4} 
        sx={{ 
          color: 'text.primary',
          mt: 4
        }} 
      />
    </Box>
  );
};

export default TeamWaitingScreen;