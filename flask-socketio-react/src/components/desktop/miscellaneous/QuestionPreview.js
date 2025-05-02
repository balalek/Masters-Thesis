/**
 * @fileoverview Question Preview component with countdown timer
 * 
 * This component provides:
 * - Visual preview of the upcoming question text
 * - Server-synchronized countdown to question start
 * - Automatic transition to game screen when time expires
 * - Centered layout with prominent countdown display
 * 
 * @module Components/Desktop/Miscellaneous/QuestionPreview
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getServerTime } from '../../../utils/socket';
import { QUESTION_TYPES, QUESTION_TYPE_TRANSLATIONS } from '../../../constants/quizValidation';

/**
 * Question Preview component for pre-question display
 * 
 * Shows the question text with a countdown timer, then calls
 * the completion callback when the timer reaches zero.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.question - The question text to display
 * @param {Function} props.onPreviewComplete - Callback when countdown completes
 * @param {number} props.showAt - Server timestamp (ms) when to start the question
 * @returns {JSX.Element} The rendered question preview component
 */
const QuestionPreview = ({ question, onPreviewComplete, showAt }) => {
  const [count, setCount] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getServerTime();
      const remaining = Math.ceil((showAt - now) / 1000);

      if (remaining <= 0) {
        clearInterval(timer);
        onPreviewComplete();
        return;
      }

      setCount(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [onPreviewComplete, showAt]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: 4,
      padding: 4
    }}>
      {/* Question type display for specific question types */}
      {question?.type && 
       question.type !== QUESTION_TYPES.BLIND_MAP &&
       question.type !== QUESTION_TYPES.MATH_QUIZ && (
        <Typography 
          variant="h4" 
          component="div" 
          sx={{
            color: '#3B82F6',
            fontWeight: 'medium',
            mb: -2
          }}
        >
          {QUESTION_TYPE_TRANSLATIONS[question.type]}
        </Typography>
      )}
      
      <Typography 
        variant="h2" 
        component="div" 
        sx={{ 
          textAlign: 'center',
          maxWidth: '80%',
          whiteSpace: 'pre-line'
        }}
      >
        {question?.type === QUESTION_TYPES.BLIND_MAP 
          ? `${question?.question} - ${question?.map_type === 'cz' ? 'Česká republika' : 'Evropa'}`
          : question?.question}
      </Typography>
      <Typography variant="h1" sx={{
        fontSize: '5rem',
        fontWeight: 'bold',
        color: '#3B82F6'
      }}>
        {count}
      </Typography>
    </Box>
  );
};

export default QuestionPreview;