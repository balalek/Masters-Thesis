/**
 * @fileoverview Guess A Number Form component for creating and editing guess-a-number questions
 * 
 * This component provides:
 * - Form for configuring guess-a-number quiz questions
 * - Numeric answer field with validation
 * - Time limit configuration via slider
 * - Category selection with autocomplete
 * - Support for editing existing questions
 * @author Bc. Martin Baláž
 * @module Components/Desktop/CreateQuiz/GuessANumberForm
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Slider,
} from '@mui/material';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES } from '../../../../constants/quizValidation';

/**
 * Guess A Number Form component for creating and editing guess-a-number questions
 * 
 * Provides a form with numeric answer field, question text, category selection,
 * and time limit configuration for guess-a-number questions.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Object} props.editQuestion - Question data when editing an existing question
 * @param {Object} ref - Forwarded ref for parent control of form submission
 * @returns {JSX.Element} The rendered form component
 */
const GuessANumberForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  const initialFormData = editQuestion || {
    question: '',
    answer: '',
    timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
    category: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  // Handle editing - populate form with existing question data
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        question: editQuestion.question || '',
        answer: editQuestion.answer || editQuestion.number_answer || '',
        timeLimit: editQuestion.timeLimit || editQuestion.length || QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
        category: editQuestion.category || '',
      });
    }
  }, [editQuestion]);

  /**
   * Validates form data against content and format rules
   * 
   * Ensures question text is provided and within length limits,
   * answer is a valid number, category is selected, and time limit
   * is within the acceptable range.
   * 
   * @function validateForm
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    // Question validation
    if (!formData.question.trim()) {
      newErrors.question = 'Otázka je povinná';
    } else if (formData.question.length > QUIZ_VALIDATION.QUESTION_MAX_LENGTH) {
      newErrors.question = `Maximální délka je ${QUIZ_VALIDATION.QUESTION_MAX_LENGTH} znaků`;
    }

    // Answer validation - must be a number
    if (!formData.answer.toString().trim()) {
      newErrors.answer = 'Odpověď je povinná';
    } else if (isNaN(Number(formData.answer))) {
      newErrors.answer = 'Odpověď musí být číslo';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = 'Kategorie je povinná';
    }

    // Time limit validation
    if (formData.timeLimit < QUIZ_VALIDATION.TIME_LIMIT.MIN || 
        formData.timeLimit > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
      newErrors.timeLimit = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission after validation
   * 
   * Validates form data, converts answer to number type,
   * and calls the onSubmit callback if validation passes.
   * 
   * @function handleSubmit
   */
  const handleSubmit = () => {
    if (!validateForm()) return;

    // Convert answer to number before submitting
    const submissionData = {
      ...formData,
      answer: Number(formData.answer)
    };

    onSubmit(submissionData);
    resetForm();
  };

  /**
   * Resets form to default state
   * 
   * Clears all form fields and errors, returning the form
   * to its initial state.
   * 
   * @function resetForm
   */
  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
      category: '',
    });
    setErrors({});
  };

  /**
   * Exposes form methods to parent component
   * 
   * Provides the parent component with access to form submission
   * and reset functionality through the forwarded ref.
   */
  React.useImperativeHandle(ref, () => ({
    submitForm: handleSubmit,
    resetForm
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 0.8 }}>
      <TextField
        fullWidth
        label="Otázka"
        value={formData.question || ''}
        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
        error={!!errors.question}
        helperText={errors.question || `${(formData.question || '').length}/${QUIZ_VALIDATION.QUESTION_MAX_LENGTH}`}
        slotProps={{
          htmlInput: {
            maxLength: QUIZ_VALIDATION.QUESTION_MAX_LENGTH
          }
        }}
        sx={{ 
          '& .MuiInputLabel-root': {
            px: 0.5
          }
        }}
      />

      <TextField
        fullWidth
        label="Správná odpověď (číslo)"
        type="number"
        value={formData.answer || ''}
        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
        error={!!errors.answer}
        helperText={errors.answer}
        sx={{ 
          '& .MuiInputLabel-root': {
            px: 0.5
          }
        }}
      />

      <Box sx={{ px: 2, width: '99%' }}>
        <Typography gutterBottom>
          Časový limit: {formData.timeLimit} vteřin
        </Typography>
        <Slider
          value={formData.timeLimit}
          onChange={(e, newValue) => setFormData({ ...formData, timeLimit: newValue })}
          min={QUIZ_VALIDATION.TIME_LIMIT.MIN}
          max={QUIZ_VALIDATION.TIME_LIMIT.MAX}
          valueLabelDisplay="auto"
          marks={[
            { value: 5, label: '5s' },
            { value: 30, label: '30s' },
            { value: 60, label: '60s' },
            { value: 90, label: '90s' },
            { value: 120, label: '120s' },
          ]}
          sx={{
            '& .MuiSlider-markLabel': {
              transform: 'translateX(-50%)'
            }
          }}
        />
      </Box>

      <Autocomplete
        value={formData.category}
        onChange={(event, newValue) => {
          setFormData({ ...formData, category: newValue });
        }}
        options={QUIZ_CATEGORIES}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Kategorie"
            error={!!errors.category}
            helperText={errors.category}
          />
        )}
      />
    </Box>
  );
});

export default GuessANumberForm;