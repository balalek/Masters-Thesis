/**
 * @fileoverview Drawing Form component for creating and editing Drawing quiz questions
 * 
 * This component provides:
 * - Form for configuring Drawing quiz parameters
 * - Rounds configuration via slider
 * - Time limit settings for drawing turns
 * - Informational display about Drawing gameplay
 * - Validation of quiz parameters
 * @author Bc. Martin Baláž
 * @module Components/Desktop/CreateQuiz/DrawingForm
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  Alert,
  Paper
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { QUIZ_VALIDATION } from '../../../../constants/quizValidation';

/**
 * Drawing Form component for configuring Drawing quiz questions
 * 
 * Allows setting rounds and time limits for Drawing questions,
 * providing informational guidance and validation feedback.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Object} props.editQuestion - Question data when editing existing question
 * @param {Object} ref - Forwarded ref for parent access to form methods
 * @returns {JSX.Element} The rendered form component
 */
const DrawingForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  // Initialize with default values
  const [formData, setFormData] = useState({
    length: QUIZ_VALIDATION.DRAWING.DEFAULT_TIME,
    rounds: QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
  });
  const [errors, setErrors] = useState({});

  // Update formData when editQuestion changes
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        length: editQuestion.length || QUIZ_VALIDATION.DRAWING.DEFAULT_TIME,
        rounds: editQuestion.rounds || QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
      });
    } else {
      // Reset to defaults when not editing
      setFormData({
        length: QUIZ_VALIDATION.DRAWING.DEFAULT_TIME,
        rounds: QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
      });
    }
  }, [editQuestion]);

  /**
   * Validates form data against quiz constraints
   * 
   * Checks time limit and rounds count against min/max constraints
   * and sets appropriate error messages if validation fails.
   * 
   * @function validateForm
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    // Time limit validation
    if (formData.length < QUIZ_VALIDATION.DRAWING.MIN_TIME || 
        formData.length > QUIZ_VALIDATION.DRAWING.MAX_TIME) {
      newErrors.length = `Časový limit musí být mezi ${QUIZ_VALIDATION.DRAWING.MIN_TIME} až ${QUIZ_VALIDATION.DRAWING.MAX_TIME} sekundami`;
    }

    // Rounds validation
    if (formData.rounds < QUIZ_VALIDATION.DRAWING.MIN_ROUNDS || 
        formData.rounds > QUIZ_VALIDATION.DRAWING.MAX_ROUNDS) {
      newErrors.rounds = `Počet kol musí být mezi ${QUIZ_VALIDATION.DRAWING.MIN_ROUNDS} až ${QUIZ_VALIDATION.DRAWING.MAX_ROUNDS}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission after validation
   * 
   * Validates form data and calls the onSubmit callback with
   * the formatted question data if validation passes.
   * 
   * @function handleSubmit
   */
  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      ...formData,
      type: 'DRAWING'
    });
    resetForm();
  };

  /**
   * Resets form to default values
   * 
   * @function resetForm
   */
  const resetForm = () => {
    setFormData({
      length: QUIZ_VALIDATION.DRAWING.DEFAULT_TIME,
      rounds: QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
    });
    setErrors({});
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 0.8 }}>
      <Paper elevation={1} sx={{ p: 2, backgroundColor: 'info.lighter', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', mb: 1, justifyContent: 'center' }}>
          <InfoIcon color="info" sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={500}>Informace o kreslení</Typography>
        </Box>
        <Typography variant="body2" align='justify'>
          V této hře hráč kreslí obrázek, které ostatní hráči hádají. <br />
          Tato hra může být součástí pouze kombinovaného kvízu, nelze ji vytvořit samostatnou. <br />
          Jedno kolo znamená, že se všichni hráči vystřídají při kreslení obrázku. <br />
        </Typography>
      </Paper>

      <Box sx={{ px: 2, width: '99%' }}>
        <Typography gutterBottom>
          Počet kol: {formData.rounds}
        </Typography>
        <Slider
          value={formData.rounds}
          onChange={(e, newValue) => setFormData({ ...formData, rounds: newValue })}
          min={QUIZ_VALIDATION.DRAWING.MIN_ROUNDS}
          max={QUIZ_VALIDATION.DRAWING.MAX_ROUNDS}
          valueLabelDisplay="auto"
          marks={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' }
          ]}
          sx={{
            '& .MuiSlider.markLabel': {
              transform: 'translateX(-50%)',
            }
          }}
        />
        {errors.rounds && <Typography color="error" variant="caption">{errors.rounds}</Typography>}
      </Box>

      <Box sx={{ px: 2, width: '99%' }}>
        <Typography gutterBottom>
          Časový limit na kreslení: {formData.length} sekund
        </Typography>
        <Slider
          value={formData.length}
          onChange={(e, newValue) => setFormData({ ...formData, length: newValue })}
          min={QUIZ_VALIDATION.DRAWING.MIN_TIME}
          max={QUIZ_VALIDATION.DRAWING.MAX_TIME}
          valueLabelDisplay="auto"
          marks={[
            { value: 30, label: '30s' },
            { value: 60, label: '60s' },
            { value: 90, label: '90s' },
            { value: 120, label: '120s' }
          ]}
          sx={{
            '& .MuiSlider.markLabel': {
              transform: 'translateX(-50%)',
            }
          }}
        />
        {errors.length && <Typography color="error" variant="caption">{errors.length}</Typography>}
      </Box>

      {errors.general && (
        <Alert severity="error">{errors.general}</Alert>
      )}
    </Box>
  );
});

export default DrawingForm;