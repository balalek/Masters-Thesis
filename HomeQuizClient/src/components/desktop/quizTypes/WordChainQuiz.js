/**
 * @fileoverview Word Chain Quiz component for desktop display of word chain games
 * 
 * This module provides:
 * - Interactive word chain game visualization with real-time updates
 * - Player turn management with visual indicators and timers
 * - Team mode support with team-specific visual effects
 * - Player rotation visualization for upcoming turns
 * - Team Timer effects including animations for dramatic tension
 * - Comprehensive player state tracking (active, eliminated, score)
 * @author Bc. Martin Baláž
 * @module Components/Desktop/QuizTypes/WordChainQuiz
 */
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
 * Word Chain Quiz component for displaying word chain games on the host screen
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data including initial letter and player information
 * @param {number} props.question_end_time - Server timestamp when question will end
 * @returns {JSX.Element} The rendered word chain quiz component
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
  const isTeamMode = question?.is_team_mode || false;
  const [bombTicking, setBombTicking] = useState(false);
  const [sparklesShowing, setSparklesShowing] = useState(false);

  // States for tracking timer status
  const timerIntervalRef = useRef(null);
  const lastTickTimeRef = useRef(getServerTime());

  // Ref for auto-scrolling
  const wordChainContainerRef = useRef(null);
  
  const [gameSpecificPoints, setGameSpecificPoints] = useState({});
  const [previousPlayers, setPreviousPlayers] = useState([]);
  const [nextPlayers, setNextPlayers] = useState(question?.next_players || []);

  // Initialize with first word and next players
  useEffect(() => {
    if (question?.first_word && wordChain.length === 0) {
      setWordChain([{
        word: question.first_word,
        player: 'system',
        team: null
      }]);
      setCurrentLetter(question.first_letter || '');
      // Set system as the previous player when game starts
      setPreviousPlayers(['system']);
      setNextPlayers(question?.next_players || []);
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
      // Update states
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
        lastTickTimeRef.current = getServerTime();
        
        // Start timer for new player
        startTimeForPlayer(newCurrentPlayer);
      }

      setPreviousPlayers(data.previous_players || []);
      setNextPlayers(data.next_players || []);
    });

    // Instead of setting up a bomb timer, we'll update the timeRemaining state regularly
    // and show the bomb ticking animation when remaining time is low
    if (isTeamMode && question_end_time) {
      const timerInterval = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.max(0, question_end_time - now);
        
        // Calculate time percentage
        const totalTime = question?.length * 1000 || 0;
        const timePercentage = remaining / totalTime * 100;
        
        // Start showing sparkles at 40%
        if (timePercentage < 40) {
          setSparklesShowing(true);
        } else {
          setSparklesShowing(false);
        }
        
        // If less than 10% of time remains, show the bomb ticking animation
        if (timePercentage < 10) {
          setBombTicking(true);
        } else {
          setBombTicking(false);
        }
      }, 100);
      
      return () => {
        clearInterval(timerInterval);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }

    /**
     * Start the timer for a specific player
     * 
     * @function startTimeForPlayer
     * @param {string} player - The player whose timer to start
     */
    function startTimeForPlayer(player) {
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = setInterval(() => {
          const now = getServerTime();
          const elapsed = now - lastTickTimeRef.current;
          lastTickTimeRef.current = now;
          
          // Update the timer for the current player
          setPlayerTimers(prevTimers => {
            const newTimers = { ...prevTimers };
            if (newTimers[player]) {
              newTimers[player] = Math.max(0, newTimers[player] - elapsed);
              
              // Check if the timer has reached zero
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
  }, [currentPlayer, question_end_time, isTeamMode, question]);

  /**
   * Render player timers and status indicators
   * 
   * @function renderPlayerTimers
   * @returns {JSX.Element} The rendered player timers or team mode bomb visualization
   */
  const renderPlayerTimers = () => {
    if (isTeamMode) {

      /**
       * Render the bomb timer with sparkles and flashing background
       * Generated by AI
       * @function renderSparkles
       * @returns {JSX.Element} The rendered sparkles for the bomb timer
       */
      const renderSparkles = () => (
        [...Array(12)].map((_, i) => (
          <Box
            key={`sparkle-${i}`}
            sx={{
              position: 'absolute',
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              backgroundColor: i % 3 === 0 ? '#FCD34D' : '#F87171',
              borderRadius: '50%',
              opacity: 0.8,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `sparkleFloat${i % 4} ${1 + Math.random() * 2}s infinite linear`,
              '@keyframes sparkleFloat0': {
                '0%': { transform: 'translate(0, 0)' },
                '100%': { transform: `translate(${80 + Math.random() * 50}px, ${-40 - Math.random() * 60}px)`, opacity: 0 }
              },
              '@keyframes sparkleFloat1': {
                '0%': { transform: 'translate(0, 0)' },
                '100%': { transform: `translate(${-80 - Math.random() * 50}px, ${-40 - Math.random() * 60}px)`, opacity: 0 }
              },
              '@keyframes sparkleFloat2': {
                '0%': { transform: 'translate(0, 0)' },
                '100%': { transform: `translate(${80 + Math.random() * 50}px, ${40 + Math.random() * 60}px)`, opacity: 0 }
              },
              '@keyframes sparkleFloat3': {
                '0%': { transform: 'translate(0, 0)' },
                '100%': { transform: `translate(${-80 - Math.random() * 50}px, ${40 + Math.random() * 60}px)`, opacity: 0 }
              }
            }}
          />
        ))
      );

      return (
        <Box sx={{ position: 'relative' }}>
          {/* Early warning (40-10%) - just sparkles */}
          {sparklesShowing && !bombTicking && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1000
              }}
            >
              {renderSparkles()}
            </Box>
          )}

          {/* Critical warning (<10%) - sparkles + flashing background */}
          {bombTicking && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1000,
                animation: 'flashWarning 0.7s infinite',
                '@keyframes flashWarning': {
                  '0%, 100%': { backgroundColor: 'transparent' },
                  '50%': { backgroundColor: 'rgba(239, 68, 68, 0.25)' }
                }
              }}
            >
              {renderSparkles()}
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
              const timeRemaining = playerTimers[playerName] || 0;
              const totalTime = question?.length * 1000 || 30000;
              const timePercentage = (timeRemaining / totalTime) * 100;
              
              // Add a pulsing effect when it's a player's turn
              const isPulsing = isCurrentTurn;
              
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

  /**
   * Render the word chain with visual transitions between words
   * 
   * @function renderWordChain
   * @returns {JSX.Element} The rendered word chain or waiting message
   */
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
          const { word } = item;
          
          // For the first word (system word) or last word, use different styles
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

  /**
   * Render player rotation visualization showing previous, current and upcoming players
   * 
   * @function renderPlayerRotation
   * @returns {JSX.Element|null} The rendered player rotation or null if not in team mode
   */
  const renderPlayerRotation = () => {
    if (!isTeamMode) return null;

    const playerBoxStyles = {
      pt: 3,
      pl: 0.8,
      pr: 0.8,
      width: 120,
      height: 130,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1.5,
    };

    // Floating animation keyframes
    const keyframes = {
      '@keyframes floatCenter': {
        '0%': { transform: 'scale(1.25) translateY(0px)' },
        '50%': { transform: 'scale(1.25) translateY(-10px)' },
        '100%': { transform: 'scale(1.25) translateY(0px)' }
      }
    };

    const nameStyles = {
      width: '100%',
      textAlign: 'center',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      lineHeight: '1.2',
      minHeight: '2.4em' // Space for two lines
    };

    // Get current player's team based on the current word chain
    const currentPlayerTeam = wordChain.length > 0 
      ? (currentPlayer === wordChain[wordChain.length - 1]?.player 
        ? wordChain[wordChain.length - 1]?.team 
        : (wordChain[wordChain.length - 1]?.team === 'blue' ? 'red' : 'blue'))
      : 'blue'; // Default to blue if no words yet

    /**
     * Get the color for the team based on the index and direction
     * 
     * @function getTeamColor
     * @param {boolean} isNextDirection - True if the player is in the next direction
     * @param {number} index - The index of the player in the rotation
     * @return {string} The color for the team
     */
    const getTeamColor = (isNextDirection, index) => {
      const startWithTeam = currentPlayerTeam;
      const isEvenIndex = index % 2 === 0;
      const firstTeam = isNextDirection ? (startWithTeam === 'blue' ? 'red' : 'blue') : (startWithTeam === 'blue' ? 'red' : 'blue');
      return (isEvenIndex ? firstTeam : (firstTeam === 'blue' ? 'red' : 'blue')) === 'blue' ? '#186CF6' : '#EF4444';
    };

    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        mt: 4,
        mb: 2,
        ...keyframes
      }}>
        {/* Previous players */}
        <Box sx={{ display: 'flex', gap: 2, opacity: 0.6, flexDirection: 'row-reverse' }}>
          {previousPlayers.map((player, idx) => (
            <Paper
              key={`prev-${player}`}
              sx={{
                ...playerBoxStyles,
                border: `2px solid ${getTeamColor(false, idx)}`,
                opacity: 0.8 - (idx * 0.2)
              }}
            >
              <Avatar sx={{ color: 'white', bgcolor: scores?.individual?.[player]?.color }}>
                {player.charAt(0).toUpperCase()}
              </Avatar>
              <Typography sx={nameStyles}>
                {player}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Current player with floating animation */}
        <Paper
          elevation={6}
          sx={{
            ...playerBoxStyles,
            width: 140,
            height: 150,
            border: `3px solid ${currentPlayerTeam === 'blue' ? '#186CF6' : '#EF4444'}`,
            animation: 'floatCenter 3s ease-in-out infinite',
            zIndex: 2
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: scores?.individual?.[currentPlayer]?.color,
              width: 56,
              color: 'white',
              height: 56,
              fontSize: '1.5rem'
            }}
          >
            {currentPlayer.charAt(0).toUpperCase()}
          </Avatar>
          <Typography 
            variant="h6" 
            sx={{
              ...nameStyles,
              fontSize: '1.1rem',
            }}
          >
            {currentPlayer}
          </Typography>
        </Paper>

        {/* Next players */}
        <Box sx={{ display: 'flex', gap: 2, opacity: 0.6 }}>
          {nextPlayers.map((player, idx) => (
            <Paper
              key={`next-${player}`}
              sx={{
                ...playerBoxStyles,
                border: `2px solid ${getTeamColor(true, idx)}`,
                opacity: 0.8 - (idx * 0.2)
              }}
            >
              <Avatar sx={{ color: 'white', bgcolor: scores?.individual?.[player]?.color }}>
                {player.charAt(0).toUpperCase()}
              </Avatar>
              <Typography sx={nameStyles}>
                {player}
              </Typography>
            </Paper>
          ))}
        </Box>
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
      <Box sx={{ mt: 'auto' }}>
        {renderPlayerTimers()}
        {isTeamMode && renderPlayerRotation()}
      </Box>
    </Box>
  );
};

export default WordChainQuiz;