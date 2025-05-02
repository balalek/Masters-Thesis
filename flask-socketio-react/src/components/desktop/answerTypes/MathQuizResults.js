/**
 * @fileoverview Math Quiz Results component for displaying math quiz performance statistics in score page
 * 
 * This module provides:
 * - Summary of player performance in mathematical sequence quizzes
 * - Identification and display of the best-performing player ("Matematik kola")
 * - Identification and display of the first eliminated player
 * - Visual representation of player success rates
 * 
 * @module Components/Desktop/AnswerTypes/MathQuizResults
 */
import React, { useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

/**
 * Math Quiz Results component for displaying player statistics after math quizzes
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.sequences - Mathematical sequences used in the quiz
 * @param {Array} props.eliminatedPlayers - List of players who were eliminated
 * @param {Object} props.playerAnswers - Player answers organized by sequence
 * @returns {JSX.Element} The rendered math quiz results component
 */
const MathQuizResults = ({ sequences, eliminatedPlayers, playerAnswers }) => {
  // Calculate player statistics - keeping this for determining correct answers count
  const playerStats = useMemo(() => {
    const stats = {};
    
    Object.entries(playerAnswers || {}).forEach(([sequenceIndex, answers]) => {
      answers.forEach(answer => {
        if (!stats[answer.player]) {
          stats[answer.player] = { correctCount: 0, lastSequence: -1 };
        }
        stats[answer.player].correctCount += 1;
        // Track the highest sequence index where this player gave a correct answer
        stats[answer.player].lastSequence = Math.max(stats[answer.player].lastSequence, parseInt(sequenceIndex, 10));
      });
    });
    
    return stats;
  }, [playerAnswers]);
  
  // Find MVP (player with most correct answers)
  const mvpPlayer = useMemo(() => {
    let mvp = null;
    let maxCorrect = -1;
    
    Object.entries(playerStats).forEach(([player, stats]) => {
      if (stats.correctCount > maxCorrect) {
        mvp = player;
        maxCorrect = stats.correctCount;
      }
    });
    
    return mvp ? { name: mvp, ...playerStats[mvp] } : null;
  }, [playerStats]);
  
  // Get first victim - the player who was eliminated at the earliest sequence
  const firstVictim = useMemo(() => {
    if (!eliminatedPlayers || eliminatedPlayers.length === 0) return null;
    
    // Sort eliminated players by the sequence where they were eliminated
    // A player was eliminated after the last sequence they answered correctly
    const sortedVictims = [...eliminatedPlayers].sort((a, b) => {
      const aLastCorrect = playerStats[a]?.lastSequence ?? -1;
      const bLastCorrect = playerStats[b]?.lastSequence ?? -1;
      
      // The player with the lowest last correct answer was eliminated first
      return aLastCorrect - bLastCorrect;
    });
    
    return sortedVictims[0];
  }, [eliminatedPlayers, playerStats]);

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3,
          bgcolor: 'background.paper',
          position: 'relative',
          mx: 'auto'
        }}
      >
        {/* Stats in simple boxes */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-around',
          width: '100%',
          gap: 2
        }}>
          {/* Math Champion */}
          {mvpPlayer && (
            <Box sx={{ 
              flex: '1 1 0', 
              minWidth: { xs: '100%', sm: '45%' }, 
              textAlign: 'center',
              px: 2,
              mb: { xs: 2, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <EmojiEventsIcon sx={{ color: 'warning.main', mr: 1, fontSize: '1.5rem' }} />
                <Typography variant="h6" color="text.secondary">
                  Matematik kola
                </Typography>
              </Box>
              
              <Typography 
                variant="h3" 
                color="primary" 
                fontWeight="bold"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}
              >
                {mvpPlayer.name}
              </Typography>
              
              <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
                {mvpPlayer.correctCount} z {sequences?.length || 0} správně
              </Typography>
            </Box>
          )}
          
          {/* First Victim */}
          {firstVictim && (
            <Box sx={{ 
              flex: '1 1 0', 
              minWidth: { xs: '100%', sm: '45%' }, 
              textAlign: 'center',
              px: 2,
              mb: { xs: 2, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <SentimentVeryDissatisfiedIcon sx={{ color: 'error.main', mr: 1, fontSize: '1.5rem' }} />
                <Typography variant="h6" color="text.secondary">
                  První matematická oběť
                </Typography>
              </Box>
              
              <Typography 
                variant="h3" 
                color="primary"
                fontWeight="bold"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}
              >
                {firstVictim}
              </Typography>
              
              <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
                {playerStats[firstVictim]?.correctCount || 0} z {sequences?.length || 0} správně
              </Typography>
            </Box>
          )}
          
          {/* Show message if no data */}
          {!mvpPlayer && !firstVictim && (
            <Typography variant="h4" color="text.secondary" sx={{ textAlign: 'center', width: '100%', my: 3 }}>
              Nikdo neodpověděl
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MathQuizResults;