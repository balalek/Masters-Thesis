import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import { Box, Button, Typography, Container, Avatar } from '@mui/material';
import CaptainIcon from '@mui/icons-material/Star';
import { QRCodeSVG } from 'qrcode.react';
import GameCountdown from '../../../components/desktop/GameCountdown';

const RoomPage = () => {
  const [players, setPlayers] = useState([]);
  const [selectedMode, setSelectedMode] = useState('freeforall'); // Default to 'freeforall' mode
  const [blueTeamCaptainIndex, setBlueTeamCaptainIndex] = useState(0);
  const [redTeamCaptainIndex, setRedTeamCaptainIndex] = useState(0);
  const [startGameError, setStartGameError] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameData, setGameData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  const renderPlayers = (teamPlayers, captainIndex) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
      {teamPlayers.map((player, index) => (
        <Box 
          key={index} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            width: '100%'
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: player.color,
              color: 'white',
              flexShrink: 0 // Prevent avatar from shrinking
            }}
          >
            {player.name[0].toUpperCase()}
          </Avatar>
          <Typography 
            sx={{ 
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0, // This is important for text truncation to work
              textAlign: 'left' // Align text to the left
            }}
          >
            {player.name}
          </Typography>
          {index === captainIndex && (
            <CaptainIcon sx={{ color: 'gold', flexShrink: 0 }} />
          )}
        </Box>
      ))}
    </Box>
  );

  const { blueTeam, redTeam } = distributePlayers(players);

  const connectionUrl = `http://192.168.0.102:3000/play`;

  const handleCountdownComplete = () => {
    navigate('/game', { 
      state: { 
        question: gameData.question,
        showGameAt: gameData.show_game_at, // Pass the timestamp to GamePage
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
    <Box sx={{ 
      padding: 2, 
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
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
          sx={{ width: '150px'}}
        >
          Týmový režim
        </Button>
        <Button
          variant={selectedMode === 'freeforall' ? 'contained' : 'outlined'}
          onClick={() => handleModeChange('freeforall')}
          sx={{ width: '150px',}}
        >
          Všichni proti všem
        </Button>
      </Box>

      {/* Main content area - centered with fixed minimum height */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        flex: 1,
        minHeight: '500px', // Ensure minimum height for content
        maxWidth: '1200px', // Limit maximum width
        margin: '0 auto',   // Center horizontally
        mb: 2              // Space before bottom buttons
      }}>
        {/* Game mode content */}
        {selectedMode === 'freeforall' ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            mt: 2 
          }}>
            {/* Players container */}
            <Container sx={{ 
              border: '2px solid grey',
              borderRadius: 2,
              padding: 2,
              width: '500px !important',
              minHeight: '375px',
              position: 'relative'
            }}>
              <Typography 
                variant="h6" 
                component="h2" 
                align="center"
                sx={{ mb: 1 }}
              >
                Hráči
              </Typography>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: '1px', 
                  backgroundColor: 'grey.400',
                  mb: 3
                }} 
              />
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
              }}>
                {/* Left column */}
                <Box sx={{ flex: 1 }}>
                  {distributePlayers(players).blueTeam.map((player, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: player.color,
                        color: 'white'
                      }}>
                        {player.name[0].toUpperCase()}
                      </Avatar>
                      <Typography>{player.name}</Typography>
                    </Box>
                  ))}
                </Box>
                {/* Right column */}
                <Box sx={{ flex: 1 }}>
                  {distributePlayers(players).redTeam.map((player, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: player.color,
                        color: 'white'
                      }}>
                        {player.name[0]}
                      </Avatar>
                      <Typography>{player.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Container>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            mt: 2 
          }}>
            {/* Teams container wrapper */}
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              maxWidth: '600px', // Limit max width to keep containers close
              margin: '0 auto'   // Center the wrapper
            }}>
              {/* Blue Team Container with button */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Container sx={{ 
                  border: '2px solid blue',
                  borderRadius: 2,
                  padding: 2,
                  width: '250px !important',
                  minHeight: '375px',
                  position: 'relative',
                  margin: 0  // Remove default Container margins
                }}>
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    align="center"
                    sx={{ mb: 1 }}
                  >
                    Modrý tým
                  </Typography>
                  <Box 
                    sx={{ 
                      width: '100%', 
                      height: '1px', 
                      backgroundColor: 'blue',
                      mb: 3
                    }} 
                  />
                  {renderPlayers(blueTeam, blueTeamCaptainIndex)}
                </Container>
                <Button 
                  variant="contained" 
                  onClick={handleChangeBlueTeamCaptain}
                  sx={{ width: '100%' }}
                >
                  Změnit kapitána
                </Button>
              </Box>

              {/* Red Team Container with button */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Container sx={{ 
                  border: '2px solid red',
                  borderRadius: 2,
                  padding: 2,
                  width: '250px !important',
                  minHeight: '375px',
                  position: 'relative',
                  margin: 0  // Remove default Container margins
                }}>
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    align="center"
                    sx={{ mb: 1 }}
                  >
                    Červený tým
                  </Typography>
                  <Box 
                    sx={{ 
                      width: '100%', 
                      height: '1px', 
                      backgroundColor: 'red',
                      mb: 3
                    }} 
                  />
                  {renderPlayers(redTeam, redTeamCaptainIndex)}
                </Container>
                <Button 
                  variant="contained" 
                  onClick={handleChangeRedTeamCaptain}
                  sx={{ width: '100%' }}
                >
                  Změnit kapitána
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Connection info section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: '100%',
          mt: -1,
          pt: 2          // Padding from content above
        }}>
          {/* Left - QR Code */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              QR kód pro připojení:
            </Typography>
            <QRCodeSVG value={connectionUrl} size={128} />
          </Box>

          {/* Divider with "Nebo" text */}
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%'
          }}>
            <Box sx={{ 
              width: '1px', 
              height: '40%', 
              backgroundColor: 'grey.400' 
            }} />
            <Typography sx={{ my: 2 }}>
              Nebo
            </Typography>
            <Box sx={{ 
              width: '1px', 
              height: '40%', 
              backgroundColor: 'grey.400' 
            }} />
          </Box>

          {/* Right - Connection URL */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Adresa pro připojení:
            </Typography>
            <Typography>
              {connectionUrl}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Bottom buttons */}
      <Box sx={{ 
        mt: 'auto',
        pb: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'background.default',
      }}>
        {startGameError && players.length < 2 && (
          <Typography color="error" sx={{ mb: 1 }}>
            {startGameError}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleStartGame}
            sx={{ width: '300px' }}
          >
            Spustit zde
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleStartGameOnAnotherScreen}
            sx={{ width: '300px' }}
          >
            Spustit na jiné obrazovce
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default RoomPage;