import React from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';

const QuestionPreview = ({ questions, onDelete, onEdit, onMove }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {questions.map((question, index) => (
        <Paper key={question.id} elevation={2} sx={{ position: 'relative', p: 2 }}>
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
            <IconButton size="small" onClick={() => onDelete(question.id)}>
              <DeleteIcon />
            </IconButton>
            <IconButton size="small" sx={{ cursor: 'move' }}>
              <DragIndicatorIcon />
            </IconButton>
            <IconButton size="small" onClick={() => onEdit(question.id)}>
              <EditIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ pr: 5, textAlign: 'left' }}>
            <Typography variant="h6">Otázka {index + 1}</Typography>
            <Typography sx={{ mt: 1 }}>{question.question}</Typography>
            
            <Box sx={{ mt: 2 }}>
              {question.answers.map((answer, ansIndex) => (
                <Box
                  key={ansIndex}
                  sx={{
                    p: 1,
                    my: 0.5,
                    bgcolor: ansIndex === question.correctAnswer ? 'success.light' : 'action.hover',
                    borderRadius: 1
                  }}
                >
                  <Typography align="left">
                    {answer}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 2, color: 'text.secondary' }}>
              <Typography variant="body2">Čas: {question.timeLimit}s</Typography>
              <Typography variant="body2">Kategorie: {question.category}</Typography>
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

export default QuestionPreview;
