import React, { useState } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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
