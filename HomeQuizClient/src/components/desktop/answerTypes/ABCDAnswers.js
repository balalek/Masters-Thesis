/**
 * @fileoverview ABCD Answers component for displaying multiple choice answers in score page
 * 
 * This module provides:
 * - Visual representation of the four possible answers in ABCD quiz format
 * - Distinctive styling for each answer option with unique shapes and colors
 * - Answer counts display showing how many players chose each option
 * - Highlighting of the correct answer
 * @author Bc. Martin Baláž
 * @module Components/Desktop/AnswerTypes/ABCDAnswers
 */
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

/**
 * ABCD Answers component for displaying multiple choice answers on the desktop
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data containing options
 * @param {number} props.correctAnswer - Index of the correct answer (0-3)
 * @param {Array<number>} props.answerCounts - Count of players who selected each option
 * @returns {JSX.Element} The rendered ABCD answers component
 */
const ABCDAnswers = ({ question, correctAnswer, answerCounts }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      justifyContent: 'center', 
      gap: 2
    }}>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#14A64A',
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
        startIcon={<StarIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
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
          opacity: correctAnswer === 1 ? 1 : 0.4
        }}
        startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[1]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[1]}×
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
          opacity: correctAnswer === 2 ? 1 : 0.4
        }}
        startIcon={<PentagonIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[2]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[2]}×
        </Typography>
      </Button>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#EAB308',
          color: 'white',
          flex: '1 1 45%',
          height: '150px',
          fontSize: '2.5em',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 2,
          paddingRight: 2,
          textTransform: 'none',
          opacity: correctAnswer === 3 ? 1 : 0.4
        }}
        startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
      >
        <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
          {question.options[3]}
        </Typography>
        <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
          {answerCounts[3]}×
        </Typography>
      </Button>
    </Box>
  );
};

export default ABCDAnswers;