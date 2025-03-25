import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Slider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import InfoIcon from '@mui/icons-material/Info';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QUIZ_VALIDATION } from '../../../../../constants/quizValidation';

const SortableSequence = ({ 
  sequence, 
  index, 
  onRemove, 
  onChange, 
  errors, 
  disabled, 
  isDragging
}) => {
  const [equationError, setEquationError] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: sequence.id,
    disabled: disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging ? 0.4 : 1,
    position: 'relative',
    width: '100%',
  };

  // Validate equation on blur
  const validateEquation = (equation) => {
    // Check if equation contains at least one mathematical operator
    const mathOperators = ['+', '-', '*', '/', '^', '√', 'sqrt(', '!'];
    const hasOperator = mathOperators.some(op => equation.includes(op));
    
    if (!equation.trim()) {
      return 'Rovnice je povinná';
    }
    
    if (!hasOperator) {
      return 'Rovnice musí obsahovat alespoň jeden matematický operátor (např. +, -, *, /, ^, sqrt, !)';
    }
    
    return '';
  };
  
  const handleEquationChange = (e) => {
    const value = e.target.value;
    onChange(index, 'equation', value);
    
    // Clear error while typing
    if (equationError) setEquationError('');
  };
  
  const handleEquationBlur = (e) => {
    const value = e.target.value;
    const error = validateEquation(value);
    setEquationError(error);
  };

  return (
    <Paper 
      ref={setNodeRef}
      style={style}
      elevation={sortableDragging ? 4 : 1}
      sx={{ 
        p: 2, 
        mb: 2,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        border: errors ? '1px solid #f44336' : 'none'
      }}
    >
      <Box sx={{ flexGrow: 1, pr: 4 }}>
        <TextField
          fullWidth
          label={`Rovnice ${index + 1}`}
          placeholder="např. divy světa * 8 nebo 2 + (2 / 4)"
          value={sequence.equation}
          onChange={handleEquationChange}
          onBlur={handleEquationBlur}
          error={!!errors || !!equationError}
          helperText={equationError}
          sx={{ mb: 2 }}
        />
        
        {/* Row with answer field and time limit slider side by side */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Answer field with reduced width */}
          <TextField
            sx={{ width: '60%' }}
            label="Výsledek"
            placeholder="např. 4 nebo 8,1"
            type="text"
            value={sequence.answer}
            onChange={(e) => onChange(index, 'answer', e.target.value)}
            error={!!errors}
          />
          
          {/* Time limit slider next to answer field */}
          <Box sx={{ width: '40%' }}>
            <Typography variant="body2" id={`time-slider-${sequence.id}`} sx={{ mb: 0.5 }}>
              Časový limit: {sequence.length}s
            </Typography>
            <Slider
              value={sequence.length}
              onChange={(_, newValue) => onChange(index, 'length', newValue)}
              aria-labelledby={`time-slider-${sequence.id}`}
              min={QUIZ_VALIDATION.TIME_LIMIT.MIN}
              max={60}
              valueLabelDisplay="auto"
              size="small"
              sx={{
                mt: -0.5
              }}
            />
          </Box>
        </Box>
        
        {errors && !equationError && (
          <Typography color="error" variant="caption" sx={{ mt: 1 }}>
            {errors}
          </Typography>
        )}
      </Box>
      
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
        <Tooltip title={
            <>
                Tip: Jak napsat rovnici: <br />
                násobení: 2 * 2 <br />
                dělení: 6 / 3 <br />
                sčítání: 1 + 4 <br />
                odčítání: 5 - 4 <br />
                závorky: (5 + 2) <br />
                mocniny: 2^4 (podržte alt + 94) <br />
                odmocniny: sqrt(16) <br />
                faktoriály: 4!
            </>
        }
        slotProps={{
            tooltip: {
              sx: {
                fontSize: '0.95rem',
                lineHeight: 1.5,
                backgroundColor: 'rgba(97, 97, 97, 1)',
                maxWidth: '280px',
              }
            }
          }}>
          <IconButton size="small" color="info">
            <InfoIcon fontSize="medium" />
          </IconButton>
        </Tooltip>

        <IconButton 
          size="small" 
          sx={{ cursor: 'grab' }} 
          {...attributes} 
          {...listeners}
        >
          <DragIndicatorIcon />
        </IconButton>

        <IconButton 
          color="error"
          onClick={() => onRemove(index)}
          disabled={disabled}
          size="small"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default SortableSequence;
