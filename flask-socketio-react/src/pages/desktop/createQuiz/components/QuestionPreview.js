import React, { useState } from 'react';
import { Box } from '@mui/material';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragOverlay } from '@dnd-kit/core';
import SortableQuestion from './SortableQuestion';

const QuestionPreview = ({ questions = [], onDelete, onEdit }) => {
  const [activeId, setActiveId] = useState(null);

  if (!questions) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      <SortableContext
        items={questions.map(q => q.id)}
        strategy={verticalListSortingStrategy}
      >
        {questions.map((question, index) => (
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
        {activeId ? (
          <Box sx={{ width: '100%' }}>
            <SortableQuestion
              question={questions.find(q => q.id === activeId)}
              index={questions.findIndex(q => q.id === activeId)}
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

QuestionPreview.defaultProps = {
  questions: [],
  onDelete: () => {},
  onEdit: () => {},
  onMove: () => {}
};

export default QuestionPreview;
