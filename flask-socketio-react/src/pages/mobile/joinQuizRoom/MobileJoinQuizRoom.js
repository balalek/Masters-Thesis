import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';

function MobileJoinQuizRoom() {
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();

    socket.on('game_started', (data) => {
      navigate('/mobile-game', { state: { playerName } });
    });

    return () => {
      socket.off('game_started');
    };
  }, [navigate, playerName]);

  const handleJoinGame = () => {
    if (!playerName.trim()) return;

    fetch('http://localhost:5000/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: playerName }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) {
          const socket = getSocket();
          socket.emit('join', { player_name: playerName });
        } else {
          console.error(data.error);
        }
      })
      .catch((error) => console.error('Error joining game:', error));
  };

  return (
    <div>
      <h1>Join the Quiz</h1>
      <input
        type="text"
        placeholder="Enter Your Name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <button onClick={handleJoinGame}>Join Game</button>
    </div>
  );
}

export default MobileJoinQuizRoom;