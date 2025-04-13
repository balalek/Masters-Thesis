import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { useTimer } from 'react-timer-hook';
import { getSocket, getServerTime } from '../../../utils/socket';
import { renderMathEquation } from '../../../utils/mathRenderer';

/**
 * Component to display a Math Quiz game
 */
const MathQuiz = ({ question, question_end_time }) => {
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teamAnswers, setTeamAnswers] = useState({ blue: [], red: [] });
  const [players, setPlayers] = useState({});
  const [playerStatuses, setPlayerStatuses] = useState({});
  const sequencesRef = useRef([]);
  const socket = getSocket();

  // Timer hook from react-timer-hook
  const {
    seconds,
    minutes,
    isRunning,
    start,
    pause,
    restart,
    totalSeconds
  } = useTimer({ 
    expiryTimestamp: new Date(), 
    onExpire: handleTimerExpire,
    autoStart: false
  });

  // Add a state to track the display time for smoother countdown
  const [displaySeconds, setDisplaySeconds] = useState(null);

  // Update display seconds when timer changes
  useEffect(() => {
    if (isRunning) {
      setDisplaySeconds(seconds);
    }
  }, [seconds, isRunning]);

  // Handler for when timer expires
  function handleTimerExpire() {
    console.log("Timer expired for sequence", currentSequenceIndex);
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

  // Handle socket events
  useEffect(() => {
    socket.on('math_quiz_update', (data) => {
      setCurrentSequenceIndex(data.current_sequence || 0);
      setEliminatedPlayers(data.eliminated_players || []);
      setPlayerAnswers(data.player_answers || {});
      setPlayerStatuses(data.player_statuses || {});
      setScores(data.scores || {});
      
      if (data.players) {
        setPlayers(data.players);
      }
      
      if (isTeamMode) {
        setTeamAnswers(data.team_answers || { blue: [], red: [] });
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
        console.log(`Fast-forwarding timer from ${seconds} to 3 seconds`);
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

    // Add listener for fast_forward_timer event
    socket.on('fast_forward_timer', (data) => {
      console.log(`Received fast_forward_timer event: ${JSON.stringify(data)}`);
      const remainingSeconds = data.remaining_seconds || 3;
      
      // Only update the timer if the current timer is greater than the target seconds
      // This ensures we only go down to 3 seconds, never up to 3 seconds
      if (seconds > remainingSeconds) {
        console.log(`Fast-forwarding timer from ${seconds} to ${remainingSeconds} seconds`);
        const time = new Date();
        time.setSeconds(time.getSeconds() + remainingSeconds);
        restart(time);
        
        // Update display seconds immediately for visual consistency
        setDisplaySeconds(remainingSeconds);
      } else {
        console.log(`Not updating timer as current seconds (${seconds}) ≤ target seconds (${remainingSeconds})`);
      }
    });

    return () => {
      socket.off('math_quiz_update');
      socket.off('math_sequence_change');
      socket.off('fast_forward_timer');
    };
  }, [socket, restart, seconds, isTeamMode]);

  // Render the current equation
  const getCurrentEquation = () => {
    if (!sequencesRef.current.length || currentSequenceIndex >= sequencesRef.current.length) {
      return null;
    }
    
    const currentSequence = sequencesRef.current[currentSequenceIndex];
    return currentSequence ? currentSequence.equation : '';
  };

  // Function to render player cards similar to WordChainQuiz
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
              border: '3px solid #186CF6', // Blue team border
              borderRadius: 3,
              padding: 1, // Reduced padding
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
                mb: 1 // Reduced margin
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
              border: '3px solid #EF4444', // Red team border
              borderRadius: 3,
              padding: 1, // Reduced padding
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
                mb: 1 // Reduced margin
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

    // For non-team mode, use the existing layout
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
  
  // Extract rendering of a single player card to a separate function
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
      justifyContent: 'space-between' // Distribute space evenly
    }}>
      {/* Center content grid - now centered vertically with flex-grow to take space */}
      <Box sx={{ flex: 1 }} /> {/* Top spacing to push content to center */}
      
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 4,
        px: 4,
      }}>
        {/* Timer bubble with more consistent display */}
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

        {/* Question counter in a bubble - updated format to show X/Y with "úkolů" */}
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
      
      <Box sx={{ flex: 1 }} /> {/* Middle spacing */}
      
      {/* Player cards at the bottom */}
      {renderPlayerCards()}
    </Box>
  );
};

export default MathQuiz;
