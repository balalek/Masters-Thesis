import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import { Box, Button, Typography, Container, Avatar } from '@mui/material';
import CaptainIcon from '@mui/icons-material/Star';
import { QRCodeSVG } from 'qrcode.react';

const RoomPage = () => {
  const [players, setPlayers] = useState([]);
  const [selectedMode, setSelectedMode] = useState('freeforall'); // Default to 'freeforall' mode
  const [blueTeamCaptainIndex, setBlueTeamCaptainIndex] = useState(0);
  const [redTeamCaptainIndex, setRedTeamCaptainIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();

    socket.on('player_joined', (data) => {
      setPlayers((prevPlayers) => [...prevPlayers, { name: data.player_name, color: data.color }]);
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

  const handleStartGameOnAnotherScreen = () => {
   //TODO: Implement this function
  }

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {teamPlayers.map((player, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ 
            bgcolor: player.color,
            color: 'white'
          }}>
            {player.name[0]}
          </Avatar>
          <Typography>{player.name}</Typography>
          {index === captainIndex && <CaptainIcon sx={{ color: 'gold' }} />}
        </Box>
      ))}
    </Box>
  );

  const { blueTeam, redTeam } = distributePlayers(players);

  const connectionUrl = `http://192.168.0.102:3000/play`;

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
                gap: 4
              }}>
                {/* Left column */}
                <Box sx={{ flex: 1 }}>
                  {distributePlayers(players).blueTeam.map((player, index) => (
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
        justifyContent: 'center',
        gap: 2,
        backgroundColor: 'background.default',
      }}>
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
  );
};

export default RoomPage;