/**
 * @fileoverview True/False Quiz Mobile component for binary choice questions
 * 
 * This module provides:
 * - Simple binary choice interface (true/false)
 * - Visual distinction between options (square for first option, circle for second)
 * - Large touch-friendly buttons for mobile gameplay
 * 
 * @module Components/Mobile/GameSpecificScreens/TrueFalseQuizMobile
 */
import React from 'react';
import { Box, Button } from '@mui/material';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

/**
 * True/False Quiz Mobile component for binary choice questions
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onAnswer - Callback function for submitting player's answer (0 or 1)
 * @returns {JSX.Element} The rendered true/false quiz component
 */
const TrueFalseQuizMobile = ({ onAnswer }) => {
  return (
    <Box sx={{ display: 'flex', height: '100vh', gap: 2, p: 2 }}>
      <Button
        variant="contained"
        sx={{ 
          backgroundColor: '#186CF6', 
          color: 'white', 
          flex: 1,
          fontSize: '2.5em', 
          justifyContent: 'center'
        }}
        onClick={() => onAnswer(0)}
      >
        <SquareIcon sx={{ fontSize: '3em', color: 'white' }} />
      </Button>
      <Button
        variant="contained"
        sx={{ 
          backgroundColor: '#EF4444', 
          color: 'white', 
          flex: 1,
          fontSize: '2.5em', 
          justifyContent: 'center'
        }}
        onClick={() => onAnswer(1)}
      >
        <CircleIcon sx={{ fontSize: '3em', color: 'white' }} />
      </Button>
    </Box>
  );
};

export default TrueFalseQuizMobile;