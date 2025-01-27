import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { getSocket } from '../../../utils/socket';

function MobileJoinQuizRoom() {
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const navigate = useNavigate();
  const socket = getSocket();

 // Socket listeners only
  useEffect(() => {
    // Initial color fetch
    fetch(`http://${window.location.hostname}:5000/available_colors`)
      .then(response => response.json())
      .then(data => {
        console.log('Initial colors fetch:', data.colors);
        setAvailableColors(data.colors);
      });

    socket.on('colors_updated', (data) => {
      console.log('Colors updated received:', data.colors);
      setAvailableColors(data.colors);
    });

    socket.on('game_started', (data) => {
      navigate('/mobile-game', { state: { playerName } });
    });

    return () => {
      socket.off('colors_updated');
      socket.off('game_started');
    };
  }, []);

  // Add this useEffect after other useEffects
useEffect(() => {
  if (selectedColor && !availableColors.includes(selectedColor)) {
    setSelectedColor(null);
  }
}, [availableColors, selectedColor]);

  const handleJoinGame = () => {
    if (!playerName.trim() || !selectedColor) return;

    fetch(`http://${window.location.hostname}:5000/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        player_name: playerName,
        color: selectedColor 
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) {
          const socket = getSocket();
          socket.emit('join_room', { player_name: playerName });
        } else {
          console.error(data.error);
        }
      })
      .catch((error) => console.error('Error joining game:', error));
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '100vh',
        py: 4
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          <Typography variant="h4" component="h1">
            Připojení do kvízu
          </Typography>
          
          <TextField
            fullWidth
            label="Přezdívka"
            variant="outlined"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
  
          <Typography variant="h6" component="h2">
            Vyber si barvu:
          </Typography>
  
          <Box 
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center' // Center the color buttons
            }}
          >
            {availableColors.map((color) => (
              <Box 
                key={color} 
                sx={{ 
                  width: 'calc(33.33% - 16px)',
                }}
              >
                <Button
                  variant={selectedColor === color ? "contained" : "outlined"}
                  sx={{
                    backgroundColor: color,
                    width: '100%',
                    height: '50px',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: color,
                      opacity: 0.9,
                    },
                  }}
                  onClick={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <CheckIcon sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      color: 'white' 
                    }} />
                  )}
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
  
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleJoinGame}
          disabled={!playerName.trim() || !selectedColor}
        >
          Připojit
        </Button>
      </Box>
    </Container>
  );
}

export default MobileJoinQuizRoom;