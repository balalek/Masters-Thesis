import React from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const QuizListItem = ({ quiz }) => {
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
          Počet otázek: {quiz.questions?.length || 0}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton color="primary" size="large">
          <PlayArrowIcon />
        </IconButton>
        <IconButton color="primary" size="large">
          <ShareIcon />
        </IconButton>
        <IconButton color="primary" size="large">
          <EditIcon />
        </IconButton>
        <IconButton color="error" size="large">
          <DeleteIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default QuizListItem;
