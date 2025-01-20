import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';

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
    fetch('http://localhost:5000/start_game', {
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

  return (
    <div>
      <h1>Room</h1>
      <h2>Players:</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player}</li>
        ))}
      </ul>
      <p>Waiting for the game to start...</p>
      <button onClick={handleStartGame}>Start Game</button>
    </div>
  );
};

export default RoomPage;