import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar } from '@mui/material';
import { getSocket, getServerTime } from '../../utils/socket';
import Loading from './Loading';

function WaitingRoom({ playerName, playerColor }) {
  const navigate = useNavigate();
  const socket = getSocket();
  const [isLoading, setIsLoading] = useState(false);

  const handleGameStart = (data) => {
    setIsLoading(true);  // Show loading when game starts
    const now = getServerTime();
    const delay = Math.max(0, data.show_game_at - now);
    
    setTimeout(() => {
      console.log('Navigating to game');
      navigate('/mobile-game', { 
        state: { 
          playerName,
          gameData: data 
        } 
      });
    }, delay);
  };

  useEffect(() => {
    socket.on('game_started', handleGameStart);
    socket.on('game_started_remote', handleGameStart);

    return () => {
      socket.off('game_started');
      socket.off('game_started_remote');
    };
  }, [navigate, playerName]);

  if (isLoading) return <Loading />;

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
        Počkejte, než začne hra.
      </Typography>
    </Box>
  );
}

export default WaitingRoom;
