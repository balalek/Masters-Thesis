/**
 * @fileoverview Remote Game Page component for secondary display functionality
 * 
 * This module provides:
 * - Secondary screen display for quiz games
 * - Socket.IO connection with the main quiz host
 * - Countdown synchronization before game start
 * - Seamless transition to the game screen
 * - Notification of remote display availability to the server
 * - QR code and connection information for players joining
 * @author Bc. Martin Baláž
 * @module Pages/Desktop/Game/RemoteGamePage
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import GameCountdown from '../../../components/desktop/miscellaneous/GameCountdown';
import ConnectionInfo from '../../../components/desktop/room/ConnectionInfo';
import { useNavigate } from 'react-router-dom';

/**
 * Remote Game Page component for secondary displays
 * 
 * @component
 * @returns {JSX.Element} The rendered remote game page component
 */
const RemoteGamePage = () => {
  const [gameData, setGameData] = useState(null);
  const [showCountdown, setShowCountdown] = useState(true);
  const [serverIP, setServerIP] = useState('');
  const navigate = useNavigate();
  // Fetch server IP for connection information
  useEffect(() => {
    fetch(`/server_ip`)
      .then(response => response.json())
      .then(data => {
        setServerIP(data.ip);
      })
      .catch(error => {
        console.error("Error fetching server IP:", error);
        // Fallback to using the current hostname
        setServerIP(window.location.hostname);
      });
  }, []);

  // Send information about connected remote display and listen for game start event
  useEffect(() => {
    const socket = getSocket();

    // Send information about connected remote display to the server on mount
    socket.emit('remote_display_connected');

    socket.on('game_started_remote', (data) => {
      setGameData(data);
      setShowCountdown(true);
    });

    // If asked by the server, send back confirmation of remote display connection
    socket.on('is_remote_connected', () => {
      socket.emit('remote_display_connected');
    });

    return () => {
      socket.off('game_started_remote');
      socket.off('is_remote_connected');
    };
  }, []);
  /**
   * Generates the URL for players to connect to the game
   * 
   * @function getConnectionUrl
   * @returns {string} URL for players to connect to the game
   */
  const getConnectionUrl = () => {
    if (!serverIP) return `http://${window.location.hostname}:3000/play`;
    return `http://${serverIP}:5000/play`; // For .exe app 5000 port
  };

  /**
   * Handles completion of the countdown before game start
   * 
   * Calculates timing values for synchronization with the server,
   * then navigates to the game screen with the necessary state.
   * 
   * @function handleCountdownComplete
   */
  const handleCountdownComplete = () => {
      const current_time = getServerTime();
      // Use game_time to track how long after the game start we are
      const game_time = gameData.show_game_at - current_time;
      // Add game_time to ensure synchronization with server
      const question_end_time = current_time + (gameData.question.length * 1000) + game_time;
  
      navigate('/game', { 
        state: { 
          question: gameData.question,
          showGameAt: gameData.show_game_at,
          question_end_time: question_end_time,
          is_last_question: gameData.is_last_question,
          activeTeam: gameData.active_team,
          blind_map_is_team_play: gameData.blind_map_is_team_play
        } 
      });
    };

  if (showCountdown && gameData) {
    return <GameCountdown 
      onCountdownComplete={handleCountdownComplete}
      showAt={gameData.show_first_question_preview}
    />;
  }
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      gap: 4
    }}>
      <Typography variant="h4">
        Čeká se na spuštění hry...
      </Typography>
      
      {/* Connection info with QR code */}
      <ConnectionInfo connectionUrl={getConnectionUrl()} />
    </Box>
  );

};

export default RemoteGamePage;