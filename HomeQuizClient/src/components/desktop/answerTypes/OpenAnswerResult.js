/**
 * @fileoverview Open Answer Result component for displaying text-based answer results in score page
 * 
 * This module provides:
 * - Display of the correct text answer
 * - Count of players who answered correctly
 * - Showcase of interesting incorrect answers
 * - Visual distinction between correct and incorrect responses
 * @author Bc. Martin Baláž
 * @module Components/Desktop/AnswerTypes/OpenAnswerResult
 */
import React from 'react';
import { Box, Typography, Paper, Avatar, Divider } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Open Answer Result component for displaying text-based answer outcomes
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data including correct answer and player answers
 * @returns {JSX.Element} The rendered open answer result component
 */
const OpenAnswerResult = ({ question }) => {
  const correctAnswer = question.correctAnswer || '';
  const playerAnswers = question.playerAnswers || [];

  const correctAnswers = playerAnswers.filter(a => a.is_correct);
  const incorrectAnswers = playerAnswers.filter(a => !a.is_correct);
  
  // Limit interesting answers to 3 maximum for better focus
  const maxInterestingAnswers = 3;

  return (
    <Box sx={{ p: 3 }}>
      {/* Correct answer with count */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: '#14A64A', // Green color as usual for correct answers
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 2,
          maxWidth: '800px',
          mx: 'auto'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {correctAnswer}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', ml: 2 }}>
          {correctAnswers.length}×
        </Typography>
      </Paper>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Interesting answers section */}
      {incorrectAnswers.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Nejzajímavější pokusy ({Math.min(incorrectAnswers.length, maxInterestingAnswers)}/{incorrectAnswers.length})
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'center'
          }}>
            {incorrectAnswers.slice(0, maxInterestingAnswers).map((answer, index) => (
              <Paper 
                key={`incorrect-${index}`}
                elevation={3}
                sx={{ 
                  p: 4, 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: 'error.light',
                  flex: '1 1 500px',
                  maxWidth: '600px',
                  borderRadius: 2,
                  mb: 2
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: answer.player_color || 'primary.main',
                    width: 52,
                    height: 52,
                    fontSize: '1.5rem'
                  }}
                >
                  {answer.player_name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ ml: 1, flex: 1 }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                    "{answer.answer}"
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.6)' }}>
                    — {answer.player_name}
                  </Typography>
                </Box>
                <CancelIcon color="error" sx={{ fontSize: 36 }} />
              </Paper>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OpenAnswerResult;