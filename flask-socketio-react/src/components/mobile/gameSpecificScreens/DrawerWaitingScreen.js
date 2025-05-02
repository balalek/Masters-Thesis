/**
 * @fileoverview Drawer Waiting Screen component for drawing players
 * 
 * This component provides:
 * - Display for the word that the player must draw
 * - Toggle visibility option to hide the word temporarily
 * - Waiting state information while other players prepare
 * 
 * @module Components/Mobile/GameSpecificScreens/DrawerWaitingScreen
 */
import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

/**
 * Drawer Waiting Screen component
 * 
 * Displays a waiting screen for the drawing player showing their selected word,
 * with the ability to toggle visibility of the word to prevent others from seeing it.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.selectedWord - The word that the player will draw
 * @returns {JSX.Element} The rendered waiting screen
 */
const DrawerWaitingScreen = ({ selectedWord }) => {
  const [isWordVisible, setIsWordVisible] = useState(false);

  const toggleWordVisibility = () => {
    setIsWordVisible(prev => !prev);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      p: 2
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        mb: 3,
        position: 'relative'
      }}>
        <Typography variant="h5" sx={{ textAlign: 'center' }}>
          Vybrané slovo: <strong>{isWordVisible ? selectedWord : '********'}</strong>
        </Typography>
        <IconButton 
          onClick={toggleWordVisibility} 
          sx={{ ml: 1 }}
          color="primary"
        >
          {isWordVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </Box>
      
      <Typography variant="h6" sx={{ mb: 5, textAlign: 'center', color: 'primary.main' }}>
        Čekej prosím...
      </Typography>
    </Box>
  );
};

export default DrawerWaitingScreen;