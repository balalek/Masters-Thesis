import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragOverlay } from '@dnd-kit/core';
import SortableQuestion from './SortableQuestion';
import { QUIZ_TYPES } from '../../../../../constants/quizValidation';

const QuestionPreview = ({ 
  questions = [], 
  onDelete = () => {}, 
  onEdit = () => {},
  onMove = () => {}
}) => {
  const [activeId, setActiveId] = useState(null);
  
  // Reset activeId when questions change
  useEffect(() => {
    setActiveId(null);
  }, [questions]);

  // Safety check for valid questions
  const validQuestions = questions?.filter(q => q && q.id) || [];

  // Check if quiz contains standalone Word Chain or Drawing without other question types
  const isStandaloneWordChain = 
    questions.length === 1 && 
    questions[0].type === QUIZ_TYPES.WORD_CHAIN;
    
  const isStandaloneDrawing = 
    questions.length === 1 && 
    questions[0].type === QUIZ_TYPES.DRAWING;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {questions.length === 0 ? (
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
          Zatím nejsou přidány žádné otázky
        </Typography>
      ) : (
        <>
          {/* Show warning for standalone Word Chain */}
          {isStandaloneWordChain && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
            >
              Slovní řetěz nelze vytvořit jako samostatný kvíz. Přidejte alespoň jednu otázku jiného typu pro vytvoření kombinovaného kvízu.
            </Alert>
          )}

          {/* Show warning for standalone Drawing */}
          {isStandaloneDrawing && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
            >
              Kreslení nelze vytvořit jako samostatný kvíz. Přidejte alespoň jednu otázku jiného typu pro vytvoření kombinovaného kvízu.
            </Alert>
          )}

          <SortableContext
            items={validQuestions.map(q => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {validQuestions.map((question, index) => (
              <SortableQuestion
                key={question.id}
                question={question}
                index={index}
                onDelete={onDelete}
                onEdit={onEdit}
                setActiveId={setActiveId}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId && validQuestions.find(q => q.id === activeId) ? (
              <Box sx={{ width: '100%' }}>
                <SortableQuestion
                  question={validQuestions.find(q => q.id === activeId)}
                  index={validQuestions.findIndex(q => q.id === activeId)}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isDragging
                />
              </Box>
            ) : null}
          </DragOverlay>
        </>
      )}
    </Box>
  );
};

export default QuestionPreview;
