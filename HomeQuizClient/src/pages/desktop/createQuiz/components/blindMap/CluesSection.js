/**
 * @fileoverview Clues Section component for Blind Map question creation
 * 
 * This component provides:
 * - Input fields for entering up to three optional clues
 * - Character count display for each clue
 * - Input validation with error handling
 * - Length restrictions for clue text
 * @author Bc. Martin Baláž
 * @module Components/Desktop/CreateQuiz/BlindMap/CluesSection
 */
import React from 'react';
import { Typography, TextField } from '@mui/material';

/**
 * Clues Section component for entering location hints
 * 
 * Allows quiz creators to add up to three optional clues to help players
 * figure out the anagram during gameplay.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.clue1 - Text for the first clue
 * @param {string} props.clue2 - Text for the second clue
 * @param {string} props.clue3 - Text for the third clue
 * @param {Function} props.onChange - Handler for clue text changes
 * @param {Object} props.errors - Validation errors for each clue field
 * @returns {JSX.Element} The rendered clues input section
 */
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
          htmlInput: { 
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
          htmlInput: { 
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
          htmlInput: { 
            maxLength: 100 
          } 
        }}
      />
    </>
  );
};

export default CluesSection;