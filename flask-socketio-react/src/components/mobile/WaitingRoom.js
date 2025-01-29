import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar } from '@mui/material';
import { getSocket } from '../../utils/socket';

function WaitingRoom({ playerName, playerColor }) {
  const navigate = useNavigate();
  const socket = getSocket();

  useEffect(() => {
    socket.on('game_started', (data) => {
      navigate('/mobile-game', { state: { playerName } });
    });

    return () => {
      socket.off('game_started');
    };
  }, [navigate, playerName]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 2 
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
        {playerName[0]}
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
