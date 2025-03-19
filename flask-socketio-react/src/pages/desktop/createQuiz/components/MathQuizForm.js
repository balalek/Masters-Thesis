import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { QUIZ_VALIDATION } from '../../../../constants/quizValidation';
import { scrollbarStyle } from '../../../../utils/scrollbarStyle';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay // Add this import
} from '@dnd-kit/core';
// Remove the modifiers import since we'll use DragOverlay instead
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import SortableSequence from './SortableSequence';

const MathQuizForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  // Create initial form data with 3 sequences instead of 1
  const initialFormData = editQuestion || {
    sequences: Array(QUIZ_VALIDATION.MIN_SEQUENCES).fill().map(() => ({ 
      id: Date.now() + Math.random(), 
      equation: '', 
      answer: '', 
      length: QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT 
    }))
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({
    sequences: Array(QUIZ_VALIDATION.MIN_SEQUENCES).fill('') // Initialize with 3 empty error strings
  });
  const [activeId, setActiveId] = useState(null);
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Add a small distance threshold to prevent accidental drags
      }
    }),
    useSensor(KeyboardSensor)
  );

  // Handle editing
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        sequences: editQuestion.sequences?.length > 0 
          ? editQuestion.sequences.map(seq => ({
              ...seq,
              id: seq.id || Date.now() + Math.random(), // Ensure each has a unique ID
              length: seq.length || QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT // Ensure each sequence has a length
            }))
          : [{ id: Date.now(), equation: '', answer: '', length: QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT }],
      });
    }
  }, [editQuestion]);

  // Validate form
  const validateForm = () => {
    const newErrors = {
      sequences: Array(formData.sequences.length).fill(''),
    };
    
    let isValid = true;

    // Sequences validation
    if (formData.sequences.length < QUIZ_VALIDATION.MIN_SEQUENCES) {
      newErrors.general = `Přidejte alespoň ${QUIZ_VALIDATION.MIN_SEQUENCES} rovnice`;
      isValid = false;
    }

    // Validate each sequence
    formData.sequences.forEach((seq, index) => {
      if (!seq.equation.trim()) {
        newErrors.sequences[index] = 'Rovnice je povinná';
        isValid = false;
      }
      
      if (seq.answer === '' || seq.answer === undefined || seq.answer === null) {
        newErrors.sequences[index] = 'Výsledek je povinný';
        isValid = false;
      } else {
        // Check if it's a valid number, allowing both dot and comma as decimal separators
        const testValue = String(seq.answer).replace(',', '.');
        if (isNaN(Number(testValue))) {
          newErrors.sequences[index] = 'Výsledek musí být celé číslo, nebo desetinné číslo';
          isValid = false;
        }
      }
      
      // Validate length for each sequence
      if (seq.length < QUIZ_VALIDATION.TIME_LIMIT.MIN || seq.length > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
        newErrors.sequences[index] = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleAddSequence = () => {
    setFormData(prev => ({
      ...prev,
      sequences: [...prev.sequences, { id: Date.now(), equation: '', answer: '', length: QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT }]
    }));
    
    // Add empty error for the new sequence
    setErrors(prev => ({
      ...prev,
      sequences: [...prev.sequences, '']
    }));
  };

  const handleRemoveSequence = (indexToRemove) => {
    if (formData.sequences.length <= 1) {
      return; // Don't remove if we're at minimum
    }
    
    setFormData(prev => ({
      ...prev,
      sequences: prev.sequences.filter((_, index) => index !== indexToRemove)
    }));
    
    // Remove corresponding error
    setErrors(prev => ({
      ...prev,
      sequences: prev.sequences.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSequenceChange = (index, field, value) => {
    const updatedSequences = [...formData.sequences];
    updatedSequences[index] = {
      ...updatedSequences[index],
      [field]: field === 'length' ? Number(value) : value
    };
    
    setFormData(prev => ({
      ...prev,
      sequences: updatedSequences
    }));
  };

  // Handle drag end to reorder sequences
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active && over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.sequences.findIndex(seq => seq.id === active.id);
        const newIndex = prev.sequences.findIndex(seq => seq.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newSequences = arrayMove(prev.sequences, oldIndex, newIndex);
          
          // Also move the errors to keep them aligned with the sequences
          setErrors(errPrev => {
            const newErrorsSequences = arrayMove(errPrev.sequences, oldIndex, newIndex);
            return { ...errPrev, sequences: newErrorsSequences };
          });
          
          return {
            ...prev,
            sequences: newSequences
          };
        }
        return prev;
      });
    }
    setActiveId(null);
  };

  // Set active ID when drag starts
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Let the backend handle conversion from comma to dot
    const processedData = {
      ...formData,
      sequences: formData.sequences.map(seq => ({
        equation: seq.equation,
        answer: seq.answer, // Don't convert - let backend handle it
        length: Number(seq.length)
      }))
    };

    onSubmit(processedData);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      sequences: Array(QUIZ_VALIDATION.MIN_SEQUENCES).fill().map(() => ({ 
        id: Date.now() + Math.random(), 
        equation: '', 
        answer: '', 
        length: QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT 
      }))
    });
    
    setErrors({
      sequences: Array(QUIZ_VALIDATION.MIN_SEQUENCES).fill(''),
    });
  };

  React.useImperativeHandle(ref, () => ({
    submitForm: handleSubmit,
    resetForm
  }));

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      pt: 0.8,
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {errors.general && (
        <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>
      )}
      
      {/* Sticky header */}
      <Box sx={{ 
        position: 'sticky',
        top: 0,
        zIndex: 10,
        pt: 1,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Matematické rovnice
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              (Min. {QUIZ_VALIDATION.MIN_SEQUENCES})
            </Typography>
          </Typography>
          <Tooltip title="Přidat rovnici">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddSequence}
              size="small"
            >
              Přidat rovnici
            </Button>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Scrollable content area with drag and drop */}
      <Box sx={{ 
        overflow: 'auto',
        flexGrow: 1,
        pb: 2,
        width: '100%',
        ...scrollbarStyle
      }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={formData.sequences.map(seq => seq.id)}
            strategy={verticalListSortingStrategy}
          >
            {formData.sequences.map((sequence, index) => (
              <SortableSequence
                key={sequence.id}
                sequence={sequence}
                index={index}
                onRemove={handleRemoveSequence}
                onChange={handleSequenceChange}
                errors={errors.sequences[index]}
                disabled={formData.sequences.length <= 1}
              />
            ))}
          </SortableContext>
          
          {/* DragOverlay with improved styling */}
          <DragOverlay>
            {activeId && formData.sequences.find(seq => seq.id === activeId) ? (
              <Box sx={{ width: '100%' }}>
                <SortableSequence
                  sequence={formData.sequences.find(seq => seq.id === activeId)}
                  index={formData.sequences.findIndex(seq => seq.id === activeId)}
                  onRemove={handleRemoveSequence}
                  onChange={handleSequenceChange}
                  errors={errors.sequences[formData.sequences.findIndex(seq => seq.id === activeId)]}
                  disabled={formData.sequences.length <= 1}
                  isDragging={true}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Box>
    </Box>
  );
});

export default MathQuizForm;
