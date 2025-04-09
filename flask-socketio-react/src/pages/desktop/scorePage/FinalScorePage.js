import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { getSocket } from '../../../utils/socket';

const FinalScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const isRemote = location.state?.isRemote;

  useEffect(() => {
    // Check if we have the required data
    if (Object.keys(scores).length === 0) {
      console.error('No scores data available');
      navigate('/');
      return;
    }
    console.log('FinalScorePage loaded with scores:', scores);
  }, [scores, navigate]);

  useEffect(() => {
      const socket = getSocket();
  
      socket.on('game_reset', (data) => {
        navigate(data.was_remote ? '/remote' : '/');
      });
  
      return () => {
        socket.off('game_reset');
      };
    }, [navigate]);

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

  if (scores.is_team_mode) {
    const { teams, blue_team, red_team, individual } = scores;
    const sortedTeams = [
      { name: 'Modrý tým', color: '#186CF6', score: teams.blue, players: blue_team },
      { name: 'Červený tým', color: '#EF4444', score: teams.red, players: red_team }
    ].sort((a, b) => b.score - a.score);

    const winningTeam = sortedTeams[0];
    const isTie = sortedTeams[0].score === sortedTeams[1].score;
    const isWinner = winningTeam.score > sortedTeams[1].score;

    return (
      <Box sx={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header with centered title and close button */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 3,
          pr: 8,
          position: 'relative'
        }}>
          <Box sx={{ width: '100px' }} /> {/* Spacer for centering */}
          <Typography variant="h2" sx={{ 
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 'bold'
          }}>
            Finální výsledky
          </Typography>
          {!isRemote && (
            <Button 
              variant="contained"
              onClick={handleCloseQuiz}
              sx={{ zIndex: 1 }}
            >
              Ukončit kvíz
            </Button>
          )}
        </Box>

        {/* Teams Display */}
        <Box sx={{ 
          display: 'flex',
          flex: 1,
          alignItems: 'stretch',
          gap: 4,
          px: 8,
          py: 4
        }}>
          {sortedTeams.map((team, index) => (
            <Box key={team.name} sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.03)',
              borderRadius: 4,
              p: 4,
              position: 'relative',
              border: `3px solid ${team.color}`,
              boxShadow: `0 0 20px ${team.color}20`
            }}>
              {/* Team Name - Now at top */}
              <Typography variant="h2" sx={{ 
                color: team.color,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                mb: 1,
              }}>
                {isTie ? 'REMÍZA' : (index === 0 ? 'Vítězové' : 'Poražení')}
              </Typography>

              {/* Win/Lose Status - Now below team name */}
              {isWinner && (
                <Typography 
                  variant="h4" 
                  sx={{
                    color: team.color,
                    fontWeight: 'bold',
                    letterSpacing: 2,
                    mb: 2,
                    mt: 2
                  }}
                >
                  {team.name}
                </Typography>
              )}

              {/* Score */}
              <Typography variant="h1" sx={{ 
                fontFamily: 'monospace',
                fontSize: '5rem',
                mb: 3,
                color: team.color,
                textShadow: `0 0 20px ${team.color}40`
              }}>
                {team.score}
              </Typography>

              {/* Players List with Avatars */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                alignItems: 'center',
                width: '100%',
                maxWidth: 400
              }}>
                <Typography variant="h6" sx={{ opacity: 0.7, mb: 1 }}>
                  Členové týmu
                </Typography>
                {team.players.map(playerName => (
                  <Box key={playerName} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.03)'
                  }}>
                    <Avatar sx={{
                      bgcolor: individual[playerName]?.color || team.color,
                      width: 40,
                      height: 40,
                      color: 'white'
                    }}>
                      {playerName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6">
                      {playerName}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  const sortedPlayers = Object.entries(scores)
    .sort(([,a], [,b]) => b.score - a.score);

  // Create the podium array (2nd place, 1st place, 3rd place)
  const podium = [];
  if (sortedPlayers.length > 0) podium[1] = sortedPlayers[0]; // 1st place in middle
  if (sortedPlayers.length > 1) podium[0] = sortedPlayers[1]; // 2nd place on left
  if (sortedPlayers.length > 2) podium[2] = sortedPlayers[2]; // 3rd place on right
  
  // Players at positions 4-10
  const remainingPlayers = sortedPlayers.slice(3, 10);
  
  // Check if we only have up to 3 players
  const hasOnlyTopThree = sortedPlayers.length <= 3;

  // Size multipliers based on placement - Increase sizes when only top 3 players
  const baseMultipliers = [0.9, 1, 0.8]; // For 2nd, 1st, 3rd place
  const enlargedMultipliers = [1.2, 1.4, 1.1]; // Enlarged for when only top 3 exist
  const sizeMultipliers = hasOnlyTopThree ? enlargedMultipliers : baseMultipliers;
  const trophyColors = ['#C0C0C0', '#FFD700', '#CD7F32']; // Silver, Gold, Bronze

  return (
    <Box sx={{ 
      height: '100vh', 
      padding: 3, 
      display: 'flex', 
      flexDirection: 'column', 
      width: '100%',
      overflow: 'hidden'
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
        {!isRemote && (
          <Button 
            variant="contained"
            onClick={handleCloseQuiz}
            sx={{ position: 'absolute', right: 0 }}
          >
            Ukončit kvíz
          </Button>
        )}
      </Box>

      {/* Podium - Top Players (2-1-3 arrangement) */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: hasOnlyTopThree ? '10%' : '8%',
        width: '100%',
        px: 4,
        flex: hasOnlyTopThree ? 1.5 : 1, // Give more space when only top 3
      }}>
        {[0, 1, 2].map((position) => {
          const player = podium[position];
          const placement = position === 0 ? 2 : position === 1 ? 1 : 3;
          const sizeMultiplier = sizeMultipliers[position];
          const isEmpty = !player;
          
          return (
            <Box
              key={position}
              sx={{
                width: `${250 * sizeMultiplier}px`,
                height: `${380 * sizeMultiplier}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: hasOnlyTopThree ? 3 : 2,
                opacity: isEmpty ? 0.3 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              {/* Trophy - Bigger when only top 3 */}
              <EmojiEventsIcon 
                sx={{ 
                  fontSize: `${hasOnlyTopThree ? 80 : 60 * sizeMultiplier}px`,
                  color: trophyColors[position],
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))',
                  mb: hasOnlyTopThree ? 2 : 1,
                }} 
              />

              {/* Player Avatar - Bigger when only top 3 */}
              <Avatar
                sx={{
                  width: `${120 * sizeMultiplier}px`,
                  height: `${120 * sizeMultiplier}px`,
                  bgcolor: isEmpty ? 'grey.500' : player[1].color,
                  fontSize: `${3 * sizeMultiplier}rem`,
                  color: 'white',
                  mb: hasOnlyTopThree ? 2 : 1,
                  boxShadow: isEmpty ? 'none' : 
                    hasOnlyTopThree ? 
                    `0 4px 20px ${player?.[1].color}80` : 
                    `0 2px 12px ${player?.[1].color}60`,
                }}
              >
                {isEmpty ? '?' : player[0].charAt(0).toUpperCase()}
              </Avatar>

              {/* Placement and Name */}
              <Typography 
                variant={hasOnlyTopThree ? "h3" : "h4"}
                sx={{ 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: `${(hasOnlyTopThree ? 1.8 : 1.5) * sizeMultiplier}rem`,
                }}
              >
                {isEmpty ? "-" : `${placement}. ${player[0]}`}
              </Typography>

              {/* Score - Bigger when only top 3 */}
              <Typography 
                variant={hasOnlyTopThree ? "h4" : "h5"}
                sx={{ 
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  fontSize: `${(hasOnlyTopThree ? 1.6 : 1.3) * sizeMultiplier}rem`,
                }}
              >
                {isEmpty ? "-" : `${player[1].score} bodů`}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Players 4-10 displayed as a "train" */}
      {remainingPlayers.length > 0 && (
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center', // Center items vertically in the train section
          width: '100%',
          mt: 2,
          mb: 4,
          gap: 0,
          flexWrap: 'wrap',
          flex: 0.5,
        }}>
          {remainingPlayers.map(([playerName, data], index) => (
            <Box
              key={playerName}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center', // Center items vertically within each player card
                width: '220px',
                height: '160px', // Define fixed height
                mb: 2,
              }}
            >
              {/* Player Avatar */}
              <Avatar 
                sx={{ 
                  width: 70, 
                  height: 70, 
                  bgcolor: data.color,
                  fontSize: '1.8rem', 
                  color: 'white',
                  mb: 2,
                  boxShadow: `0 2px 12px ${data.color}60`, // Added glow effect using player color
                }}
              >
                {playerName.charAt(0).toUpperCase()}
              </Avatar>
              
              {/* Placement and Name */}
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  mb: 0.5
                }}
              >
                {index + 4}. {playerName}
              </Typography>
              
              {/* Score */}
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  fontSize: '1.1rem' 
                }}
              >
                {data.score} bodů
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FinalScorePage;