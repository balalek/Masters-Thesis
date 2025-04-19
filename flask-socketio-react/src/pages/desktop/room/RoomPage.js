import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import GameCountdown from '../../../components/desktop/GameCountdown';
import PlayersList from '../../../components/desktop/room/PlayersList';
import TeamMode from '../../../components/desktop/room/TeamMode';
import ConnectionInfo from '../../../components/desktop/room/ConnectionInfo';
import StartGameTooltip from '../../../components/desktop/room/StartGameTooltip';
import { QUIZ_TYPES, QUIZ_TYPE_TRANSLATIONS } from '../../../constants/quizValidation';

const RoomPage = () => {
  const location = useLocation();
  const quizId = location.state?.quizId;  // Get quiz ID from navigation state
  // Get quick play configuration
  const quickPlayConfig = location.state?.quickPlayConfig;
  
  const [players, setPlayers] = useState([]); // Add back players state
  const [blueTeam, setBlueTeam] = useState([]); // Store teams directly
  const [redTeam, setRedTeam] = useState([]);
  const [selectedMode, setSelectedMode] = useState('freeforall');
  const [blueTeamCaptainIndex, setBlueTeamCaptainIndex] = useState(0);
  const [redTeamCaptainIndex, setRedTeamCaptainIndex] = useState(0);
  const [startGameError, setStartGameError] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [isRemoteDisplayConnected, setIsRemoteDisplayConnected] = useState(false);
  const [isRemoteGame, setIsRemoteGame] = useState(false);
  const [serverIP, setServerIP] = useState('');
  const [serverPort, setServerPort] = useState('');
  const navigate = useNavigate();

  // Get server IP address on component mount
  useEffect(() => {
    fetch(`/server_ip`)
      .then(response => response.json())
      .then(data => {
        setServerIP(data.ip);
        setServerPort(data.port || location.port || '5000');
        console.log("Server IP address:", data.ip);
      })
      .catch(error => {
        console.error("Error fetching server IP:", error);
        // Fallback to using the current hostname
        setServerIP(window.location.hostname);
        setServerPort(location.port || '5000');
      });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // ask if the remote display is connected
    socket.emit('is_remote_connected');

    socket.on('player_joined', (data) => {
      const player = { name: data.player_name, color: data.color };
      
      if (selectedMode === 'team') {
        // First player always goes to blue team
        if (blueTeam.length === 0 && redTeam.length === 0) {
          setBlueTeam(prev => [...prev, player]);
        }
        // Distribute to team with fewer players
        else if (blueTeam.length > redTeam.length && redTeam.length < 5) {
          setRedTeam(prev => [...prev, player]);
        }
        // If red team has more or equal players, add to blue (if not full)
        else if (blueTeam.length < 5) {
          setBlueTeam(prev => [...prev, player]);
        }
        // If both teams are full, player won't be added
      } else {
        setPlayers(prev => [...prev, player]);
      }
    });

    socket.on('game_started', (data) => {
      setGameData(data); // Store the game data
      setShowCountdown(true); // Show countdown instead of immediate navigation
    });

    // Listen for remote display connection event so we can enable the start game on different screen button
    socket.on('remote_display_connected', () => {
      setIsRemoteDisplayConnected(true);
    });

    socket.on('game_started_remote', () => {
      setIsRemoteGame(true);
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('remote_display_connected');
      socket.off('game_started_remote');
    };
  }, [navigate, selectedMode, blueTeam.length, redTeam.length]);

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
    setStartGameError('');
    
    const payload = {
      isTeamMode: selectedMode === 'team',
      teamAssignments: selectedMode === 'team' ? {
        blue: blueTeam.map(player => player.name),
        red: redTeam.map(player => player.name)
      } : null,
      // Add captain indices to the payload
      captainIndices: selectedMode === 'team' ? {
        blue: blueTeamCaptainIndex,
        red: redTeamCaptainIndex
      } : null,
      isRemote: false,
      quizId: quizId  // Add quiz ID to payload
    };

    // Add quick play configuration if present
    if (quickPlayConfig) {
      payload.quick_play_type = quickPlayConfig.quick_play_type;
      
      // Add typesConfig for combined quiz format
      if (quickPlayConfig.typesConfig) {
        payload.typesConfig = quickPlayConfig.typesConfig;
      }
    }

    fetch(`http://${window.location.hostname}:5000/start_game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.error) setStartGameError(data.error);
      })
      .catch((error) => {
        console.error('Error starting game:', error);
        setStartGameError('Chyba při spouštění hry');
      });
  };

  const handleStartGameOnAnotherScreen = () => {
    setStartGameError('');
    
    const payload = {
      isTeamMode: selectedMode === 'team',
      teamAssignments: selectedMode === 'team' ? {
        blue: blueTeam.map(player => player.name),
        red: redTeam.map(player => player.name)
      } : null,
      // Add captain indices to the payload
      captainIndices: selectedMode === 'team' ? {
        blue: blueTeamCaptainIndex,
        red: redTeamCaptainIndex
      } : null,
      isRemote: true,
      quizId: quizId  // Add quiz ID to payload
    };

    // Add quick play configuration if present
    if (quickPlayConfig) {
      payload.quick_play_type = quickPlayConfig.quick_play_type;
      
      // Add typesConfig for combined quiz format
      if (quickPlayConfig.typesConfig) {
        payload.typesConfig = quickPlayConfig.typesConfig;
      }
    }

    fetch(`http://${window.location.hostname}:5000/start_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) setStartGameError(data.error);
    })
    .catch((error) => {
      console.error('Error starting game:', error);
      setStartGameError('Chyba při spouštění hry');
    });
  };

  const handleModeChange = (mode) => {
    if (mode === 'team' && selectedMode === 'freeforall') {
      // Initialize teams when switching to team mode
      const initialTeams = players.reduce((acc, player) => {
        if (acc.blue.length <= acc.red.length && acc.blue.length < 5) {
          acc.blue.push(player);
        } else if (acc.red.length < 5) {
          acc.red.push(player);
        }
        return acc;
      }, { blue: [], red: [] });
      
      setBlueTeam(initialTeams.blue);
      setRedTeam(initialTeams.red);
      setBlueTeamCaptainIndex(0); // Reset captain indices
      setRedTeamCaptainIndex(0);
      setPlayers([]); // Clear players array when in team mode
    } else if (mode === 'freeforall') {
      // When switching to free-for-all, combine teams into players array
      setPlayers([...blueTeam, ...redTeam]);
      setBlueTeam([]); // Clear teams when in free-for-all mode
      setRedTeam([]);
    }
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

  const handleSwitchTeam = (playerName, isFromBlueTeam) => {
    if (isFromBlueTeam) {
      if (redTeam.length >= 5) return; // Check target team capacity
      if (blueTeam.length <= 1) return; // Ensure source team not empty
      
      const playerIndex = blueTeam.findIndex(p => p.name === playerName);
      const player = blueTeam[playerIndex];
      
      // Update blue team captain index if needed
      if (playerIndex <= blueTeamCaptainIndex) {
        // If removing player before or at captain position, shift captain index up
        setBlueTeamCaptainIndex(prev => Math.max(0, prev - 1));
      }
      
      setBlueTeam(prev => prev.filter(p => p.name !== playerName));
      setRedTeam(prev => [...prev, player]);
    } else {
      if (blueTeam.length >= 5) return; // Check target team capacity
      if (redTeam.length <= 1) return; // Ensure source team not empty
      
      const playerIndex = redTeam.findIndex(p => p.name === playerName);
      const player = redTeam[playerIndex];
      
      // Update red team captain index if needed
      if (playerIndex <= redTeamCaptainIndex) {
        // If removing player before or at captain position, shift red team captain index up
        setRedTeamCaptainIndex(prev => Math.max(0, prev - 1));
      }
      
      setRedTeam(prev => prev.filter(p => p.name !== playerName));
      setBlueTeam(prev => [...prev, player]);
    }
  };

  const handleSelectCaptain = (playerName, isBlueTeam) => {
    if (isBlueTeam) {
      const newIndex = blueTeam.findIndex(p => p.name === playerName);
      if (newIndex !== -1) setBlueTeamCaptainIndex(newIndex);
    } else {
      const newIndex = redTeam.findIndex(p => p.name === playerName);
      if (newIndex !== -1) setRedTeamCaptainIndex(newIndex);
    }
  };

  // Get connection URLs using the serverIP and port
  const getConnectionUrl = () => {
    if (!serverIP) return `http://${window.location.hostname}:3000/play`;
    return `http://${serverIP}:5000/play`; // For .exe app 5000 port
};

  const getRemoteGameUrl = () => {
    if (!serverIP) return `http://${window.location.hostname}:3000/remote`;
    return `http://${serverIP}:5000/remote`; // For .exe app 5000 port
};

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
        blind_map_is_team_play: selectedMode === 'team'
      } 
    });
  };

  if (showCountdown) {
    return <GameCountdown 
      onCountdownComplete={handleCountdownComplete}
      showAt={gameData.show_first_question_preview}
    />;
  }

  if (isRemoteGame) {
    return (
      <Box sx={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4
      }}>
        <Typography variant="h4" sx={{ textAlign: 'center' }}>
          Hra právě probíhá na jiné obrazovce
        </Typography>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleCloseQuiz}
          size="large"
        >
          Ukončit kvíz
        </Button>
      </Box>
    );
  }

  // Check if we're in a quick play mode to display the appropriate UI
  const isQuickPlayMode = !!quickPlayConfig;
  const quickPlayType = quickPlayConfig?.quick_play_type;

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
        Čekárna {isQuickPlayMode ? `- ${QUIZ_TYPE_TRANSLATIONS[quickPlayType] || "Rychlá hra"}` : ""}
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

      {/* Captain explanation text - only show in team mode */}
      {selectedMode === 'team' && (
        <Typography 
          variant="body2" 
          sx={{ 
            textAlign: 'center', 
            mb: 2,
            fontStyle: 'italic',
            color: 'text.secondary'
          }}
        >
          ⭐ Označuje kapitána týmu
        </Typography>
      )}

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
              onSwitchTeam={handleSwitchTeam}
              onSelectCaptain={handleSelectCaptain} // Add this prop
            />
          )}
        </Box>

        {/* Connection info - will be centered between table and buttons */}
        <ConnectionInfo connectionUrl={getConnectionUrl()} />

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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button variant="contained" onClick={handleStartGame} sx={{ width: '300px' }}>
              Spustit zde
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                variant="contained" 
                onClick={handleStartGameOnAnotherScreen} 
                sx={{ width: '300px' }}
                disabled={!isRemoteDisplayConnected}
              >
                Spustit na jiné obrazovce
              </Button>
              <StartGameTooltip gameUrl={getRemoteGameUrl()} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RoomPage;