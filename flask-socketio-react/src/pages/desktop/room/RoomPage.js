import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import GameCountdown from '../../../components/desktop/GameCountdown';
import PlayersList from '../../../components/desktop/room/PlayersList';
import TeamMode from '../../../components/desktop/room/TeamMode';
import ConnectionInfo from '../../../components/desktop/room/ConnectionInfo';

const RoomPage = () => {
  const [players, setPlayers] = useState([]);
  const [selectedMode, setSelectedMode] = useState('freeforall'); // Default to 'freeforall' mode
  const [blueTeamCaptainIndex, setBlueTeamCaptainIndex] = useState(0);
  const [redTeamCaptainIndex, setRedTeamCaptainIndex] = useState(0);
  const [startGameError, setStartGameError] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameData, setGameData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();

    socket.on('player_joined', (data) => {
      setPlayers((prevPlayers) => [...prevPlayers, { name: data.player_name, color: data.color }]);
    });

    socket.on('game_started', (data) => {
      setGameData(data); // Store the game data
      setShowCountdown(true); // Show countdown instead of immediate navigation
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
    };
  }, [navigate]);

  // Activate quiz when component mounts so players can join
  useEffect(() => {
    fetch(`http://${window.location.hostname}:5000/activate_quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }, []);

  /* TODO Uncomment this code after the app is done
  // Enter fullscreen mode on component mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          await document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
          await document.documentElement.msRequestFullscreen();
        }
      } catch (error) {
        console.warn('Failed to enter fullscreen:', error);
      }
    };

    enterFullscreen();
  }, []);
  */

  const handleStartGame = () => {
    setStartGameError(''); // Clear any previous error
    fetch(`http://${window.location.hostname}:5000/start_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === 'Game started') {
          const socket = getSocket();
          socket.emit('start_game'); // What is this for? TODO: Find out
        } else if (data.error) {
          setStartGameError(data.error);
        }
      })
      .catch((error) => {
        console.error('Error starting game:', error);
        setStartGameError('Chyba při spouštění hry');
      });
  };

  const handleStartGameOnAnotherScreen = () => {
   //TODO: Implement this function
  }

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
  };

  const handleCloseQuiz = () => {
    // Exit fullscreen before closing
    const exitFullscreen = async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.warn('Error exiting fullscreen:', error);
      }
    };

    // First exit fullscreen, then reset game and navigate
    exitFullscreen().then(() => {
      fetch(`http://${window.location.hostname}:5000/reset_game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((response) => response.json())
        .then(() => {
          navigate('/');
        })
        .catch((error) => console.error('Error resetting game:', error));
    });
  };

  const handleChangeBlueTeamCaptain = () => {
    setBlueTeamCaptainIndex((prevIndex) => (prevIndex + 1) % Math.min(players.length, 5));
  };

  const handleChangeRedTeamCaptain = () => {
    setRedTeamCaptainIndex((prevIndex) => (prevIndex + 1) % Math.max(players.length - 5, 0));
  };

  const distributePlayers = (players) => {
    const blueTeam = [];
    const redTeam = [];
    players.forEach((player, index) => {
      if (index % 2 === 0) {
        blueTeam.push(player);
      } else {
        redTeam.push(player);
      }
    });
    return { blueTeam, redTeam };
  };

  const { blueTeam, redTeam } = distributePlayers(players);

  const connectionUrl = `http://192.168.0.102:3000/play`;

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
        isLastQuestion: false 
      } 
    });
  };

  if (showCountdown) {
    return <GameCountdown 
      onCountdownComplete={handleCountdownComplete}
      showAt={gameData.show_first_question_preview}
    />;
  }

  return (
    <Box sx={{ padding: 2, position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Close button */}
      <Button 
        variant="contained" 
        color="error" 
        onClick={handleCloseQuiz}
        sx={{ position: 'absolute', top: 16, right: 16 }}
      >
        Zavřít kvíz
      </Button>

      {/* Title and mode selection */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        Čekárna
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2, mt: 1 }}>
        <Button
          variant={selectedMode === 'team' ? 'contained' : 'outlined'}
          onClick={() => handleModeChange('team')}
          sx={{ width: '150px' }}
        >
          Týmový režim
        </Button>
        <Button
          variant={selectedMode === 'freeforall' ? 'contained' : 'outlined'}
          onClick={() => handleModeChange('freeforall')}
          sx={{ width: '150px' }}
        >
          Všichni proti všem
        </Button>
      </Box>

      {/* Main content with flexible spacing */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '2vh', // Use viewport height for consistent spacing
      }}>
        {/* Players/Teams list */}
        <Box>
          {selectedMode === 'freeforall' ? (
            <PlayersList players={players} />
          ) : (
            <TeamMode 
              blueTeam={blueTeam}
              redTeam={redTeam}
              blueTeamCaptainIndex={blueTeamCaptainIndex}
              redTeamCaptainIndex={redTeamCaptainIndex}
              onChangeBlueTeamCaptain={handleChangeBlueTeamCaptain}
              onChangeRedTeamCaptain={handleChangeRedTeamCaptain}
            />
          )}
        </Box>

        {/* Connection info - will be centered between table and buttons */}
        <ConnectionInfo connectionUrl={connectionUrl} />

        {/* Bottom buttons */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 2
        }}>
          {startGameError && players.length < 2 && (
            <Typography color="error" sx={{ mb: 1 }}>{startGameError}</Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={handleStartGame} sx={{ width: '300px' }}>
              Spustit zde
            </Button>
            <Button variant="contained" onClick={handleStartGameOnAnotherScreen} sx={{ width: '300px' }}>
              Spustit na jiné obrazovce
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RoomPage;