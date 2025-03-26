import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';

const GuessANumberQuiz = ({ question, question_end_time }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [teamMode, setTeamMode] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(null); // 'blue' or 'red'
  const [phase, setPhase] = useState(1); // 1 or 2
  const [firstTeamAnswer, setFirstTeamAnswer] = useState(null);
  const [secondTeamVotes, setSecondTeamVotes] = useState({ more: 0, less: 0 });
  const [guessCount, setGuessCount] = useState(0);
  const [teamGuesses, setTeamGuesses] = useState([]); // For displaying team member guesses
  const socket = getSocket();

  // Timer effect
  useEffect(() => {
    if (question_end_time) {
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((question_end_time - now) / 1000);
        
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
  }, [question_end_time, socket]);

  // Socket listeners
  useEffect(() => {
    // Listen for game mode settings
    socket.on('game_mode_info', (data) => {
      setTeamMode(data.isTeamMode);
      if (data.isTeamMode) {
        setCurrentTeam(data.currentTeam);
        setPhase(data.phase || 1);
      }
    });

    // Listen for team guesses in phase 1
    socket.on('team_guess_submitted', (data) => {
      if (data.playerGuess) {
        setTeamGuesses(prev => [...prev, data.playerGuess]);
      }
    });

    // Listen for first team's final answer
    socket.on('first_team_answer', (data) => {
      setFirstTeamAnswer(data.answer);
      setPhase(2); // Move to phase 2
      setCurrentTeam(data.currentTeam); // Should be the second team
    });

    // Listen for second team votes
    socket.on('second_team_vote', (data) => {
      setSecondTeamVotes(data.votes);
    });

    // Listen for all number guesses (free-for-all mode)
    socket.on('guess_submitted', () => {
      setGuessCount(prev => prev + 1);
    });

    return () => {
      socket.off('game_mode_info');
      socket.off('team_guess_submitted');
      socket.off('first_team_answer');
      socket.off('second_team_vote');
      socket.off('guess_submitted');
    };
  }, [socket]);

  const renderPhase1Content = () => (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Tým {currentTeam === 'blue' ? 'modrých' : 'červených'} hádá
      </Typography>
      
      {teamGuesses.length > 0 && (
        <Paper sx={{ p: 2, maxWidth: '500px', mx: 'auto', mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Tipy členů týmu:</Typography>
          {teamGuesses.map((guess, index) => (
            <Typography key={index} variant="body1">
              {guess.playerName}: {guess.value}
            </Typography>
          ))}
        </Paper>
      )}
      
      <Typography variant="body1" color="text.secondary">
        Kapitán vybírá konečnou odpověď na svém zařízení
      </Typography>
    </Box>
  );

  const renderPhase2Content = () => (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Tým {currentTeam === 'blue' ? 'modrých' : 'červených'} rozhoduje
      </Typography>
      
      <Paper sx={{ p: 3, maxWidth: '600px', mx: 'auto', mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          První tým tipoval: {firstTeamAnswer}
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          Je správná odpověď větší nebo menší?
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
              {secondTeamVotes.less}
            </Typography>
            <Typography variant="h6">MÉNĚ</Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 4 }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="error" sx={{ fontWeight: 'bold' }}>
              {secondTeamVotes.more}
            </Typography>
            <Typography variant="h6">VÍCE</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
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
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {timeRemaining ?? '--'}
          </Typography>
        </Box>

        {/* Question and game content */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}>
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              textAlign: 'center',
              lineHeight: 1.3,
              fontWeight: 500,
              mb: 4
            }}
          >
            {question?.question}
          </Typography>

          {teamMode ? (
            phase === 1 ? renderPhase1Content() : renderPhase2Content()
          ) : (
            <Typography variant="h5" sx={{ textAlign: 'center', mt: 4 }}>
              Zadej svůj tip na svém telefonu
            </Typography>
          )}
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
            {teamMode ? 'tipů' : 'odpovědí'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default GuessANumberQuiz;
