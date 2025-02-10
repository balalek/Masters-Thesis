import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const FinalScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};

  useEffect(() => {
    // Check if we have the required data
    if (Object.keys(scores).length === 0) {
      console.error('No scores data available');
      navigate('/');
      return;
    }
    console.log('FinalScorePage loaded with scores:', scores);
  }, [scores, navigate]);

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

  const sortedPlayers = Object.entries(scores)
    .sort(([,a], [,b]) => b.score - a.score);

  const topThree = sortedPlayers.slice(0, 3);
  const restPlayers = sortedPlayers.slice(3);
  const isSmallGroup = sortedPlayers.length <= 3;

  const trophyColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <Box sx={{ 
      height: '100vh', 
      padding: 3, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      width: '100%' // Ensure full width
    }}>
      {/* Header with title and close button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        mb: 3 
      }}>
        <Typography variant="h3" component="h1" sx={{ textAlign: 'center' }}>
          Finální žebříček
        </Typography>
        <Button 
          variant="contained"
          onClick={handleCloseQuiz}
          sx={{ position: 'absolute', right: 0 }}
        >
          Ukončit kvíz
        </Button>
      </Box>

      {/* Top Players */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: isSmallGroup ? '15%' : '10%',
        mb: 3,
        width: '100%',
        px: 8,
        flex: isSmallGroup ? 1 : 'none', // Take full height if small group
        alignItems: isSmallGroup ? 'center' : 'flex-start'
      }}>
        {topThree.map(([playerName, data], index) => (
          <Box
            key={playerName}
            sx={{
              width: isSmallGroup ? '300px' : '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isSmallGroup ? 3 : 1.5
            }}
          >
            {/* Small Trophy */}
            <EmojiEventsIcon 
              sx={{ 
                fontSize: isSmallGroup ? '60px' : '40px',
                color: trophyColors[index],
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))',
              }} 
            />

            {/* Player Avatar */}
            <Avatar
              sx={{
                width: isSmallGroup ? 120 : 80,
                height: isSmallGroup ? 120 : 80,
                bgcolor: data.color,
                fontSize: isSmallGroup ? '3rem' : '2rem',
                color: 'white'
              }}
            >
              {playerName.charAt(0).toUpperCase()}
            </Avatar>

            {/* Player Name and Score */}
            <Typography 
              variant={isSmallGroup ? "h4" : "h6"}
              sx={{ 
                fontWeight: 'medium',
                textAlign: 'center',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {playerName}
            </Typography>
            <Typography 
              variant={isSmallGroup ? "h3" : "body1"}
              sx={{ 
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}
            >
              {data.score} bodů
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Rest of the Players - only show if there are more than 3 players */}
      {!isSmallGroup && restPlayers.length > 0 && (
        <Container sx={{ maxWidth: '1200px !important', width: '100%' }}>
          {restPlayers.map(([playerName, data], index) => (
            <Box
              key={playerName}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                mb: 1,
                p: 1,
                pr: 2,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 1
              }}
            >
              <Typography variant="h6" sx={{ minWidth: '60px' }}>
                {index + 4}.
              </Typography>
              <Avatar 
                sx={{ 
                  width: 40,
                  height: 40,
                  bgcolor: data.color,
                  fontSize: '1.1rem',
                  color: 'white'
                }}
              >
                {playerName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography 
                variant="h6" 
                sx={{ 
                  flex: 1,
                  ml: 2,
                  textAlign: 'left', // Add this
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {playerName}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  minWidth: '100px',
                  textAlign: 'right',
                  fontSize: '1.3rem',
                  pr: 2
                }}
              >
                {data.score}
              </Typography>
            </Box>
          ))}
        </Container>
      )}

    </Box>
  );
};

export default FinalScorePage;