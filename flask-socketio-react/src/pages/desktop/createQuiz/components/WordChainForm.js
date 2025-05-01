/**
 * @fileoverview Word Chain Form component for creating and editing Word Chain quizzes
 * 
 * This component provides:
 * - Form for configuring Word Chain quiz parameters
 * - Time limit configuration for player turns
 * - Informational display about Word Chain gameplay
 * - Validation of quiz parameters
 * - Integration with parent form submission framework
 * 
 * @module Components/Desktop/CreateQuiz/WordChainForm
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
 * Word Chain Form component for configuring Word Chain quiz questions
 * 
 * Allows setting time limits for player turns in Word Chain games,
 * with appropriate validation and feedback.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Object} props.editQuestion - Question data when editing existing question
 * @param {Object} ref - Forwarded ref for parent access to form methods
 * @returns {JSX.Element} The rendered form component
 */
const WordChainForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  // Initialize with default values, not with editQuestion
  const [formData, setFormData] = useState({
    length: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
    rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS
  });
  const [errors, setErrors] = useState({});

  // Update formData when editQuestion changes
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        length: editQuestion.length || QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
        rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS // Always 1
      });
    } else {
      // Reset to defaults when not editing
      setFormData({
        length: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
        rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS
      });
    }
  }, [editQuestion]);

  /**
   * Validates form data against quiz constraints
   * 
   * Checks time limit values against min/max constraints
   * and sets appropriate error messages if validation fails.
   * 
   * @function validateForm
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    // Time limit validation
    if (formData.length < QUIZ_VALIDATION.WORD_CHAIN.MIN_TIME || 
        formData.length > QUIZ_VALIDATION.WORD_CHAIN.MAX_TIME) {
      newErrors.length = `Časový limit musí být mezi ${QUIZ_VALIDATION.WORD_CHAIN.MIN_TIME} až ${QUIZ_VALIDATION.WORD_CHAIN.MAX_TIME} sekundami`;
    }

    // Rounds validation not needed since it's fixed at 1

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
      rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS, // Always 1
      type: 'WORD_CHAIN'
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
      length: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
      rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS // Always 1
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
          <Typography variant="subtitle1" fontWeight={500}>Informace o Slovním řetězu</Typography>
        </Box>
        <Typography variant="body2" align='justify'>
          V této hře hráči postupně vymýšlejí slova začínající na poslední písmeno předchozího slova. <br />
          Tato hra může být součástí pouze kombinovaného kvízu, nelze ji vytvořit samostatnou. <br />
          Časový limit na hráče se týká pouze režimu všichni proti všem. Týmový režim má tajný časový limit. <br />
        </Typography>
      </Paper>

      <Box sx={{ px: 2, width: '99%' }}>
        <Typography gutterBottom>
          Časový limit na hráče: {formData.length} sekund
        </Typography>
        <Slider
          value={formData.length}
          onChange={(e, newValue) => setFormData({ ...formData, length: newValue })}
          min={QUIZ_VALIDATION.WORD_CHAIN.MIN_TIME}
          max={QUIZ_VALIDATION.WORD_CHAIN.MAX_TIME}
          valueLabelDisplay="auto"
          marks={[
            { value: 20, label: '20s' },
            { value: 40, label: '40s' },
            { value: 60, label: '60s' }
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

export default WordChainForm;