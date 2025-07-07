/**
 * @fileoverview Mobile Join Quiz Room component for player connection
 * 
 * This module provides:
 * - Player name and color selection interface
 * - Real-time color availability updates via socket.io
 * - Form validation for player names
 * - Session persistence between reconnections
 * - Transition to waiting room after successful connection
 * @author Bc. Martin Baláž
 * @module Pages/Mobile/JoinQuizRoom/MobileJoinQuizRoom
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { getSocket } from '../../../utils/socket';
import WaitingRoom from '../../../components/mobile/screensBetweenRounds/WaitingRoom';

/**
 * Mobile Join Quiz Room component for player registration
 * 
 * @component
 * @returns {JSX.Element} The rendered join room component
 */
function MobileJoinQuizRoom() {
  const location = useLocation();
  const [playerName, setPlayerName] = useState(location.state?.playerName || '');
  const [selectedColor, setSelectedColor] = useState(location.state?.playerColor || null);
  const [playerColor, setPlayerColor] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [nameError, setNameError] = useState('');
  const [isPlayerCreated, setIsPlayerCreated] = useState(false);
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();
  const socket = getSocket();

  // Fetch available colors from the server on component mount
  useEffect(() => {
    fetch(`http://${window.location.hostname}:5000/available_colors`)
      .then(response => response.json())
      .then(data => {
        setAvailableColors(data.colors);
      });
  }, []);

  // Listen for color updates and game reset events from the server
  useEffect(() => {
    socket.on('colors_updated', (data) => {
      setAvailableColors(data.colors);
    });

    socket.on('game_reset', () => {
      setIsPlayerCreated(false);
      navigate('/play', { 
        state: { 
          playerName: playerName,
          playerColor: playerColor
        } 
      });
    });

    return () => {
      socket.off('game_reset');
      socket.off('colors_updated');
    };
  }, [navigate, playerName]);

  // Unpick color if it disappears (only before player creation)
  useEffect(() => {
    if (!isPlayerCreated && selectedColor && !availableColors.includes(selectedColor)) {
      setSelectedColor(null);
    }
  }, [availableColors, selectedColor, isPlayerCreated]);

  // Set the selected color from the state if available
  // This is for faster registration if player wants to play again
  useEffect(() => {
    if (location.state?.playerName && location.state?.playerColor) {
      // Select the color that is stored in the state
      setSelectedColor(location.state.playerColor);
    }
  }, []);

  /**
   * Handle player joining the game
   * 
   * Sends player data to the server and transitions to waiting room
   * if successful, or displays an error message if joining fails.
   * 
   * @function handleJoinGame
   */
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

  /**
   * Handle player name changes
   * 
   * Validates the player name and sets appropriate error messages
   * when name length requirements are not met.
   * 
   * @function handleNameChange
   * @param {Object} e - React change event
   */
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

  /**
   * Reset player creation state
   * 
   * Returns from waiting room to the join form while preserving
   * the player's color selection.
   * 
   * @function handleReset
   */
  const handleReset = () => {
    setIsPlayerCreated(false);
    setSelectedColor(playerColor);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        py: 4
      }}>
        {isPlayerCreated ? (
          <WaitingRoom 
            playerName={playerName} 
            playerColor={playerColor}
            onReset={handleReset}
          />
        ) : (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            alignItems: 'center'
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
                justifyContent: 'center'
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
        )}

        {!isPlayerCreated && (
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleJoinGame}
            disabled={!playerName.trim() || !selectedColor || !!nameError}
            sx={{ mt: 4 }}
          >
            Připojit
          </Button>
        )}
      </Box>
    </Container>
  );
}

export default MobileJoinQuizRoom;