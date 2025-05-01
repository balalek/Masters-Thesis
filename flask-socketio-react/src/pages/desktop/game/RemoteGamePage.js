/**
 * @fileoverview Remote Game Page component for secondary display functionality
 * 
 * This module provides:
 * - Secondary screen display for quiz games
 * - Socket.IO connection with the main quiz host
 * - Countdown synchronization before game start
 * - Seamless transition to the game screen
 * - Notification of remote display availability to the server
 * 
 * @module Pages/Desktop/Game/RemoteGamePage
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import GameCountdown from '../../../components/desktop/miscellaneous/GameCountdown';
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
  const navigate = useNavigate();

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
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh'
    }}>
      <Typography variant="h4">
        Čekám na spuštění hry...
      </Typography>
    </Box>
  );

};

export default RemoteGamePage;