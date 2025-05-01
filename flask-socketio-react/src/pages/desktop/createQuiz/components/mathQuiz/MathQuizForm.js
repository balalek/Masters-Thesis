/**
 * @fileoverview Math Quiz Form component for creating and editing math equation sequences
 * 
 * This component provides:
 * - Drag-and-drop interface for ordering math equation sequences
 * - Dynamic addition and removal of equation sequences
 * - Validation for equation content and numeric answers
 * - Time limit configuration for each sequence
 * - Visual feedback during sequence reordering
 * 
 * @module Components/Desktop/CreateQuiz/MathQuiz/MathQuizForm
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { QUIZ_VALIDATION } from '../../../../../constants/quizValidation';
import { scrollbarStyle } from '../../../../../utils/scrollbarStyle';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import SortableSequence from './SortableSequence';

/**
 * Math Quiz Form component for creating math equation sequences
 * 
 * Provides a drag-and-drop interface for ordering multiple math equation sequences,
 * each with its own equation, answer, and time limit. Supports validation and dynamic
 * addition/removal of sequences while maintaining proper ordering.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Object} props.editQuestion - Question data when editing existing question
 * @param {Object} ref - Forwarded ref for parent access to form methods
 * @returns {JSX.Element} The rendered form component
 */
const MathQuizForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  // Create initial form data with 3 sequences
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
        distance: 8, // Small distance threshold to prevent accidental drags
      }
    }),
    useSensor(KeyboardSensor)
  );

  // Handle editing - populate form with existing question data
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        sequences: editQuestion.sequences?.length > 0 
          ? editQuestion.sequences.map(seq => ({
              ...seq,
              id: seq.id || Date.now() + Math.random(),
              length: seq.length || QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT
            }))
          : [{ id: Date.now(), equation: '', answer: '', length: QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT }],
      });
    }
  }, [editQuestion]);

  /**
   * Validates form data against quiz constraints
   * 
   * Checks for minimum sequence count, required equation and answer fields,
   * numeric answer values, and valid time limits for each sequence.
   * 
   * @function validateForm
   * @returns {boolean} True if validation passes, false otherwise
   */
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

  /**
   * Adds a new equation sequence to the form
   * 
   * Creates a new sequence with default values and adds it to the sequence list.
   * 
   * @function handleAddSequence
   */
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

  /**
   * Removes a sequence from the form at the specified index
   * 
   * Prevents removal if only one sequence remains.
   * 
   * @function handleRemoveSequence
   * @param {number} indexToRemove - Index of sequence to remove
   */
  const handleRemoveSequence = (indexToRemove) => {
    if (formData.sequences.length <= 1) {
      return; // Don't remove if we're at minimum, although minimum is 3, but this is more user-friendly
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

  /**
   * Updates a field value in a specific sequence
   * 
   * @function handleSequenceChange
   * @param {number} index - Index of the sequence to update
   * @param {string} field - Field name to update (equation, answer, length)
   * @param {*} value - New value for the field
   */
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

  /**
   * Handles the end of a drag operation for sequence reordering
   * 
   * Reorders sequences based on drag result and updates error mapping.
   * 
   * @function handleDragEnd
   * @param {Object} event - Drag end event data
   */
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

  /**
   * Tracks the active sequence during drag operations
   * 
   * @function handleDragStart
   * @param {Object} event - Drag start event data
   */
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  /**
   * Handles form submission after validation
   * 
   * Validates form data, formats values for submission, and calls onSubmit.
   * 
   * @function handleSubmit
   */
  const handleSubmit = () => {
    if (!validateForm()) return;

    // Let the backend handle conversion from comma to dot
    const processedData = {
      ...formData,
      sequences: formData.sequences.map(seq => ({
        equation: seq.equation,
        answer: seq.answer,
        length: Number(seq.length)
      }))
    };

    onSubmit(processedData);
    resetForm();
  };

  /**
   * Resets form to default values
   * 
   * @function resetForm
   */
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

  /**
   * Exposes form methods to parent component
   * 
   * Provides external access to form submission and reset functionality
   * through the forwarded ref.
   */
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