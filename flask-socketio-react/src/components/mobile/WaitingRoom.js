import React, { act, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar } from '@mui/material';
import { getSocket, getServerTime } from '../../utils/socket';
import Loading from './Loading';
import { DRAWER_EXTRA_TIME } from '../../constants/quizValidation';

function WaitingRoom({ playerName, playerColor, onReset }) {
  const navigate = useNavigate();
  const socket = getSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Počkejte, než začne hra.");

  const handleGameStart = (data) => {
    setIsLoading(true);  // Show loading when game starts
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

  useEffect(() => {
    socket.on('game_started_mobile', handleGameStart);
    socket.on('game_reset', () => {
      onReset();  // Call the reset function from parent
    });

    return () => {
      socket.off('game_reset');
      socket.off('game_started_mobile');
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
      <Typography variant="h5" component="h2">
        {playerName}
      </Typography>
      <Typography variant="body1" component="p">
        {message}
      </Typography>
    </Box>
  );
}

export default WaitingRoom;
