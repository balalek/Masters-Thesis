/**
 * @fileoverview Blind Map Quiz component for geographical quiz display on desktop
 * 
 * This module provides:
 * - Multi-phase geography quiz system with anagram and map location phases
 * - Dynamic clue reveal system based on elapsed time
 * - Team mode support with captain-specific functionality
 * - Free-for-all mode for all players
 * - Real-time visual feedback of player/team guesses
 * - Smooth transitions between quiz phases
 * @author Bc. Martin Baláž
 * @module Components/Desktop/QuizTypes/BlindMapQuiz
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Fade, Stack } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import TeamMap from './TeamMap';
import BlindMapPhaseTransition from './BlindMapPhaseTransition';

/**
 * Blind Map Quiz component for displaying geography-based quizzes on host screen
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data with location details and clues
 * @param {number} props.question_end_time - Server timestamp when question will end
 * @param {boolean} props.isTeamMode - Whether the game is in team mode
 * @returns {JSX.Element} The rendered blind map quiz component
 */
const BlindMapQuiz = ({ question, question_end_time, isTeamMode }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState(1);
  const [cityName, setCityName] = useState('');
  const [clues, setClues] = useState(['', '', '']);
  const [visibleClues, setVisibleClues] = useState([false, false, false]);
  const [anagram, setAnagram] = useState('');
  const [mapType, setMapType] = useState('cz');
  const [teamGuesses, setTeamGuesses] = useState({ blue: [], red: [] });
  const [captainGuesses, setCaptainGuesses] = useState({ blue: null, red: null });
  const [captainPreviews, setCaptainPreviews] = useState({ blue: null, red: null });
  const [activeTeam, setActiveTeam] = useState(null);
  const [clueIndex, setClueIndex] = useState(0);
  const [hasClues, setHasClues] = useState(false);
  const [lastRevealTime, setLastRevealTime] = useState(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionEndTime, setTransitionEndTime] = useState(null);
  const [phaseEndTime, setPhaseEndTime] = useState(question_end_time);
  const socket = getSocket();

  // Timer effect with clue reveal logic
  useEffect(() => {
    if (phaseEndTime && !showTransition) { // Only run timer when not in transition
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((phaseEndTime - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
          socket.emit('time_up');
        } else {
          setTimeRemaining(remaining);
          
          // Calculate if it's time to reveal a new clue
          if (phase === 1 && clueIndex < 3) {
            const totalTime = question?.length || 30; // Total time in seconds
            const elapsedTime = totalTime - remaining;
            
            // Reveal clues at approximately 2/5, 3/5 and 4/5 of the total time
            const revealTimes = [
              totalTime * 0.2,  // after 20% elapsed
              totalTime * 0.4,  // after 40% elapsed
              totalTime * 0.6   // after 60% elapsed
            ];
            
            // Check if we've reached a reveal time and haven't revealed this clue yet
            if (elapsedTime >= revealTimes[clueIndex] && 
                (!lastRevealTime || lastRevealTime > remaining)) {
              
              // Request the next clue from the server
              socket.emit('request_next_clue', { clueIndex });
              setLastRevealTime(remaining);
            }
          }
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [phaseEndTime, socket, phase, clueIndex, lastRevealTime, question, showTransition]);

  // Initialize from question data
  useEffect(() => {
    if (question) {
      setAnagram(question.anagram || '');
      setClues([
        question.clue1 || '',
        question.clue2 || '',
        question.clue3 || ''
      ]);

      // Check if there are any non-empty clues
      setHasClues(
        Boolean(question.clue1?.trim()) || 
        Boolean(question.clue2?.trim()) || 
        Boolean(question.clue3?.trim())
      );

      setMapType(question.map_type || 'cz');
      setActiveTeam(question.active_team);
    }
  }, [question]);

  // Socket event listeners
  useEffect(() => {
    socket.on('blind_map_anagram_solved', () => {
      if (phase === 1) {
        setCorrectCount(prev => prev + 1);
      }
    });

    socket.on('blind_map_clue_revealed', (data) => {
      const newVisibleClues = [...visibleClues];
      newVisibleClues[data.clue_index] = true;
      setVisibleClues(newVisibleClues);
      setClueIndex(data.clue_index + 1); // Update current clue index
    });

    socket.on('blind_map_phase_transition', (data) => {
      setCityName(data.correctAnswer);
      setActiveTeam(data.activeTeam);
      setMapType(data.mapType);
      setPhase(data.phase || 2);
      
      // Reset the counter when transitioning to a new phase
      setCorrectCount(0);
      
      // Show transition screen
      setShowTransition(true);
      setTransitionEndTime(data.transitionEndTime);
      
      // Set the new phase end time
      setTimeout(() => {
        setShowTransition(false);
        
        // Calculate the new end time for next phase
        const newPhaseEndTime = data.transitionEndTime + (question.length * 1000);
        setPhaseEndTime(newPhaseEndTime);
      }, data.transitionEndTime - getServerTime());
    });

    socket.on('blind_map_location_submitted', (data) => {
      if (data.team) {
        // Team mode
        if (!data.isCaptain) {
          setTeamGuesses(prev => {
            // Create a new object to avoid direct mutation
            const updatedTeam = [...(prev[data.team] || []), data.guess];
            return { ...prev, [data.team]: updatedTeam };
          });
        } 
        
        if (data.isCaptain) {
          setCaptainGuesses(prev => ({
            ...prev,
            [data.team]: data.guess
          }));
        }
      }
      setCorrectCount(prev => prev + 1);
    });

    socket.on('captain_preview_update', (data) => {
      setCaptainPreviews(prev => ({
        ...prev,
        [data.team]: {
          x: data.x,
          y: data.y
        }
      }));
    });

    return () => {
      socket.off('blind_map_anagram_solved');
      socket.off('blind_map_clue_revealed');
      socket.off('blind_map_phase_transition');
      socket.off('blind_map_location_submitted');
      socket.off('captain_preview_update');
    };
  }, [socket, visibleClues, question, phase, isTeamMode]);

  /**
   * Render the anagram phase content
   * 
   * @function
   * @returns {JSX.Element} The anagram phase UI
   */
  const renderAnagramPhase = () => (
    <Box sx={{ textAlign: 'center', width: '100%' }}>
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold' }}>
        {mapType === 'cz' ? 'Město v České republice' : 'Město v Evropě'}
      </Typography>

      {/* Anagram display */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        my: 4
      }}>
        {anagram.split('').map((char, index) => (
          <Paper
            key={index}
            elevation={2}
            sx={{
              width: '40px',
              height: '50px',
              m: 0.5,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'primary.light',
              visibility: char === ' ' ? 'hidden' : 'visible',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {char}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Clues */}
      {hasClues && (
      <Box sx={{ mt: 6 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Nápovědy:
        </Typography>
        <Stack spacing={2} alignItems="center" width="100%">
          {clues.map((clue, index) => (
            <Fade key={index} in={visibleClues[index]} timeout={800} style={{ width: '100%' }}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 2, 
                  backgroundColor: visibleClues[index] ? 'primary.light' : 'grey.200',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: visibleClues[index] ? 1 : 0.3,
                  width: '100%'
                }}
              >
                <Typography variant="h5">
                  {visibleClues[index] ? clue : `Nápověda ${index + 1}`}
                </Typography>
              </Paper>
            </Fade>
          ))}
        </Stack>
      </Box>
    )}
    </Box>
  );

  /**
   * Render the map location phase for team mode
   * 
   * @function
   * @returns {JSX.Element} The team map phase UI
   */
  const renderTeamMapPhase = () => (
    <Box sx={{ textAlign: 'center', width: '100%' }}>
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold' }}>
        {cityName}
      </Typography>
      <Typography variant="h5" sx={{ mb: 4 }}>
        {phase === 2 ? (
          `Tým ${activeTeam === 'blue' ? 'modrých' : 'červených'} hádá polohu města`
        ) : (
          `Tým ${activeTeam === 'blue' ? 'modrých' : 'červených'} má druhý pokus`
        )}
      </Typography>
      {/* TeamMap component */}
      <Box sx={{ width: '100%', maxWidth: '600px', mx: 'auto', mt: 2 }}>
        <TeamMap 
          mapType={mapType} 
          teamGuesses={teamGuesses} 
          captainGuesses={captainGuesses} 
          captainPreviews={captainPreviews}
          activeTeam={activeTeam}
        />
      </Box>
    </Box>
  );

  /**
   * Render the map location phase for free-for-all mode
   * 
   * @function
   * @returns {JSX.Element} The free-for-all map phase UI
   */
  const renderFreeForAllMapPhase = () => (
    <Box sx={{ textAlign: 'center', width: '100%' }}>
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold' }}>
        {cityName}
      </Typography>
      <Typography variant="h5" sx={{ mb: 4 }}>
        Všichni hráči hádají polohu města na svém telefonu
      </Typography>
    </Box>
  );

  if (showTransition) {
    return (
      <BlindMapPhaseTransition 
        correctAnswer={cityName}
        activeTeam={activeTeam}
        transitionEndTime={transitionEndTime}
        onTransitionComplete={() => setShowTransition(false)}
        phase={phase}
        mapType={mapType}
        isTeamMode={isTeamMode}
      />
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      justifyContent: 'space-between', 
      p: 2 
    }}>

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
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {timeRemaining ?? '--'}
          </Typography>
        </Box>

        {/* Main content area */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%'
        }}>
          {phase === 1 ? (
            renderAnagramPhase()
          ) : isTeamMode ? (
            renderTeamMapPhase()
          ) : (
            renderFreeForAllMapPhase()
          )}
        </Box>

        {/* Correct answers counter */}
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
            {correctCount}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt:-1.5 }}>
            {phase === 1 ? 'odpovědí' : 'tipů'}
          </Typography>
        </Box>
      </Box>

      {/* Instructions */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {phase === 1 ? (
            'Rozlušti přesmyčku a napiš správné město na svém telefonu.'
          ) : isTeamMode ? (
            'Členové týmu volí místo, kapitán potvrzuje finální odpověď.'
          ) : (
            'Najdi a označ město na mapě na svém telefonu.'
          )}
        </Typography>
      </Box>
    </Box>
  );
};

export default BlindMapQuiz;