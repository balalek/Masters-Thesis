import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import GameCountdown from '../../../components/desktop/miscellaneous/GameCountdown';
import { useNavigate } from 'react-router-dom';

const RemoteGamePage = () => {
  const [gameData, setGameData] = useState(null);
  const [showCountdown, setShowCountdown] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    
    // Send connection event when remote display loads
    socket.emit('remote_display_connected');

    socket.on('game_started_remote', (data) => {
      setGameData(data);
      setShowCountdown(true);
    });

    socket.on('is_remote_connected', () => {
      socket.emit('remote_display_connected');
    });

    return () => {
      socket.off('game_started_remote');
    };
  }, []);

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
          isLastQuestion: false,
          quizPhase: gameData.quiz_phase,
          activeTeam: gameData.active_team
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
