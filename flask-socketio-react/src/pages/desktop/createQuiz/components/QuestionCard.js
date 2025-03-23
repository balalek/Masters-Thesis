import React, { useState, useEffect } from 'react';
import { 
  ListItem,
  ListItemText,
  Checkbox,
  Typography,
  IconButton,
  Collapse,
  Box,
  Stack,
  Chip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { QUESTION_TYPES } from '../../../../constants/quizValidation';

const QuestionCard = ({ 
  question, 
  isSelected, 
  onToggleSelect,
  expandedQuestionId,
  onExpandToggle
}) => {
  const isExpanded = expandedQuestionId === question.id;
  
  const handleExpandClick = (event) => {
    event.stopPropagation();
    onExpandToggle(isExpanded ? null : question.id);
  };

  // Determine question type label
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

  // Render appropriate content based on question type
  const renderContent = () => {
    if (question.type === QUESTION_TYPES.MATH_QUIZ) {
      // Improved, more compact display for Math Quiz questions
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
                  color: 'text.primary' // Ensure text is using default color
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
