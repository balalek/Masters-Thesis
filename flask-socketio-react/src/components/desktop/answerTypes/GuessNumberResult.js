import React from 'react';
import { Box, Typography, Paper, Avatar, Chip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const GuessNumberResult = ({ question, correctAnswer, playerGuesses, teamMode, firstTeamAnswer, secondTeamVote }) => {
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
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            maxWidth: '800px',
            mx: 'auto'
          }}
        >
          <Typography variant="h5" gutterBottom>
            Tip prvního týmu: {firstTeamAnswer}
          </Typography>
          
          {secondTeamVote && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="h5">
                Druhý tým tipoval:
              </Typography>
              
              <Chip
                icon={secondTeamVote === 'more' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                label={secondTeamVote === 'more' ? 'VÍCE' : 'MÉNĚ'}
                color={isSecondTeamCorrect ? 'success' : 'error'}
                sx={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  py: 2,
                  px: 1
                }}
              />
              
              <Typography 
                variant="h5" 
                color={isSecondTeamCorrect ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'bold' }}
              >
                {isSecondTeamCorrect ? '✓ Správně' : '✗ Špatně'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Player guesses - show top 5 closest in free-for-all mode */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          {teamMode ? 'Tipy členů týmu:' : 'Nejbližší tipy:'}
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          maxWidth: '800px',
          mx: 'auto'
        }}>
          {(teamMode ? sortedGuesses : sortedGuesses.slice(0, 5)).map((guess, index) => {
            const distance = Math.abs(guess.value - correctAnswer);
            let accuracy;
            if (guess.value === correctAnswer) {
              accuracy = '💯 Přesně!';
            } else if (distance <= correctAnswer * 0.05) {
              accuracy = '🎯 Velmi blízko!';
            } else if (distance <= correctAnswer * 0.2) {
              accuracy = '👍 Blízko';
            } else {
              accuracy = `${((1 - distance / correctAnswer) * 100).toFixed(0)}% přesné`;
            }
            
            return (
              <Paper 
                key={index}
                elevation={2}
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor: guess.value === correctAnswer ? 'success.lighter' : 'background.paper'
                }}
              >
                {!teamMode && (
                  <Typography variant="h5" sx={{ minWidth: '30px', textAlign: 'center' }}>
                    {index + 1}.
                  </Typography>
                )}
                
                <Avatar 
                  sx={{ 
                    bgcolor: guess.playerColor || 'primary.main',
                    width: 45,
                    height: 45
                  }}
                >
                  {guess.playerName.charAt(0).toUpperCase()}
                </Avatar>
                
                <Typography variant="h6" sx={{ flex: 1 }}>
                  {guess.playerName}
                </Typography>
                
                <Typography variant="h5" sx={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>
                  {guess.value}
                </Typography>
                
                <Typography 
                  variant="body1" 
                  sx={{ 
                    opacity: 0.7,
                    minWidth: '120px'
                  }}
                >
                  {accuracy}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default GuessNumberResult;
