import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragOverlay } from '@dnd-kit/core';
import SortableQuestion from './SortableQuestion';

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
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
    </Box>
  );
};

export default QuestionPreview;
