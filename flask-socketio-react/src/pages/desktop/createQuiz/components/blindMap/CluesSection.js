import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

const CluesSection = ({ 
  clue1, 
  clue2, 
  clue3, 
  onChange, 
  errors = {}
}) => {
  return (
    <>
      <Typography variant="subtitle1" sx={{display: 'flex'}}>
        Nápovědy (volitelné):
      </Typography>
      
      <TextField
        fullWidth
        label="Nápověda 1"
        value={clue1 || ''}
        onChange={(e) => onChange('clue1', e.target.value)}
        error={!!errors.clue1}
        helperText={errors.clue1 || `${(clue1 || '').length}/100`}
        slotProps={{ 
          input: { 
            maxLength: 100 
          } 
        }}
      />

      <TextField
        fullWidth
        label="Nápověda 2"
        value={clue2 || ''}
        onChange={(e) => onChange('clue2', e.target.value)}
        error={!!errors.clue2}
        helperText={errors.clue2 || `${(clue2 || '').length}/100`}
        slotProps={{ 
          input: { 
            maxLength: 100 
          } 
        }}
      />

      <TextField
        fullWidth
        label="Nápověda 3"
        value={clue3 || ''}
        onChange={(e) => onChange('clue3', e.target.value)}
        error={!!errors.clue3}
        helperText={errors.clue3 || `${(clue3 || '').length}/100`}
        slotProps={{ 
          input: { 
            maxLength: 100 
          } 
        }}
      />
    </>
  );
};

export default CluesSection;
