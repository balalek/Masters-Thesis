/**
 * @fileoverview Sortable Question component for drag-and-drop question management
 * 
 * This component provides:
 * - Draggable question items for reordering in a quiz
 * - Type-specific content rendering for different question types
 * - Edit and delete actions for questions
 * - Visual feedback during drag operations
 * - Contextual information display based on question properties
 * @author Bc. Martin Baláž
 * @module Components/Desktop/CreateQuiz/QuestionPreview/SortableQuestion
 */
import React, { useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import { QUESTION_TYPES, QUIZ_TYPES } from '../../../../../constants/quizValidation';

/**
 * Sortable Question component for displaying and managing quiz questions
 * 
 * Renders a draggable question item with type-specific content display,
 * edit/delete controls, and visual feedback during drag operations.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data object with type-specific properties
 * @param {number} props.index - Question's position in the list (zero-based)
 * @param {Function} props.onDelete - Callback for question deletion
 * @param {Function} props.onEdit - Callback for question editing
 * @param {Function} props.setActiveId - Handler to set active drag item ID
 * @param {boolean} props.isDragging - Whether this question is currently being dragged
 * @returns {JSX.Element} The rendered sortable question component
 */
const SortableQuestion = ({ question, index, onDelete, onEdit, setActiveId, isDragging }) => {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: question.id,
    data: question 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%',
    opacity: isSortableDragging ? 0.4 : 1,
  };

  /**
   * Renders question content based on question type
   * 
   * Provides different layouts and information display for:
   * - Math Quiz: Shows equations with answers and time limits
   * - Open Answer: Shows correct answer and media information
   * - Guess a Number: Shows correct numeric answer
   * - Blind Map: Shows city name, anagram, and clues
   * - ABCD/True-False: Shows answer options with correct answer highlighted
   * 
   * @function renderQuestionContent
   * @returns {JSX.Element} Type-specific question content
   */
  const renderQuestionContent = () => {
    if (question.type === QUESTION_TYPES.MATH_QUIZ || question.type === QUIZ_TYPES.MATH_QUIZ) {
      // Check for both possible type values to be safe
      return (
        <Box sx={{ width: '100%' }}>
          {question.sequences && question.sequences.length > 0 ? (
            question.sequences.map((seq, seqIndex) => (
              <Box
                key={seqIndex}
                sx={{
                  p: 1,
                  my: 0.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <Typography align="left">
                  {seq.equation}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography 
                    align="right" 
                    sx={{ 
                      color: 'success.main',
                      fontWeight: 'bold',
                      minWidth: '30px'
                    }}
                  >
                    = {seq.answer}
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{ 
                      color: 'text.secondary',
                      minWidth: '30px'
                    }}
                  >
                    {seq.length}s
                  </Typography>
                </Box>
              </Box>
            ))
          ) : (
            <Typography color="error">No equation sequences found</Typography>
          )}
        </Box>
      );
    } else if (question.type === QUESTION_TYPES.OPEN_ANSWER) {
      return (
        <>
          <Box
            sx={{
              p: 1,
              my: 0.5,
              bgcolor: 'success.light',
              borderRadius: 1,
              width: '100%'
            }}
          >
            <Typography align="left">
              Správná odpověď: {question.answer}
            </Typography>
          </Box>
          {question.mediaType && (
            <Box sx={{ mt: 1, color: 'text.secondary' }}>
              <Typography variant="body2">
                {question.mediaType === 'image' ? 'Obrázek' : 'Audio'}: {question.fileName || 'Soubor'}
                {question.showImageGradually && question.mediaType === 'image' && ' (postupné odkrývání)'}
              </Typography>
            </Box>
          )}
        </>
      );
    } else if (question.type === QUESTION_TYPES.GUESS_A_NUMBER) {
      return (
        <Box
          sx={{
            p: 1,
            my: 0.5,
            bgcolor: 'success.light',
            borderRadius: 1,
            width: '100%'
          }}
        >
          <Typography align="left">
            Správná odpověď: {question.answer}
          </Typography>
        </Box>
      );
    } else if (question.type === QUESTION_TYPES.BLIND_MAP){
      return (
        <>
          <Box
            sx={{
              p: 1,
              my: 0.5,
              bgcolor: 'success.light',
              borderRadius: 1,
              width: '100%'
            }}
          >
            <Typography align="left">
              Správná odpověď: {question.cityName}
            </Typography>
          </Box>
          {question.anagram && (
            <Box
              sx={{
                p: 1,
                my: 0.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                width: '100%'
              }}
            >
              <Typography align="left">
                Přesmyčka: {question.anagram}
              </Typography>
            </Box>
          )}
          {(question.clue1 || question.clue2 || question.clue3) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Nápovědy:</Typography>
              {question.clue1 && <Typography variant="body2">1. {question.clue1}</Typography>}
              {question.clue2 && <Typography variant="body2">2. {question.clue2}</Typography>}
              {question.clue3 && <Typography variant="body2">3. {question.clue3}</Typography>}
            </Box>
          )}
        </>
      );
    }
    
    return question.answers?.map((answer, ansIndex) => (
      <Box
        key={ansIndex}
        sx={{
          p: 1,
          my: 0.5,
          bgcolor: ansIndex === question.correctAnswer ? 'success.light' : 'action.hover',
          borderRadius: 1,
          width: '100%'
        }}
      >
        <Typography align="left">
          {answer}
        </Typography>
      </Box>
    ));
  };

  return (
    <Box 
      ref={setNodeRef} 
      style={style}
      sx={{ 
        width: '100%',
        position: 'relative',
        ...(isDragging && {
          cursor: 'grabbing',
        })
      }}
    >
      <Paper elevation={isDragging ? 4 : 2} sx={{ position: 'relative', p: 2 }}>
        <Box sx={{ 
          position: 'absolute', 
          right: 8,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          py: 1
        }}>
          <IconButton 
            size="small" 
            color="info"
            onClick={() => onEdit?.(question)}
          >
            <EditIcon />
          </IconButton>

          <IconButton 
            size="small" 
            sx={{ cursor: 'grab' }} 
            {...attributes} 
            {...listeners}
            onMouseDown={() => setActiveId?.(question.id)}
            onTouchStart={() => setActiveId?.(question.id)}
          >
            <DragIndicatorIcon />
          </IconButton>

          <IconButton size="small" color="error" onClick={() => onDelete?.(question.id)}>
            <DeleteIcon />
          </IconButton>

        </Box>
        
        <Box sx={{ pr: 5, textAlign: 'left' }}>
          <Typography variant="h6">Otázka {index + 1}</Typography>
          {question.type === QUESTION_TYPES.MATH_QUIZ || question.type === QUIZ_TYPES.MATH_QUIZ ? (
            <Typography sx={{ mt: 1 }}>Matematické rovnice</Typography>
          ) : question.type === QUESTION_TYPES.WORD_CHAIN || question.type === QUIZ_TYPES.WORD_CHAIN ? (
            <Typography sx={{ mt: 1 }}>Slovní řetěz</Typography>
          ) : question.type === QUESTION_TYPES.DRAWING || question.type === QUIZ_TYPES.DRAWING ? (
            <Typography sx={{ mt: 1 }}>Kreslení</Typography>
          ) : (
            <Typography sx={{ mt: 1 }}>{question.question}</Typography>
          )}
          
          <Box sx={{ mt: 2 }}>
            {renderQuestionContent()}
          </Box>
          
          {/* Conditionally show different information based on question type */}
          {question.type === QUESTION_TYPES.MATH_QUIZ ? (
            // Hide time and category for math quiz questions
            null
          ) : question.type === QUESTION_TYPES.WORD_CHAIN ? (
            // Show only time for word chain, rounds is always 1
            <Box sx={{ mt: 2, display: 'flex', gap: 2, color: 'text.secondary' }}>
              <Typography variant="body2">Čas: {question.length}s na hráče</Typography>
            </Box>
          ) : question.type === QUESTION_TYPES.DRAWING ? (
            // Show time and rounds for drawing questions
            <Box sx={{ mt: 2, display: 'flex', gap: 2, color: 'text.secondary' }}>
              <Typography variant="body2">Čas: {question.length || question.timeLimit}s na hráče</Typography>
              <Typography variant="body2">Počet kol: {question.rounds || 1}</Typography>
            </Box>
          ) : (
            // Default display for other question types
            <Box sx={{ mt: 2, display: 'flex', gap: 2, color: 'text.secondary' }}>
              <Typography variant="body2">Čas: {question.length || question.timeLimit}s</Typography>
              {question.type === QUESTION_TYPES.BLIND_MAP ? (
                <>
                  <Typography variant="body2">
                    Mapa: {question.mapType === 'cz' ? 'Česká republika' : 'Evropa'}
                  </Typography>
                  <Typography variant="body2">
                    Náročnost: {question.radiusPreset === 'EASY' ? 'Snadnější' : 'Obtížnější'}
                  </Typography>
                </>
              ) : (
                question.category && <Typography variant="body2">Kategorie: {question.category}</Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SortableQuestion;