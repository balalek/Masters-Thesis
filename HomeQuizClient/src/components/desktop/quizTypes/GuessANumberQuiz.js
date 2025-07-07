/**
 * @fileoverview Guess A Number Quiz component for desktop numerical guessing games
 * 
 * This module provides:
 * - Two-phase number guessing game interface for team competitions
 * - First phase for team numerical guesses with captain decision
 * - Second phase for opposing team to vote higher or lower
 * - Real-time vote counting and guess tracking
 * - Phase transition animations
 * - Support for both team mode and free-for-all gameplay
 * @author Bc. Martin Baláž
 * @module Components/Desktop/QuizTypes/GuessANumberQuiz
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import PhaseTransitionScreen from './PhaseTransitionScreen';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * Guess A Number Quiz component for displaying numerical guessing game
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.activeTeam - Currently active team ('blue' or 'red')
 * @param {Object} props.question - Question data including text and quiz settings
 * @param {number} props.question_end_time - Server timestamp when question will end
 * @returns {JSX.Element} The rendered guess a number quiz component
 */
const GuessANumberQuiz = ({ activeTeam, question, question_end_time }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(activeTeam); // 'blue' or 'red' or null
  const [phase, setPhase] = useState(1); // 1 or 2
  const [firstTeamAnswer, setFirstTeamAnswer] = useState(null);
  const [secondTeamVotes, setSecondTeamVotes] = useState({ more: 0, less: 0 });
  const [guessCount, setGuessCount] = useState(0);
  const [teamGuesses, setTeamGuesses] = useState([]);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionEndTime, setTransitionEndTime] = useState(null);
  const [phaseEndTime, setPhaseEndTime] = useState(question_end_time);
  const socket = getSocket();

  // Timer effect for phase end time
  useEffect(() => {
    if (phaseEndTime) {
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((phaseEndTime - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
          socket.emit('time_up');
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [phaseEndTime, socket]);

  // Socket listeners for team guesses and phase transitions
  useEffect(() => {
    // Listen for team guesses in phase 1
    socket.on('team_guess_submitted', (data) => {
      if (data.playerGuess) {
        setTeamGuesses(prev => [...prev, data.playerGuess]);
      }
    });

    socket.on('phase_transition', (data) => {
      setCurrentTeam(data.activeTeam);
      setPhase(2);
      setFirstTeamAnswer(data.firstTeamAnswer);
      setShowTransition(true);
      setTransitionEndTime(data.transitionEndTime);
      setGuessCount(0); // Reset guess count for phase 2
      
      // Important: Set a new timer end time for phase 2
      // Calculate the new end time for phase 2 based on the transition end time
      // and the original question length
      const newPhaseEndTime = data.transitionEndTime + (question.length * 1000);
      setPhaseEndTime(newPhaseEndTime);
    });

    // Listen for second team votes (phase 2)
    socket.on('second_team_vote', (data) => {
      setSecondTeamVotes(data.votes);
    });

    // Listen for all number guesses (free-for-all mode)
    socket.on('guess_submitted', () => {
      setGuessCount(prev => prev + 1);
    });

    return () => {
      socket.off('team_guess_submitted');
      socket.off('phase_transition');
      socket.off('second_team_vote');
      socket.off('guess_submitted');
    };
  }, [socket, question]);

  /**
   * Render the first phase content with team guesses
   * 
   * @function renderPhase1Content
   * @returns {JSX.Element} The rendered phase 1 content
   */
  const renderPhase1Content = () => (
    <Box sx={{ textAlign: 'center' }}>
      {teamGuesses.length > 0 && (
        <Box sx={{ maxWidth: '80%', mx: 'auto' }}>
          <Typography variant="h4" sx={{ mb: 3, color: 'primary.main' }}>
            Tipy členů týmu:
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: 2,
            flexWrap: 'nowrap', // Ensure items stay on one line
            overflow: 'visible'
          }}>
            {teamGuesses.map((guess, index) => (
              <Box 
                key={index}
                sx={{ 
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 2,
                  px: 2,
                  py: 2,
                  mb: 4,
                  minWidth: '200px',
                  maxWidth: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                  {guess.playerName}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {guess.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      <Typography variant="h4" sx={{ mb: 3, px: 2 }}>
        Kapitán týmu vybírá konečnou odpověď
      </Typography>
    </Box>
  );

  /**
   * Render the second phase content with higher/lower question
   * 
   * @function
   * @returns {JSX.Element} The rendered phase 2 content
   */
  const renderPhase2Content = () => (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h3" sx={{ mb: 5, px: 2 }}>
        Je správná odpověď větší nebo menší než <span style={{ fontWeight: 'bold', fontSize: '60px', color: '#3B82F6' }}>{firstTeamAnswer}</span>?
      </Typography>
    </Box>
  );

  if (showTransition) {
    return (
      <PhaseTransitionScreen 
        question={question}
        firstTeamAnswer={firstTeamAnswer}
        activeTeam={currentTeam} // The opposite team
        transitionEndTime={transitionEndTime}
        onTransitionComplete={() => setShowTransition(false)}
      />
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      p: 2,
      justifyContent: 'space-between'
    }}>
      {/* Phase header */}
      {currentTeam && (
        <Box sx={{ pt: 1 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              textAlign: 'center', 
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {phase === 2 ? (
              <>2. fáze - rozhoduje tým <span style={{ color: currentTeam === 'blue' ? '#186CF6' : '#EF4444' }}>{currentTeam === 'blue' ? 'modrých' : 'červených'}</span></>
            ) : (
              <>1. fáze - hádá tým <span style={{ color: currentTeam === 'blue' ? '#186CF6' : '#EF4444' }}>{currentTeam === 'blue' ? 'modrých' : 'červených'}</span></>
            )}
          </Typography>
        </Box>
      )}

      {/* Center content grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        px: 4
      }}>
        {/* Timer bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {timeRemaining ?? '--'}
          </Typography>
        </Box>

        {/* Question and phase 2 content */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              textAlign: 'center',
              lineHeight: 1.3,
              fontWeight: 500
            }}
          >
            {question?.question}
          </Typography>
          
          {!currentTeam && (
            <Typography variant="h5" sx={{ textAlign: 'center', mt: 4 }}>
              Zadej svůj tip na svém telefonu
            </Typography>
          )}
          {currentTeam && phase === 2 && renderPhase2Content()}
        </Box>

        {/* Answers count bubble */}
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
            {guessCount}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt:-1.5 }}>
            {currentTeam ? 'tipů' : 'odpovědí'}
          </Typography>
        </Box>
      </Box>

      {/* Bottom content - phase 1 content only */}
      <Box>
        {/* Phase 1 content */}
        {currentTeam && phase === 1 && (
          <Box sx={{ mb: 4 }}>
            {renderPhase1Content()}
          </Box>
        )}

        {/* Button container - only show in phase 2 */}
        {currentTeam && phase === 2 && (
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            gap: 2,
            mt: 2
          }}>
            {/* Less button */}
            <Button
              variant="contained"
              sx={{ 
                backgroundColor: '#EF4444', 
                color: 'white', 
                flex: '1 1 45%',
                height: '150px', 
                fontSize: '2.5em', 
                display: 'flex',
                justifyContent: 'space-between', 
                paddingLeft: 2,
                paddingRight: 3,
                textTransform: 'none'
              }}
            >
              <ArrowDownwardIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />
              <Typography sx={{ fontSize: '1.25em', textAlign: 'center', fontWeight: 'bold', lineHeight: 1.2 }}>
                MENŠÍ
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
                {secondTeamVotes.less}
              </Typography>
            </Button>
            
            {/* More button */}
            <Button
              variant="contained"
              sx={{ 
                backgroundColor: '#186CF6', 
                color: 'white', 
                flex: '1 1 45%',
                height: '150px', 
                fontSize: '2.5em', 
                display: 'flex',
                justifyContent: 'space-between', 
                paddingLeft: 2,
                paddingRight: 3,
                textTransform: 'none'
              }}
            >
              <ArrowUpwardIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />
              <Typography sx={{ fontSize: '1.25em', textAlign: 'center', fontWeight: 'bold', lineHeight: 1.2 }}>
                VĚTŠÍ
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
                {secondTeamVotes.more}
              </Typography>
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default GuessANumberQuiz;