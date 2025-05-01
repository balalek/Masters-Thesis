/**
 * @fileoverview Waiting Room component for mobile players before game start
 * 
 * This component provides:
 * - Player identification with avatar and editable name
 * - Name change functionality with validation
 * - Real-time updates via Socket.IO for game start events
 * - Smooth transition to game screen with proper timing
 * - Player disconnection handling
 * 
 * @module Components/Mobile/ScreensBetweenRounds/WaitingRoom
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, TextField, Button, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { getSocket, getServerTime } from '../../../utils/socket';
import Loading from './Loading';
import { DRAWER_EXTRA_TIME } from '../../../constants/quizValidation';

/**
 * Waiting Room component for pre-game lobby
 * 
 * Provides a waiting area for players before the game starts,
 * with player identification and name editing functionality.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.playerName - Initial player name
 * @param {string} props.playerColor - Player's avatar color
 * @param {Function} props.onReset - Handler for game reset
 * @returns {JSX.Element} The rendered waiting room
 */
function WaitingRoom({ playerName: initialPlayerName, playerColor, onReset }) {
  const navigate = useNavigate();
  const socket = getSocket();
  const [isLoading, setIsLoading] = useState(false);
  const message = "Počkejte, než začne hra.";
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(initialPlayerName);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  /**
   * Handles game start event from server
   * 
   * Calculates appropriate timing for transition to game screen,
   * with special handling for drawer role in drawing games.
   * 
   * @function handleGameStart
   * @param {Object} data - Game start data from server
   */
  const handleGameStart = (data) => {
    setIsLoading(true);
    const now = getServerTime();
    const delay = Math.max(0, data.show_game_at - now);
    
    setTimeout(() => {
      navigate('/mobile-game', { 
        state: { 
          playerName,
          gameData: data,
          teamName: data.team,
          activeTeam: data.active_team,
          role: data.role,
          isDrawer: data.is_drawer
        } 
      });
    }, data.is_drawer ? Math.max(0, delay - DRAWER_EXTRA_TIME) : delay);
  };
  
  /**
   * Handles player name change
   * 
   * Validates the new name, submits change to server,
   * and updates Socket.IO room association.
   * 
   * @function handleNameChange
   */
  const handleNameChange = () => {
    if (newName.trim().length < 3 || newName.trim().length > 16) {
      setSnackbar({
        open: true,
        message: 'Přezdívka musí mít 3 až 16 znaků',
        severity: 'error'
      });
      return;
    }
    
    // Send the name change to the backend
    fetch(`http://${window.location.hostname}:5000/change_name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        old_name: playerName,
        new_name: newName.trim() 
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setSnackbar({
            open: true,
            message: data.error,
            severity: 'error'
          });
        } else {
          setPlayerName(newName.trim());
          setEditingName(false);
          setSnackbar({
            open: true,
            message: 'Jméno bylo úspěšně změněno',
            severity: 'success'
          });
          
          // Tell socket.io to update the room for this player
          socket.emit('player_name_changed', {
            old_name: playerName,
            new_name: newName.trim()
          });
        }
      })
      .catch((error) => {
        console.error('Error changing name:', error);
        setSnackbar({
          open: true,
          message: 'Nastala chyba při změně jména',
          severity: 'error'
        });
      });
  };

  /**
   * Closes snackbar notification
   * 
   * @function handleCloseSnackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  /**
   * Sets up Socket.IO event listeners and page unload handler
   * 
   * Listens for game start and reset events, and sends player
   * leaving notification when page is unloaded.
   */
  useEffect(() => {
    socket.on('game_started_mobile', handleGameStart);
    socket.on('game_reset', () => {
      onReset();  // Call the reset function from parent
    });

    /**
     * Handles page unload event
     * 
     * Sends player leaving notification to server
     * to ensure proper cleanup of player state.
     * 
     * @function handleBeforeUnload
     */
    const handleBeforeUnload = () => {
      socket.emit('player_leaving', { player_name: playerName });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.off('game_reset');
      socket.off('game_started_mobile');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate, playerName, onReset]);

  if (isLoading) return <Loading message={message} />;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      gap: 4 
    }}>
      <Avatar 
        sx={{ 
          width: 100, 
          height: 100, 
          fontSize: 50,
          color: 'white'
        }}
        style={{ backgroundColor: playerColor }}
      >
        {playerName[0].toUpperCase()}
      </Avatar>
      
      {editingName ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            size="small"
            label="Nové jméno"
            variant="outlined"
          />
          <Button 
            variant="contained" 
            onClick={handleNameChange}
            disabled={newName === playerName || !newName.trim()}
          >
            Uložit
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setEditingName(false);
              setNewName(playerName);
            }}
          >
            Zrušit
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" component="h2">
            {playerName}
          </Typography>
          <Button 
            size="small"
            onClick={() => setEditingName(true)}
            startIcon={<EditIcon />}
          >
            Změnit
          </Button>
        </Box>
      )}

      <Typography variant="body1" component="p">
        {message}
      </Typography>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default WaitingRoom;