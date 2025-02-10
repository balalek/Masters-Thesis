import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import { Box, TextField, Button, Typography, Container, Avatar } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { getSocket } from '../../../utils/socket';
import WaitingRoom from '../../../components/mobile/WaitingRoom';

function MobileJoinQuizRoom() {
  const location = useLocation(); // Add this
  const [playerName, setPlayerName] = useState(location.state?.playerName || '');
  const [selectedColor, setSelectedColor] = useState(location.state?.playerColor || null);
  const [playerColor, setPlayerColor] = useState(null);  // Add new state for permanent color
  const [availableColors, setAvailableColors] = useState([]);
  const [nameError, setNameError] = useState('');
  const [isPlayerCreated, setIsPlayerCreated] = useState(false);
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();
  const socket = getSocket();

  // Initial color fetch
  useEffect(() => {
    fetch(`http://${window.location.hostname}:5000/available_colors`)
      .then(response => response.json())
      .then(data => {
        console.log('Initial colors fetch:', data.colors);
        setAvailableColors(data.colors);
      });
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on('colors_updated', (data) => {
      console.log('Colors updated received:', data.colors);
      setAvailableColors(data.colors);
    });

    return () => {
      socket.off('colors_updated');
    };
  }, [navigate, playerName]);

  // Unpick color if it disappears (only before player creation)
  useEffect(() => {
    if (!isPlayerCreated && selectedColor && !availableColors.includes(selectedColor)) {
      setSelectedColor(null);
    }
  }, [availableColors, selectedColor, isPlayerCreated]);

  useEffect(() => {
    // If we have state data, auto-join the game
    if (location.state?.playerName && location.state?.playerColor) {
      // Select the color that is stored in the state
      setSelectedColor(location.state.playerColor);
    }
  }, []);

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
        if (data.error) {
          setJoinError(data.error);
        } else {
          setJoinError('');
          setPlayerColor(selectedColor);
          setIsPlayerCreated(true);
          socket.emit('join_room', { player_name: playerName });
        }
      })
      .catch((error) => {
        console.error('Error joining game:', error);
        setJoinError('Nelze se připojit k serveru');
      });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setPlayerName(name);
    if (name.length < 3 || name.length > 16) {
      setNameError('Přezdívka musí mít 3 až 16 znaků');
      setJoinError('');
    } else {
      setNameError('');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', // Center content vertically
        alignItems: 'center',     // Center content horizontally
        minHeight: '100vh',
        py: 4
      }}>
        {isPlayerCreated ? (
          <WaitingRoom playerName={playerName} playerColor={playerColor} />
        ) : (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            alignItems: 'center' // Center form content horizontally
          }}>
            <Typography variant="h4" component="h1">
              Připojení do kvízu
            </Typography>
            
            <TextField
              fullWidth
              label="Přezdívka"
              variant="outlined"
              value={playerName}
              onChange={handleNameChange}
              error={!!nameError || !!joinError}
              helperText={joinError || nameError}
              sx={{ minHeight: '80px', mb: -2 }}
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
                      backgroundColor: color,  // Always show the color
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
        )}

        {!isPlayerCreated && (
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleJoinGame}
            disabled={!playerName.trim() || !selectedColor || !!nameError}
            sx={{ mt: 4 }} // Margin top
          >
            Připojit
          </Button>
        )}
      </Box>
    </Container>
  );
}

export default MobileJoinQuizRoom;