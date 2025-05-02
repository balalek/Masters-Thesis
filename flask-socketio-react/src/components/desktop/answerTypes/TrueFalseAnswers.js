/**
 * @fileoverview True/False Answers component for displaying binary answer results in score page
 * 
 * This module provides:
 * - Visual representation of true/false (binary) options with distinctive shapes
 * - Highlighting of the correct answer option
 * - Display of answer counts for each option
 * - Consistent styling with other answer types
 * 
 * @module Components/Desktop/AnswerTypes/TrueFalseAnswers
 */
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

/**
 * True/False Answers component for displaying binary choice results
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data containing options
 * @param {number} props.correctAnswer - Index of the correct answer (0-1)
 * @param {Array<number>} props.answerCounts - Count of players who selected each option
 * @returns {JSX.Element} The rendered true/false answers component
 */
const TrueFalseAnswers = ({ question, correctAnswer, answerCounts }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      gap: 2
    }}>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#186CF6',
          color: 'white',
          flex: '1 1 45%',
          height: '150px',
          fontSize: '2.5em',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 2,
          paddingRight: 2,
          textTransform: 'none',
          opacity: correctAnswer === 0 ? 1 : 0.4
        }}
        startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[0]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[0]}×
        </Typography>
      </Button>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#EF4444',
          color: 'white',
          flex: '1 1 45%',
          height: '150px',
          fontSize: '2.5em',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 2,
          paddingRight: 2,
          textTransform: 'none',
          opacity: correctAnswer === 1 ? 1 : 0.4
        }}
        startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[1]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[1]}×
        </Typography>
      </Button>
    </Box>
  );
};

export default TrueFalseAnswers;