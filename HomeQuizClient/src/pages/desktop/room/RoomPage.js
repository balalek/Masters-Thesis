/**
 * @fileoverview Room Page component for managing game setup and player assignments
 * 
 * This module provides:
 * - Player joining and team assignment management
 * - Game mode selection (team vs. free-for-all)
 * - Game initialization and starting
 * - Remote display connection management
 * - Captain selection for team mode
 * @author Bc. Martin Baláž
 * @module Pages/Desktop/Room/RoomPage
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { getSocket, getServerTime } from '../../../utils/socket';
import GameCountdown from '../../../components/desktop/miscellaneous/GameCountdown';
import PlayersList from '../../../components/desktop/room/PlayersList';
import TeamMode from '../../../components/desktop/room/TeamMode';
import ConnectionInfo from '../../../components/desktop/room/ConnectionInfo';
import StartGameTooltip from '../../../components/desktop/room/StartGameTooltip';
import RulesModal from '../../../components/desktop/room/RulesModal';

/**
 * Room Page component for setting up and starting games
 * 
 * @component
 * @returns {JSX.Element} The rendered room page component
 */
const RoomPage = () => {
  const location = useLocation();
  const quizId = location.state?.quizId;  // Get quiz ID from navigation state
  const quickPlayConfig = location.state?.quickPlayConfig; // Get quick play configuration from navigation state
  const [players, setPlayers] = useState([]);
  const [blueTeam, setBlueTeam] = useState([]);
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
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();
  
  /**
   * Toggles the visibility of the rules modal
   */
  const toggleRulesModal = () => {
    setShowRules(prev => !prev);
  };

  /**
   * Fetches the server's IP address for connection information.
   */
  useEffect(() => {
    fetch(`/server_ip`)
      .then(response => response.json())
      .then(data => {
        setServerIP(data.ip);
      })
      .catch(error => {
        console.error("Error fetching server IP:", error);
        // Fallback to using the current hostname
        setServerIP(window.location.hostname);
      });
  }, []);

  /**
   * Handles socket event listeners for player management and game state updates.
   * 
   * Sets up listeners for:
   * - Player joining and leaving
   * - Game starting
   * - Remote display connections
   * - Player name changes
   */
  useEffect(() => {
    const socket = getSocket();

    // Ask if the remote display is connected
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

    // Listener for player leaving the room
    socket.on('player_left', (data) => {
      const playerName = data.player_name;
      
      // Update players array if in free-for-all mode
      if (selectedMode === 'freeforall') {
        setPlayers(prev => prev.filter(player => player.name !== playerName));
      } 
      // Update team arrays if in team mode
      else {
        // Remove from blue team if player is there
        setBlueTeam(prev => prev.filter(player => player.name !== playerName));
        
        // Remove from red team if player is there
        setRedTeam(prev => prev.filter(player => player.name !== playerName));
      }
    });

    socket.on('game_started', (data) => {
      setGameData(data);
      setShowCountdown(true); // Show countdown instead of immediate navigation
    });

    // Listen for remote display connection event so we can enable the start game on different screen button
    socket.on('remote_display_connected', () => {
      setIsRemoteDisplayConnected(true);
    });

    socket.on('game_started_remote', () => {
      setIsRemoteGame(true);
    });
    
    socket.on('player_name_changed', (data) => {
      const { old_name, new_name } = data;
      
      // Update players array if in free-for-all mode
      if (selectedMode === 'freeforall') {
        setPlayers(prev => prev.map(player => 
          player.name === old_name ? { ...player, name: new_name } : player
        ));
      } 
      // Update team arrays if in team mode
      else {
        // Update blue team if player is there
        setBlueTeam(prev => prev.map(player => 
          player.name === old_name ? { ...player, name: new_name } : player
        ));
        
        // Update red team if player is there
        setRedTeam(prev => prev.map(player => 
          player.name === old_name ? { ...player, name: new_name } : player
        ));
      }
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('remote_display_connected');
      socket.off('game_started_remote');
      socket.off('player_name_changed');
      socket.off('player_left');
    };
}, [navigate, selectedMode, blueTeam.length, redTeam.length]);

  /**
   * Activates the quiz server when the component mounts.
   */
  useEffect(() => {
    fetch(`http://${window.location.hostname}:5000/activate_quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }, []);
  
  /**
   * Enters fullscreen mode when the component mounts.
   */
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

  /**
   * Initiates game start on the current screen.
   * 
   * Prepares a payload with team assignments and game configuration,
   * then sends it to the server.
   * 
   * @function handleStartGame
   */
  const handleStartGame = () => {
    setStartGameError('');
    
    const payload = {
      isTeamMode: selectedMode === 'team',
      teamAssignments: selectedMode === 'team' ? {
        blue: blueTeam.map(player => player.name),
        red: redTeam.map(player => player.name)
      } : null,
      captainIndices: selectedMode === 'team' ? {
        blue: blueTeamCaptainIndex,
        red: redTeamCaptainIndex
      } : null,
      isRemote: false,
      quizId: quizId
    };

    // Add quick play configuration if present
    if (quickPlayConfig) {
      payload.quick_play_type = quickPlayConfig.quick_play_type;
      
      // Add typesConfig for combined quiz format - definittely
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

  /**
   * Initiates game start on a remote screen.
   * 
   * Similar to handleStartGame but sets isRemote flag to true,
   * allowing the game to be displayed on a connected remote screen.
   * 
   * @function handleStartGameOnAnotherScreen
   */
  const handleStartGameOnAnotherScreen = () => {
    setStartGameError('');
    
    const payload = {
      isTeamMode: selectedMode === 'team',
      teamAssignments: selectedMode === 'team' ? {
        blue: blueTeam.map(player => player.name),
        red: redTeam.map(player => player.name)
      } : null,
      captainIndices: selectedMode === 'team' ? {
        blue: blueTeamCaptainIndex,
        red: redTeamCaptainIndex
      } : null,
      isRemote: true,
      quizId: quizId
    };

    // Add quick play configuration if present
    if (quickPlayConfig) {
      payload.quick_play_type = quickPlayConfig.quick_play_type;
      
      // Add typesConfig for combined quiz format  - definittely
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

  /**
   * Handles switching between team mode and free-for-all mode.
   * 
   * Redistributes players to teams when switching to team mode,
   * and combines teams into a single player list when switching to free-for-all.
   * 
   * @function handleModeChange
   * @param {string} mode - The selected game mode ('team' or 'freeforall')
   */
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
      // Reset captain indices
      setBlueTeamCaptainIndex(0);
      setRedTeamCaptainIndex(0);
      setPlayers([]); // Clear players array when in team mode
    } else if (mode === 'freeforall') {
      // When switching to free-for-all, combine teams into players array
      setPlayers([...blueTeam, ...redTeam]);
      // Clear teams when in free-for-all mode
      setBlueTeam([]);
      setRedTeam([]);
    }
    setSelectedMode(mode);
  };

  /**
   * Handles quiz closure and cleanup.
   * 
   * Exits fullscreen mode, resets the game state on the server,
   * and navigates back to the home page.
   * 
   * @function handleCloseQuiz
   */
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

  /**
   * Moves a player from one team to the other.
   * 
   * Maintains team balance and updates captain indices if needed.
   * 
   * @function handleSwitchTeam
   * @param {string} playerName - Name of the player to switch
   * @param {boolean} isFromBlueTeam - Whether the player is currently on the blue team
   */
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
      if (blueTeam.length >= 5) return;
      if (redTeam.length <= 1) return;
      
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

  /**
   * Directly selects a player as team captain.
   * 
   * @function handleSelectCaptain
   * @param {string} playerName - Name of the player to make captain
   * @param {boolean} isBlueTeam - Whether the player is on the blue team
   */
  const handleSelectCaptain = (playerName, isBlueTeam) => {
    if (isBlueTeam) {
      const newIndex = blueTeam.findIndex(p => p.name === playerName);
      if (newIndex !== -1) setBlueTeamCaptainIndex(newIndex);
    } else {
      const newIndex = redTeam.findIndex(p => p.name === playerName);
      if (newIndex !== -1) setRedTeamCaptainIndex(newIndex);
    }
  };

  /**
   * Generates the URL for players to join the game.
   * 
   * @function getConnectionUrl
   * @returns {string} URL for players to connect to the game
   */
  const getConnectionUrl = () => {
    if (!serverIP) return `http://${window.location.hostname}:3000/play`;
    return `http://${serverIP}:5000/play`; // For .exe app 5000 port
};

  /**
   * Generates the URL for connecting a remote display.
   * 
   * @function getRemoteGameUrl
   * @returns {string} URL for connecting a remote display
   */
  const getRemoteGameUrl = () => {
    if (!serverIP) return `http://${window.location.hostname}:3000/remote`;
    return `http://${serverIP}:5000/remote`; // For .exe app 5000 port
};

  /**
   * Handles completion of the countdown before game start.
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

  return (
    <Box sx={{ padding: 2, position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>      {/* Top buttons */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="info" 
          onClick={toggleRulesModal}
          startIcon={<HelpOutlineIcon />}
        >
          Pravidla
        </Button>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleCloseQuiz}
        >
          Zavřít kvíz
        </Button>
      </Box>
      
      {/* Rules Modal */}
      <RulesModal open={showRules} onClose={toggleRulesModal} />

      {/* Title and mode selection */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        Čekárna {isQuickPlayMode ? `- Rychlá hra` : ""}
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
              onSwitchTeam={handleSwitchTeam}
              onSelectCaptain={handleSelectCaptain}
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