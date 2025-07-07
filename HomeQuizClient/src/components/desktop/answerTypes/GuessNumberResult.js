/**
 * @fileoverview Guess Number Result component for displaying number guessing quiz results in score page
 * 
 * This module provides:
 * - Display of correct answer in number guessing games
 * - Team mode visualization with first team guess and second team vote
 * - Free-for-all mode visualization with closest player guesses
 * - Winner highlighting for team mode competitions
 * @author Bc. Martin Baláž
 * @module Components/Desktop/AnswerTypes/GuessNumberResult
 */
import React from 'react';
import { Box, Typography, Paper, Avatar, Chip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * Guess Number Result component for showing numerical guessing game outcomes
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.correctAnswer - The correct answer value
 * @param {Array} props.playerGuesses - Player guesses with player information
 * @param {boolean} props.teamMode - Whether the game was played in team mode
 * @param {number} props.firstTeamAnswer - First team's numerical guess
 * @param {string} props.secondTeamVote - Second team's vote ('more' or 'less')
 * @returns {JSX.Element} The rendered guess number result component
 */
const GuessNumberResult = ({ correctAnswer, playerGuesses, teamMode, firstTeamAnswer, secondTeamVote }) => {
  // Sort guesses by distance from correct answer if in free-for-all mode
  const sortedGuesses = teamMode ? 
    playerGuesses : 
    [...playerGuesses].sort((a, b) => {
      const diffA = Math.abs(a.value - correctAnswer);
      const diffB = Math.abs(b.value - correctAnswer);
      return diffA - diffB;
    });

  // Determine if second team was correct
  const isSecondTeamCorrect = teamMode && secondTeamVote ? 
    (correctAnswer > firstTeamAnswer && secondTeamVote === 'more') || 
    (correctAnswer < firstTeamAnswer && secondTeamVote === 'less') : 
    false;

  // Determine which team won (first team wins if they guessed exactly, second team wins if they guessed correctly higher/lower)
  const secondTeamWon = isSecondTeamCorrect;
  const firstTeamWon = !secondTeamWon;

  return (
    <Box sx={{ p: 3 }}>
      {/* Correct answer display */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: '#14A64A',
          color: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 2,
          maxWidth: '800px',
          mx: 'auto'
        }}
      >
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
          Správná odpověď: {correctAnswer}
        </Typography>
      </Paper>
      
      {/* Team mode results */}
      {teamMode && firstTeamAnswer && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 3,
          maxWidth: '800px',
          mx: 'auto'
        }}>
          {/* First team answer */}
          <Paper
            elevation={2}
            sx={{
              px: 4,
              py: 2,
              borderRadius: 2,
              flex: 1,
              border: firstTeamWon ? '3px solid #14A64A' : 'none',
              backgroundColor: firstTeamWon ? 'rgba(20, 166, 74, 0.1)' : 'background.paper',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {firstTeamWon && (
              <Chip 
                label="VÍTĚZ" 
                color="success" 
                sx={{ 
                  position: 'absolute', 
                  top: -12, 
                  right: 16, 
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              />
            )}
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontSize: '1.8rem' }}>
              Hádající tým
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
              {firstTeamAnswer}
            </Typography>
          </Paper>
          
          {/* Second team answer - always show in team mode */}
          <Paper
            elevation={2}
            sx={{
              px: 4,
              py: 2,
              borderRadius: 2,
              flex: 1,
              border: secondTeamWon ? '3px solid #14A64A' : 'none',
              backgroundColor: secondTeamWon ? 'rgba(20, 166, 74, 0.1)' : 'background.paper',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {secondTeamWon && (
              <Chip 
                label="VÍTĚZ" 
                color="success" 
                sx={{ 
                  position: 'absolute', 
                  top: -12, 
                  right: 16, 
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              />
            )}
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontSize: '1.8rem' }}>
              Hlasující tým
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
              {secondTeamVote ? (
                <Chip
                  icon={secondTeamVote === 'more' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  label={secondTeamVote === 'more' ? 'VĚTŠÍ' : 'MENŠÍ'}
                  color={secondTeamWon ? 'success' : 'error'}
                  sx={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    py: 3,
                    px: 2,
                    '& .MuiChip-icon': {
                      fontSize: '2rem'
                    }
                  }}
                />
              ) : (
                <Typography variant="h4" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Nehlasoval
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      )}
      
      {/* Player guesses - only show in free-for-all mode */}
      {!teamMode && sortedGuesses.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Nejbližší tipy:
          </Typography>
          
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'center',
            maxWidth: '1200px',
            mx: 'auto'
          }}>
            {sortedGuesses.slice(0, 3).map((guess, index) => {
              const isExact = guess.value === correctAnswer;
              return (
                <Paper 
                  key={index}
                  elevation={3}
                  sx={{ 
                    p: 3, 
                    display: 'flex', 
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    bgcolor: isExact ? 'rgba(20, 166, 74, 0.1)' : 'background.paper',
                    border: isExact ? '2px solid #14A64A' : 'none',
                    flex: '1 1 350px',
                    maxWidth: '400px',
                    borderRadius: 2,
                    position: 'relative'
                  }}
                >
                  {index === 0 && (
                    <Chip 
                      label="NEJBLÍŽE" 
                      color="primary" 
                      sx={{ 
                        position: 'absolute', 
                        top: -12, 
                        right: 16, 
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}
                    />
                  )}
                  <Avatar 
                    sx={{ 
                      bgcolor: guess.playerColor || 'primary.main',
                      width: 65,
                      height: 65,
                      fontSize: '1.8rem',
                      color: 'white',
                      mr: 5
                    }}
                  >
                    {guess.playerName.charAt(0).toUpperCase()}
                  </Avatar>
                  
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {guess.value}
                    </Typography>
                    
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                      {guess.playerName}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GuessNumberResult;