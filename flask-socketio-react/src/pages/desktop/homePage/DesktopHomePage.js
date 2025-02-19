import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';

const DesktopHomePage = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate('/room');
  };

  const handleCreateQuiz = () => {
    navigate('/create-quiz');
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 3,
      p: 4 
    }}>
      <Typography variant="h3" component="h1">
        Vítejte ve Quiz Game!
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleStartGame}>
          Vstoupit do místnosti
        </Button>
        <Button variant="contained" color="secondary" onClick={handleCreateQuiz}>
          Vytvořit kvíz
        </Button>
      </Box>
    </Box>
  );
};

export default DesktopHomePage;