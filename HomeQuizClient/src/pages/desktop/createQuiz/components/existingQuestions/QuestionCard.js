/**
 * @fileoverview Question Card component for displaying existing questions
 * 
 * This component provides:
 * - Collapsible question preview with toggle functionality
 * - Selectable interface for adding questions to quiz
 * - Type-specific content displays for different question types
 * - Visual feedback for correct/incorrect answers
 * - Compact display of question metadata
 * @author Bc. Martin Baláž
 * @module Components/Desktop/CreateQuiz/ExistingQuestions/QuestionCard
 */
import React from 'react';
import { 
  ListItem,
  ListItemText,
  Checkbox,
  Typography,
  IconButton,
  Collapse,
  Box,
  Stack
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { QUESTION_TYPES } from '../../../../../constants/quizValidation';

/**
 * Question Card component for displaying individual quiz questions
 * 
 * Renders a collapsible card with question details, expandable content based on
 * question type, and a checkbox for selection. Handles various question types with
 * custom display formats.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data to display
 * @param {boolean} props.isSelected - Whether this question is selected
 * @param {Function} props.onToggleSelect - Handler for selection toggle
 * @param {string|null} props.expandedQuestionId - ID of currently expanded question
 * @param {Function} props.onExpandToggle - Handler for expand/collapse toggle
 * @returns {JSX.Element} The rendered question card
 */
const QuestionCard = ({ 
  question, 
  isSelected, 
  onToggleSelect,
  expandedQuestionId,
  onExpandToggle
}) => {
  const isExpanded = expandedQuestionId === question.id;
  
  /**
   * Handle card expansion toggle
   * 
   * Toggles between expanded and collapsed states for question details.
   * 
   * @function handleExpandClick
   * @param {Event} event - Click event
   */
  const handleExpandClick = (event) => {
    event.stopPropagation();
    onExpandToggle(isExpanded ? null : question.id);
  };

  /**
   * Get human-readable question type label
   * 
   * Converts internal question type to user-friendly display name.
   * 
   * @function getQuestionTypeLabel
   * @returns {string} Human-readable question type
   */
  const getQuestionTypeLabel = () => {
    switch(question.type) {
      case QUESTION_TYPES.ABCD: 
        return 'ABCD';
      case QUESTION_TYPES.TRUE_FALSE: 
        return 'Pravda/Lež';
      case QUESTION_TYPES.OPEN_ANSWER: 
        return 'Otevřená odpověď';
      case QUESTION_TYPES.GUESS_A_NUMBER:
        return 'Hádej číslo';
      case QUESTION_TYPES.MATH_QUIZ:
        return 'Matematické rovnice';
      case QUESTION_TYPES.BLIND_MAP:
        return 'Slepá mapa';
      default: 
        return question.type;
    }
  };

  /**
   * Render type-specific question content
   * 
   * Displays different content formats based on question type:
   * - Math Quiz: Shows equation sequences
   * - Blind Map: Shows city anagram and map information
   * - Multiple Choice: Shows answer options with correct/incorrect indicators
   * - Open Answer: Shows answer and media type information
   * 
   * @function renderContent
   * @returns {JSX.Element} Type-specific question content
   */
  const renderContent = () => {
    if (question.type === QUESTION_TYPES.MATH_QUIZ) {
      return (
        <Box sx={{ 
          p: 2, 
          pl: 4,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Stack spacing={1}>
            {question.sequences?.slice(0, 5).map((seq, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography variant="body2">
                  {seq.equation} = <span style={{ color: '#4caf50', fontWeight: 500 }}>{seq.answer}</span>
                </Typography>
              </Box>
            ))}
            {question.sequences && question.sequences.length > 5 && (
              <Typography variant="body2" color="text.secondary">
                +{question.sequences.length - 5} více rovnic...
              </Typography>
            )}
          </Stack>
        </Box>
      );
    }

    if (question.type === QUESTION_TYPES.BLIND_MAP) {
      return (
        <Box sx={{ 
          p: 2, 
          pl: 4,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Stack spacing={1}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography variant="body2">
                {question.anagram || 'Přesmyčka není uvedena'} = <span style={{ color: '#4caf50', fontWeight: 500 }}>{question.cityName || question.city_name || 'Město není uvedeno'}</span>
              </Typography>
            </Box>
            
            {isExpanded && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1,
                  mt: 1
                }}
              >
                <Typography variant="body2">
                  Mapa: {question.mapType === 'cz' ? 'Česká republika' : 'Evropa'}
                  {(question.clue1 || question.clue2 || question.clue3) && 
                    `, Nápovědy: ${[question.clue1, question.clue2, question.clue3].filter(Boolean).length}`}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      );
    }

    // For other question types, use the standard answers display
    return (
      <Box sx={{ 
        p: 2, 
        pl: 4,
        bgcolor: 'action.hover',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Stack spacing={1}>
          {question.answers.map((answer, index) => (
            <Box 
              key={index}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}
            >
              {answer.isCorrect ? 
                <CheckCircleIcon color="success" fontSize="small" /> : 
                <CancelIcon color="error" fontSize="small" />
              }
              <Typography
                variant="body2"
                sx={{
                  fontWeight: answer.isCorrect ? 500 : 400,
                  color: 'text.primary'
                }}
              >
                {answer.text}
              </Typography>
            </Box>
          ))}
          
          {/* Show media type info for open answers if available */}
          {question.type === QUESTION_TYPES.OPEN_ANSWER && question.media_type && (
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              {question.media_type === 'image' 
                ? `Obrázek${question.show_image_gradually ? ' (postupné odkrývání)' : ''}` 
                : 'Audio'}
            </Typography>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <>
      {/* Question Card Header */}
      <ListItem 
        sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          transition: 'background-color 0.2s'
        }}
        secondaryAction={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              edge="end" 
              onClick={handleExpandClick}
              sx={{ 
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
            <Checkbox
              edge="end"
              checked={isSelected}
              onChange={() => onToggleSelect(question)}
            />
          </Box>
        }
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                component="div" 
                variant="body1" 
                sx={{ 
                  fontWeight: isSelected ? 500 : 400,
                  mb: 0.5
                }}
              >
                {question.type === QUESTION_TYPES.MATH_QUIZ 
                  ? 'Matematické rovnice' 
                  : question.text}
              </Typography>
            </Box>
          }
          secondary={
            <Typography 
              component="div" 
              variant="body2" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'text.secondary'
              }}
            >
              <span style={{ color: 'primary.main' }}>
                {getQuestionTypeLabel()}
              </span>
              <span>•</span>
              <span>Hráno {question.timesPlayed}×</span>
              <span>•</span>
              <span>{question.quizName}</span>
            </Typography>
          }
        />
      </ListItem>
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        {renderContent()}
      </Collapse>
    </>
  );
};

export default QuestionCard;