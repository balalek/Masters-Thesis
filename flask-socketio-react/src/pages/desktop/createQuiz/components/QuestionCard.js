import React, { useState } from 'react';
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
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { QUESTION_TYPES } from '../../../../constants/quizValidation';

const QuestionCard = ({ 
  question, 
  isSelected, 
  onToggleSelect 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandClick = (event) => {
    event.stopPropagation();
    setIsExpanded(!isExpanded);
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
      default: 
        return question.type;
    }
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
            <Typography 
              component="div" 
              variant="body1" 
              sx={{ 
                fontWeight: isSelected ? 500 : 400,
                mb: 0.5
              }}
            >
              {question.text}
            </Typography>
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
      </Collapse>
    </>
  );
};

export default QuestionCard;
