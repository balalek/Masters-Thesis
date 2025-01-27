import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import { Box, Button, Typography } from '@mui/material';

const RoomPage = () => {
  const [players, setPlayers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();

    socket.on('player_joined', (data) => {
      setPlayers((prevPlayers) => [...prevPlayers, data.player_name]);
    });

    socket.on('game_started', (data) => {
      navigate('/game', { state: { question: data.question, isLastQuestion: false } });
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
    };
  }, [navigate]);

  const handleStartGame = () => {
    fetch(`http://${window.location.hostname}:5000/start_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === 'Game started') {
          const socket = getSocket();
          socket.emit('start_game');
        } else {
          console.error(data.error);
        }
      })
      .catch((error) => console.error('Error starting game:', error));
  };

  const handleCloseQuiz = () => {
    fetch(`http://${window.location.hostname}:5000/reset_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        navigate('/');
      })
      .catch((error) => {
        console.error('Error resetting game:', error);
      });
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Room
      </Typography>
      <Typography variant="h6" component="h2" gutterBottom>
        Players:
      </Typography>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player}</li>
        ))}
      </ul>
      <Typography sx={{ marginBottom: 2 }}>
        Waiting for the game to start...
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" color="primary" onClick={handleStartGame}>
          Start Game
        </Button>
        <Button variant="contained" color="error" onClick={handleCloseQuiz}>
          Close Quiz
        </Button>
      </Box>
    </Box>
  );
};

export default RoomPage;