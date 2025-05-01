/**
 * @fileoverview QuizListItem component - displays a quiz card in the quiz library (desktop home page).
 * @module Pages/Desktop/HomePage/QuizListItem
 */
import React from 'react';
import { Box, Typography, IconButton, Paper, Divider, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizIcon from '@mui/icons-material/Abc';
import MapIcon from '@mui/icons-material/Map';
import DrawIcon from '@mui/icons-material/Draw';
import LinkIcon from '@mui/icons-material/Link';
import CalculateIcon from '@mui/icons-material/Calculate';
import Filter1Icon from '@mui/icons-material/Filter1';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import QuestionAnswerIcon from '@mui/icons-material/EditNote';
import { useNavigate } from 'react-router-dom';
import { QUIZ_TYPE_TRANSLATIONS, QUIZ_TYPES } from '../../../constants/quizValidation';

/**
 * Mapping of quiz types to their respective icon components
 * @type {Object.<string, React.ComponentType>}
 */
const quizTypeIcons = {
  [QUIZ_TYPES.ABCD]: QuizIcon,
  [QUIZ_TYPES.OPEN_ANSWER]: QuestionAnswerIcon,
  [QUIZ_TYPES.BLIND_MAP]: MapIcon,
  [QUIZ_TYPES.DRAWING]: DrawIcon,
  [QUIZ_TYPES.WORD_CHAIN]: LinkIcon,
  [QUIZ_TYPES.MATH_QUIZ]: CalculateIcon,
  [QUIZ_TYPES.GUESS_A_NUMBER]: Filter1Icon,
  [QUIZ_TYPES.COMBINED_QUIZ]: ShuffleIcon,
};

/**
 * Quiz list item component that displays a quiz as a card
 * 
 * Renders a Material UI card with quiz details including:
 * - Quiz name and type
 * - Number of questions
 * - Action buttons for playing, editing, sharing, and deleting
 * - Different display modes for regular, public, and unfinished quizzes
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.quiz - Quiz data object with quiz details
 * @param {string} props.quiz.name - Name of the quiz
 * @param {string} props.quiz.type - Type of the quiz from QUIZ_TYPES
 * @param {number} props.quiz.questionCount - Number of questions in the quiz
 * @param {boolean} props.quiz.is_public - Whether the quiz is publicly shared
 * @param {string} props.quiz._id - MongoDB ID of the quiz
 * @param {boolean} [props.isPublic=false] - Whether this quiz is publicly shared
 * @param {boolean} [props.isUnfinished=false] - Whether this quiz is an unfinished draft
 * @param {Function} [props.onEditPublic] - Handler for editing public quizzes
 * @param {Function} [props.onToggleShare] - Handler for toggling public/private status
 * @param {Function} [props.onEdit] - Handler for editing the quiz
 * @param {Function} [props.onDelete] - Handler for deleting the quiz
 * @param {Function} [props.onContinue] - Handler for continuing unfinished quizzes
 * @returns {React.ReactElement} Rendered quiz card
 */
const QuizListItem = ({ 
  quiz, 
  isPublic = false, 
  isUnfinished = false,
  onEditPublic, 
  onToggleShare, 
  onEdit, 
  onDelete,
  onContinue
}) => {
  const navigate = useNavigate();

  /**
   * Navigate to the quiz room page to start playing the quiz
   * 
   * @function handleStartQuiz
   */
  const handleStartQuiz = () => {
    if (!isUnfinished) {
      navigate('/room', { state: { quizId: quiz._id } });
    }
  };

  /**
   * Handle edit button click based on quiz type
   * 
   * @function handleEdit
   */
  const handleEdit = () => {
    if (!quiz) return;
    onEdit && onEdit(quiz);
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        mb: 2,
        maxWidth: 300,
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
    >
      {/* Card Header */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            mb: 1,
            height: '4.5em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            textAlign: 'left'
          }}
        >
          {quiz.name || 'Nepojmenovaný kvíz'}
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2.5
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1
          }}>
            {!isUnfinished && quizTypeIcons[quiz.type] && React.createElement(quizTypeIcons[quiz.type], { 
              sx: { 
                fontSize: '1.3rem',
                opacity: 0.9
              } 
            })}
            <Typography 
              variant="body1" 
              color="text.primary" 
              sx={{ 
                fontWeight: 500,
                fontSize: '1.05rem'
              }}
            >
              {isUnfinished 
                ? (quiz.is_editing ? 'Úprava kvízu' : 'Nový kvíz') 
                : (QUIZ_TYPE_TRANSLATIONS[quiz.type] || quiz.type)
              }
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
            {isUnfinished
              ? (quiz.question_count || 0)
              : (quiz.questionCount || quiz.questions?.length || 0)
            } otázek
          </Typography>
        </Box>
      </Box>
      
      <Divider />
      
      {/* Card Actions */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        px: 1,
        py: 0.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 0
      }}>
        {isUnfinished ? (
          <>
            <Tooltip title="Pokračovat v práci">
              <IconButton 
                color="primary" 
                size="medium"
                onClick={() => onContinue && onContinue(quiz)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                alignSelf: 'center',
                fontSize: '0.75rem'
              }}
            >
              Upraveno: {new Date(quiz.last_updated).toLocaleDateString()}
            </Typography>
            
            <Tooltip title="Smazat rozdělaný kvíz">
              <IconButton 
                color="error" 
                size="medium"
                onClick={() => onDelete && onDelete(quiz)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Hrát kvíz">
              <IconButton color="primary" size="medium" onClick={handleStartQuiz}>
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>
            
            {/* Show creation date for public quizzes */}
            {isPublic && quiz.creation_date && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  alignSelf: 'center',
                  fontSize: '0.75rem'
                }}
              >
                Vytvořeno: {new Date(quiz.creation_date).toLocaleDateString()}
              </Typography>
            )}
            
            <Tooltip title={isPublic ? "Kopírovat a upravit" : "Upravit kvíz"}>
              <IconButton 
                color="primary" 
                size="medium"
                onClick={isPublic 
                  ? () => onEditPublic && onEditPublic(quiz) 
                  : handleEdit
                }
              >
                <EditIcon />
              </IconButton>
            </Tooltip>

            {/* For private quizzes with multiple buttons, show share button */}
            {!isPublic && (
              <Tooltip title={quiz.is_public ? "Skrýt kvíz" : "Zveřejnit kvíz"}>
                <IconButton 
                  color="primary" 
                  size="medium"
                  onClick={() => onToggleShare && onToggleShare(quiz)}
                >
                  <ShareIcon 
                    sx={{ 
                      transform: quiz.is_public ? 'rotate(90deg)' : 'none',
                      opacity: quiz.is_public ? 0.6 : 1,
                      transition: 'transform 0.2s, opacity 0.2s'
                    }} 
                  />
                </IconButton>
              </Tooltip>
            )}
            
            {!isPublic && (
              <Tooltip title="Smazat kvíz">
                <IconButton 
                  color="error" 
                  size="medium"
                  onClick={() => onDelete && onDelete(quiz)}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};

export default QuizListItem;