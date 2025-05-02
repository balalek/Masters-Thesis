/**
 * @fileoverview Math Quiz component for desktop display of mathematical sequences
 * 
 * This module provides:
 * - Sequential presentation of mathematical equations
 * - Countdown timer for each equation
 * - Real-time tracking of player answers and eliminations
 * - Team mode support with team-specific layouts
 * - Visual indicators of player statuses (answered, eliminated, thinking)
 * - Automatic timer advancement when all players answer
 * 
 * @module Components/Desktop/QuizTypes/MathQuiz
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { useTimer } from 'react-timer-hook';
import { getSocket } from '../../../utils/socket';
import { renderMathEquation } from '../../../utils/mathRenderer';

/**
 * Math Quiz component for displaying mathematical sequences on the host screen
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data with mathematical sequences and player information
 * @returns {JSX.Element} The rendered math quiz component
 */
const MathQuiz = ({ question }) => {
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [players, setPlayers] = useState({});
  const [playerStatuses, setPlayerStatuses] = useState({});
  const sequencesRef = useRef([]);
  const socket = getSocket();

  // Timer hook from react-timer-hook
  const {
    seconds,
    isRunning,
    restart
  } = useTimer({ 
    expiryTimestamp: new Date(), 
    onExpire: handleTimerExpire,
    autoStart: false
  });

  const [displaySeconds, setDisplaySeconds] = useState(null);

  // Update display seconds when timer changes
  useEffect(() => {
    if (isRunning) {
      setDisplaySeconds(seconds);
    }
  }, [seconds, isRunning]);

  /**
   * Handle timer expiration for current sequence
   * 
   * @function handleTimerExpire
   */
  function handleTimerExpire() {
    socket.emit('math_sequence_completed', {
      current_index: currentSequenceIndex,
      next_index: currentSequenceIndex + 1
    });
  }

  // Initialize sequences from question
  useEffect(() => {
    if (question?.sequences && question.sequences.length > 0) {
      sequencesRef.current = [...question.sequences];
      
      // Set timer for the first sequence
      const time = new Date();
      time.setSeconds(time.getSeconds() + sequencesRef.current[0].length);
      restart(time);
    }

    if (question?.eliminated_players) {
      setEliminatedPlayers(question.eliminated_players || []);
    }

    // Initialize players from question
    if (question?.players) {
      setPlayers(question.players);
    }

    setIsTeamMode(!!question?.is_team_mode);
  }, [question, restart]);

  // Listen for socket events to update state 
  useEffect(() => {
    socket.on('math_quiz_update', (data) => {
      setCurrentSequenceIndex(data.current_sequence || 0);
      setEliminatedPlayers(data.eliminated_players || []);
      setPlayerAnswers(data.player_answers || {});
      setPlayerStatuses(data.player_statuses || {});
      
      if (data.players) {
        setPlayers(data.players);
      }

      // Check if all active players have answered
      const activePlayerCount = Object.keys(data.player_statuses || {}).filter(
        name => !data.eliminated_players?.includes(name)
      ).length;
      
      const answeredCount = Object.values(data.player_statuses || {}).filter(
        status => status.hasAnswered && !status.isEliminated
      ).length;
      
      // Fast-forward timer if all players have answered
      if (activePlayerCount > 0 && answeredCount === activePlayerCount && seconds > 3) {
        const time = new Date();
        time.setSeconds(time.getSeconds() + 3);
        restart(time);
        // Immediately set display seconds to match for visual consistency
        setDisplaySeconds(3);
      }
    });

    socket.on('math_sequence_change', (data) => {
      setCurrentSequenceIndex(data.sequence_index);
      
      // Reset timer for the new sequence
      const newSequence = sequencesRef.current[data.sequence_index];
      if (newSequence) {
        const time = new Date();
        time.setSeconds(time.getSeconds() + newSequence.length);
        restart(time);
      }
    });

    socket.on('fast_forward_timer', (data) => {
      const remainingSeconds = data.remaining_seconds || 3;
      
      // Only update the timer if the current timer is greater than the target seconds
      // This ensures we only go down to 3 seconds, never up to 3 seconds
      if (seconds > remainingSeconds) {
        const time = new Date();
        time.setSeconds(time.getSeconds() + remainingSeconds);
        restart(time);
        
        // Update display seconds immediately for visual consistency
        setDisplaySeconds(remainingSeconds);
      } 
    });

    return () => {
      socket.off('math_quiz_update');
      socket.off('math_sequence_change');
      socket.off('fast_forward_timer');
    };
  }, [socket, restart, seconds, isTeamMode]);

  /**
   * Get the current mathematical equation to display
   * 
   * @function getCurrentEquation
   * @returns {string|null} The current equation or null if no equations remain
   */
  const getCurrentEquation = () => {
    if (!sequencesRef.current.length || currentSequenceIndex >= sequencesRef.current.length) {
      return null;
    }
    
    const currentSequence = sequencesRef.current[currentSequenceIndex];
    return currentSequence ? currentSequence.equation : '';
  };

  /**
   * Render player cards for tracking player status
   * 
   * @function
   * @returns {JSX.Element|null} The rendered player cards grid or null if no players
   */
  const renderPlayerCards = () => {
    const playerNames = Object.keys(players);
    
    if (!playerNames.length) {
      return null;
    }

    // If in team mode, split players by team
    if (isTeamMode) {
      // Get players in each team
      const blueTeamPlayers = playerNames.filter(name => 
        players[name]?.team === 'blue' || question?.blue_team?.includes(name));
      const redTeamPlayers = playerNames.filter(name => 
        players[name]?.team === 'red' || question?.red_team?.includes(name));
        
      return (
        <Box 
          sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%'
          }}
        >
          {/* Blue Team */}
          <Box 
            sx={{ 
              width: '49.5%',
              border: '3px solid #186CF6',
              borderRadius: 3,
              padding: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#186CF6', 
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Modrý tým
            </Typography>
            
            <Box 
              sx={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5, // Gap between player cards
                justifyContent: 'center',
                width: '100%'
              }}
            >
              {blueTeamPlayers.map((playerName) => renderPlayerCard(playerName))}
            </Box>
          </Box>
          
          {/* Red Team */}
          <Box 
            sx={{ 
              width: '49.5%',
              border: '3px solid #EF4444',
              borderRadius: 3,
              padding: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#EF4444', 
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Červený tým
            </Typography>
            
            <Box 
              sx={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5, // Gap between player cards
                justifyContent: 'center',
                width: '100%'
              }}
            >
              {redTeamPlayers.map((playerName) => renderPlayerCard(playerName))}
            </Box>
          </Box>
        </Box>
      );
    }

    // For free-for-all mode, display all players in a grid
    return (
      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: {
              xs: `repeat(${Math.min(4, playerNames.length)}, 1fr)`,
              sm: `repeat(${Math.min(6, playerNames.length)}, 1fr)`,
              md: `repeat(${Math.min(8, playerNames.length)}, 1fr)`,
              lg: `repeat(${Math.min(10, playerNames.length)}, 1fr)`
            },
            gap: 2,
            justifyContent: 'center'
          }}
        >
          {playerNames.map((playerName) => renderPlayerCard(playerName))}
        </Box>
      </Box>
    );
  };
  
  /**
   * Render a single player card with status
   * 
   * @function
   * @param {string} playerName - Name of the player
   * @returns {JSX.Element} The rendered player card
   */
  const renderPlayerCard = (playerName) => {
    const isEliminated = eliminatedPlayers.includes(playerName);
    const playerColor = players[playerName]?.color || '#ccc';
    const hasAnswered = playerStatuses[playerName]?.hasAnswered || playerAnswers[playerName] !== undefined;
    
    // Check if the player personally answered or if they are just part of a team that answered
    const personallyAnswered = Object.values(playerAnswers).some(answers => 
      answers.some(a => a.player === playerName)
    );
    
    // Determine the status text based on player state
    let statusText = 'Počítá...';
    if (isEliminated) {
      statusText = 'Vyřazen';
    } else if (hasAnswered) {
      if (personallyAnswered) {
        statusText = 'Odpověděl';
      } else {
        // This player didn't answer personally but is on a team that answered
        statusText = 'Vyřešeno';
      }
    }
    
    return (
      <Paper 
        key={playerName}
        elevation={1}
        sx={{ 
          p: 1.5, 
          position: 'relative',
          height: '165px', 
          width: '128px',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: isEliminated ? 'rgba(244, 67, 54, 0.1)' : 'background.paper',
          opacity: isEliminated ? 0.7 : 1,
          border: isEliminated ? '2px solid #f44336' : 'none',
        }}
      >
        <Avatar 
          sx={{ 
            bgcolor: playerColor,
            width: 48,
            height: 48,
            fontSize: '1.5rem',
            mb: 2,
            color: 'white',
            opacity: isEliminated ? 0.5 : 1
          }}
        >
          {playerName.charAt(0).toUpperCase()}
        </Avatar>
        
        <Typography
          variant="h6"
          sx={{
            fontSize: '1.1rem',
            textAlign: 'center',
            mb: 1,
            opacity: isEliminated ? 0.5 : 1,
            width: '100%',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.2',
            minHeight: '2.4em'
          }}
        >
          {playerName}
        </Typography>
        
        <Typography 
          variant="body2" 
          color={isEliminated ? "error" : (hasAnswered ? "success.main" : "text.secondary")}
          sx={{ fontWeight: 'medium' }}
        >
          {statusText}
        </Typography>
      </Paper>
    );
  };
  
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      p: 3,
      justifyContent: 'space-between'
    }}>
      {/* Center content grid */}
      <Box sx={{ flex: 1 }} />
      
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 4,
        px: 4,
      }}>
        {/* Timer bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {displaySeconds !== null ? displaySeconds : seconds}
          </Typography>
        </Box>

        {/* Current Equation */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'background.paper',
            textAlign: 'center',
            width: '100%'
          }}
        >
          <Typography 
            variant="h3" 
            component="div" 
            sx={{ 
              fontWeight: 'medium',
              fontFamily: 'math',
              whiteSpace: 'pre-wrap'
            }}
          >
            {renderMathEquation ? renderMathEquation(getCurrentEquation()) : getCurrentEquation()}
          </Typography>
        </Paper>

        {/* Sequence number as current/total in a bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {currentSequenceIndex + 1}/{sequencesRef.current.length || 0}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt: -1 }}>
            úkolů
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ flex: 1 }} />
      
      {/* Player cards at the bottom */}
      {renderPlayerCards()}
    </Box>
  );
};

export default MathQuiz;