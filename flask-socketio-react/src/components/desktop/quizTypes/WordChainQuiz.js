import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  LinearProgress,
  Divider,
  Chip
} from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';

/**
 * Component to display a Word Chain quiz game
 */
const WordChainQuiz = ({ question, question_end_time }) => {
  const [wordChain, setWordChain] = useState([]);
  const [currentLetter, setCurrentLetter] = useState(question?.first_letter || '');
  const [currentPlayer, setCurrentPlayer] = useState(question?.current_player || '');
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [playerTimers, setPlayerTimers] = useState(() => {
    // Initialize playerTimers from question if available - all players get the same timer
    if (question?.players) {
      const initialTimers = {};
      const timerValue = question.length * 1000; // Same timer value for everyone
      Object.keys(question.players).forEach(playerName => {
        initialTimers[playerName] = timerValue;
      });
      return initialTimers;
    }
    return {};
  });
  
  const [scores, setScores] = useState(() => {
    // Initialize scores from the players data in the question
    if (question?.players) {
      const initialScores = { individual: {} };
      Object.entries(question.players).forEach(([playerName, playerData]) => {
        initialScores.individual[playerName] = {
          score: playerData.score || 0,
          color: playerData.color
        };
      });
      return initialScores;
    }
    return {};
  });
  const [isTeamMode, setIsTeamMode] = useState(question?.is_team_mode || false);
  const [bombTime, setBombTime] = useState(null);
  const [bombTicking, setBombTicking] = useState(false);

  // New state for tracking timer status
  const [activeTimer, setActiveTimer] = useState(question?.current_player || null);
  const [isPaused, setIsPaused] = useState(false);
  const timerIntervalRef = useRef(null);
  const lastTickTimeRef = useRef(getServerTime());

  // Add ref for auto-scrolling
  const wordChainContainerRef = useRef(null);
  
  const [gameSpecificPoints, setGameSpecificPoints] = useState({});

  // Initialize with first word if provided in the question
  useEffect(() => {
    if (question?.first_word && wordChain.length === 0) {
      setWordChain([{
        word: question.first_word,
        player: 'system',
        team: null
      }]);
      setCurrentLetter(question.first_letter || '');
      console.log("Initialized word chain with:", question.first_word, "and letter:", question.first_letter);
    }
  }, [question, wordChain.length]);

  // Auto-scroll to bottom when wordChain updates
  useEffect(() => {
    if (wordChainContainerRef.current && wordChain.length > 0) {
      const container = wordChainContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [wordChain]);

  // Main socket effect with proper timer management
  useEffect(() => {
    const socket = getSocket();

    // Handle timer for initial player
    if (currentPlayer && !timerIntervalRef.current) {
      lastTickTimeRef.current = getServerTime();
      startTimeForPlayer(currentPlayer);
    }

    socket.on('word_chain_update', (data) => {
      console.log('word_chain_update received:', {
        newCurrentPlayer: data.current_player,
        currentPlayer,
        timerExists: !!timerIntervalRef.current
      });
      
      // Update state
      setWordChain(data.word_chain || []);
      setCurrentLetter(data.current_letter || '');
      setEliminatedPlayers(data.eliminated_players || []);
      setScores(data.scores || {});
      
      // Track game-specific points if available
      if (data.game_points) {
        setGameSpecificPoints(data.game_points);
      }
      
      const newCurrentPlayer = data.current_player || '';
      
      // Handle player change and timer management
      if (newCurrentPlayer !== currentPlayer) {
        // Stop current timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        // Update states
        setCurrentPlayer(newCurrentPlayer);
        setActiveTimer(newCurrentPlayer);
        lastTickTimeRef.current = getServerTime();
        
        // Start timer for new player
        startTimeForPlayer(newCurrentPlayer);
      }
    });

    // For team mode, initialize bomb time
    if (isTeamMode && !bombTime) {
      // Set bomb time to be between 2-4 minutes (random)
      const minTime = 2 * 60 * 1000; // 2 minutes
      const maxTime = 4 * 60 * 1000; // 4 minutes
      const randomTime = Math.floor(Math.random() * (maxTime - minTime)) + minTime;
      
      // Set bomb time to current time + random time
      setBombTime(getServerTime() + randomTime);
      
      // Start ticking after 1 minute
      setTimeout(() => {
        setBombTicking(true);
      }, 60000); // Start ticking after 1 minute
    }

    function startTimeForPlayer(player) {
      if (!timerIntervalRef.current && !isPaused) {
        timerIntervalRef.current = setInterval(() => {
          const now = getServerTime();
          const elapsed = now - lastTickTimeRef.current;
          lastTickTimeRef.current = now;
          
          setPlayerTimers(prevTimers => {
            const newTimers = { ...prevTimers };
            if (newTimers[player]) {
              newTimers[player] = Math.max(0, newTimers[player] - elapsed);
              //console.log(`Timer update - Player: ${player}, Time: ${Math.floor(newTimers[player] / 1000)}s`);
              
              if (newTimers[player] === 0) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                socket.emit('word_chain_timeout', { player });
              }
            }
            return newTimers;
          });
        }, 100);
      }
    }

    return () => {
      socket.off('word_chain_update');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [currentPlayer, isPaused]); // Added activeTimer to dependencies

  // Determine if the current player is from the blue team
  const isCurrentPlayerBlue = isTeamMode && 
    scores?.blue_team?.includes(currentPlayer);

  // Function to render player timers
  const renderPlayerTimers = () => {
    if (isTeamMode) {
      // For team mode, we'll show a bomb timer instead of individual timers
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {isCurrentPlayerBlue ? 'Modrý tým' : 'Červený tým'} je na tahu
          </Typography>
          {bombTicking && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              animation: bombTicking ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(1.05)',
                },
                '100%': {
                  transform: 'scale(1)',
                }
              }
            }}>
              <Typography 
                variant="h2" 
                color="error"
                sx={{ fontWeight: 'bold' }}
              >
                BOMBA TIKÁ!
              </Typography>
            </Box>
          )}
        </Box>
      );
    } else {
      // For free-for-all mode, show individual player timers
      // Get players from playerTimers, or fallback to scores, or question.players
      let activePlayerNames = [];
      
      if (Object.keys(playerTimers).length > 0) {
        activePlayerNames = Object.keys(playerTimers);
      } else if (scores?.individual && Object.keys(scores.individual).length > 0) {
        activePlayerNames = Object.keys(scores.individual);
      } else if (question?.players) {
        activePlayerNames = Object.keys(question.players);
      }
      
      // Filter out eliminated players
      activePlayerNames = activePlayerNames.filter(name => !eliminatedPlayers.includes(name));
      
      // Sort by player_order if available
      if (question?.player_order && question.player_order.length > 0) {
        const orderMap = {};
        question.player_order.forEach((name, idx) => {
          orderMap[name] = idx;
        });
        
        activePlayerNames.sort((a, b) => {
          const orderA = orderMap[a] !== undefined ? orderMap[a] : 999;
          const orderB = orderMap[b] !== undefined ? orderMap[b] : 999;
          return orderA - orderB;
        });
      }
      
      return (
        <Box 
          sx={{ 
            mt: 4,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: `repeat(${Math.min(4, activePlayerNames.length)}, 1fr)`,
                sm: `repeat(${Math.min(6, activePlayerNames.length)}, 1fr)`,
                md: `repeat(${Math.min(8, activePlayerNames.length)}, 1fr)`,
                lg: `repeat(${Math.min(10, activePlayerNames.length)}, 1fr)`
              },
              gap: 2,
              maxWidth: {
                xs: activePlayerNames.length > 4 ? '100%' : `${activePlayerNames.length * 160 + (activePlayerNames.length-1) * 16}px`,
                sm: activePlayerNames.length > 6 ? '100%' : `${activePlayerNames.length * 160 + (activePlayerNames.length-1) * 16}px`,
                md: activePlayerNames.length > 8 ? '100%' : `${activePlayerNames.length * 160 + (activePlayerNames.length-1) * 16}px`,
                lg: activePlayerNames.length > 10 ? '100%' : `${activePlayerNames.length * 160 + (activePlayerNames.length-1) * 16}px`
              }
            }}
          >
            {activePlayerNames.map((playerName) => {
              const isCurrentTurn = playerName === currentPlayer;
              
              // Check if data structure is as expected, otherwise try alternate paths
              const playerColor = scores?.individual?.[playerName]?.color || '#ccc';
              
              const playerScore = scores?.individual?.[playerName]?.score || 0;
              const timeRemaining = playerTimers[playerName] || 0;
              const totalTime = question?.length * 1000 || 30000;
              const timePercentage = (timeRemaining / totalTime) * 100;
              
              // Add a pulsing effect when it's a player's turn
              const isPulsing = isCurrentTurn && !isPaused;
              
              return (
                <Box key={playerName}>
                  <Paper 
                    elevation={isCurrentTurn ? 6 : 1}
                    sx={{ 
                      p: 1.5, 
                      position: 'relative',
                      height: '165px', 
                      width: '160px',   
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transform: isCurrentTurn ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.3s ease',
                      borderTop: isCurrentTurn ? `5px solid ${playerColor}` : 'none',
                      animation: isPulsing ? 'pulseLight 2s infinite' : 'none',
                      bgcolor: eliminatedPlayers.includes(playerName) ? 'rgba(244, 67, 54, 0.1)' : 'background.paper',
                      opacity: eliminatedPlayers.includes(playerName) ? 0.7 : 1,
                      '@keyframes pulseLight': {
                        '0%': { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0.1)' },
                        '70%': { boxShadow: '0 0 0 10px rgba(0, 0, 0, 0)' },
                        '100%': { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)' }
                      }
                    }}
                  >
                    {eliminatedPlayers.includes(playerName) && (
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        zIndex: 1,
                        transform: 'rotate(-15deg)'
                      }}>
                        <Typography variant="h5" color="error" fontWeight="bold">
                          VYŘAZEN
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Avatar at the top with player's color */}
                    <Avatar 
                      sx={{ 
                        bgcolor: playerColor,
                        width: 48,
                        height: 48,
                        fontSize: '1.5rem',
                        mb: 2,
                        color: 'white',
                        opacity: eliminatedPlayers.includes(playerName) ? 0.5 : 1
                      }}
                    >
                      {playerName.charAt(0).toUpperCase()}
                    </Avatar>
                    
                    {/* Timer bar */}
                    <LinearProgress 
                      variant="determinate" 
                      value={eliminatedPlayers.includes(playerName) ? 0 : timePercentage} 
                      color={timePercentage > 60 ? "success" : timePercentage > 30 ? "warning" : "error"}
                      sx={{ 
                        height: 8, 
                        width: '100%',
                        borderRadius: 4,
                        mb: 0
                      }}
                    />
                    
                    {/* Time remaining */}
                    <Typography sx={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      color: timePercentage <= 30 ? 'error.main' : 'inherit',
                      opacity: eliminatedPlayers.includes(playerName) ? 0.5 : 1
                    }}>
                      {eliminatedPlayers.includes(playerName) ? '0s' : `${Math.floor(timeRemaining / 1000)}s`}
                    </Typography>
                    
                    <Divider sx={{ width: '100%', my: 1 }} />
                    
                    {/* Score */}
                    <Typography fontWeight="bold" sx={{ 
                      fontSize: '1.2rem',
                      opacity: eliminatedPlayers.includes(playerName) ? 0.5 : 1
                    }}>
                      {gameSpecificPoints[playerName] ? Math.round(gameSpecificPoints[playerName]) : 0} bodů
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    }
  };

  // Render the actual word chain
  const renderWordChain = () => {
    if (!wordChain.length) {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h4" color="text.secondary">
            Čekáme na první slovo...
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box 
        ref={wordChainContainerRef}
        sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          mt: 0, 
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: '100%',
          p: 3
        }}
      >
        {wordChain.map((item, index) => {
          const { word, player, team } = item;
          const playerColor = team 
            ? (team === 'blue' ? '#2196f3' : '#f44336')
            : (scores?.individual?.[player]?.color || '#ccc');
          
          // For the first word (system word) or last word, use different styles
          const isSystemWord = player === 'system';
          const isLastWord = index === wordChain.length - 1;
          
          return (
            <React.Fragment key={`${word}-${index}`}>
              {/* Arrow between words */}
              {index > 0 && (
                <Typography variant="h4" sx={{ mx: 1.5, color: 'text.secondary' }}>
                  →
                </Typography>
              )}
              
              {/* Word chip */}
              <Chip
                label={
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: 'white'
                    }}
                  >
                    {word}
                  </Typography>
                }
                sx={{ 
                  bgcolor: isLastWord 
                    ? 'success.main' 
                    : ('grey.700'),
                  height: 52,
                  borderRadius: 3,
                  px: 2,
                  transform: isLastWord ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: isLastWord ? 5 : 2
                }}
              />
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        p: 3
      }}
    >
      {/* Header with current question and letter */}
      <Box sx={{ mb: 1, textAlign: 'center' }}>
        <Paper
          elevation={5}
          sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            borderRadius: 3,
            backgroundColor: 'primary.main',
            minWidth: 400
          }}
        >
          <Typography variant="h4" sx={{ mr: 3, color: 'white' }}>
            Aktuální písmeno:
          </Typography>
          <Typography 
            variant="h2" 
            component="span" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white',
              display: 'inline-block',
              minWidth: 60,
            }}
          >
            {currentLetter || '?'}
          </Typography>
        </Paper>
      </Box>
      
      {/* Word chain display */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {renderWordChain()}
      </Box>
      
      {/* Player timers and scores */}
      <Box sx={{ mt: 'auto', pt: 4 }}>
        {renderPlayerTimers()}
      </Box>
    </Box>
  );
};

export default WordChainQuiz;
