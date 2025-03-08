import React from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom'; // Add this

const QuizListItem = ({ quiz, isPublic, onEditPublic, onToggleShare }) => {
  const navigate = useNavigate();  // Add this

  const handleStartQuiz = () => {
    navigate('/room', { state: { quizId: quiz._id } });
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 2, 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
          {quiz.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {quiz.type}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Počet otázek: {quiz.questionCount || quiz.questions?.length || 0}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton 
          color="primary" 
          size="large"
          onClick={handleStartQuiz}
        >
          <PlayArrowIcon />
        </IconButton>
        {!isPublic && (
          <IconButton 
            color="primary" 
            size="large"
            onClick={() => onToggleShare(quiz)}
            title={quiz.is_public ? "Zrušit sdílení" : "Sdílet"}
          >
            <ShareIcon 
              sx={{ 
                transform: quiz.is_public ? 'rotate(90deg)' : 'none',
                opacity: quiz.is_public ? 0.6 : 1,
                transition: 'transform 0.2s, opacity 0.2s'
              }} 
            />
          </IconButton>
        )}
        <IconButton 
          color="primary" 
          size="large"
          onClick={isPublic ? onEditPublic : undefined}
        >
          <EditIcon />
        </IconButton>
        {!isPublic && (
          <IconButton color="error" size="large">
            <DeleteIcon />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default QuizListItem;
