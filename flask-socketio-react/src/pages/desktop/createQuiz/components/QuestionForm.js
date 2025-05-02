/**
 * @fileoverview Question Form component for creating and editing ABCD/True-False questions
 * 
 * This component provides:
 * - Dynamic form switching between ABCD and True/False formats
 * - Form validation for question content and parameters
 * - Backend validation integration
 * - Time limit configuration via slider
 * - Category selection with autocomplete
 * - Error handling and feedback
 * 
 * @module Components/Desktop/CreateQuiz/QuestionForm
 */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Box, 
  TextField, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  Typography,
  FormControl,
  FormLabel,
  Autocomplete,
  FormHelperText,
  Alert,
  Slider
} from '@mui/material';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES, QUESTION_TYPES } from '../../../../constants/quizValidation';

/**
 * Question Form component for creating and editing multiple-choice questions
 * 
 * Provides form fields for ABCD and True/False question types with
 * validation, error handling, and seamless switching between formats.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Object} props.editQuestion - Question data when editing an existing question
 * @param {boolean} props.isAbcd - Whether the form should show ABCD or True/False fields
 * @param {Object} ref - Forwarded ref for parent control of form submission
 * @returns {JSX.Element} The rendered question form component
 */
const QuestionForm = forwardRef(({ onSubmit, editQuestion = null, isAbcd }, ref) => {
  const answerLetters = ['A', 'B', 'C', 'D'];

  // Initialize with consistent default values
  const [formData, setFormData] = useState({
    question: '',
    answers: isAbcd ? Array(4).fill('') : ['Pravda', 'Lež'],
    correctAnswer: null,
    length: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
    category: '',
    isTrueFalse: !isAbcd,
    type: isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE,
  });

  const [errors, setErrors] = useState({
    question: '',
    answers: ['', '', '', ''],
    length: '',
    category: ''
  });

  const [backendError, setBackendError] = useState('');

  // Update form when isAbcd changes - keep question, category, and length
  useEffect(() => {
    const newType = isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE;
    
    setFormData(prev => {
      // Keep existing values for common fields
      const updatedData = {
        ...prev,
        isTrueFalse: !isAbcd,
        type: newType,
      };

      // Only update answers format if we're switching question types
      if ((isAbcd && prev.isTrueFalse) || (!isAbcd && !prev.isTrueFalse)) {
        updatedData.answers = isAbcd ? Array(4).fill('') : ['Pravda', 'Lež'];
        updatedData.correctAnswer = null; // Reset correct answer when changing type
      }

      return updatedData;
    });
  }, [isAbcd]);

  // Update form when editing a question - only run on initial load or when editQuestion changes
  useEffect(() => {
    if (editQuestion) {
      const questionType = editQuestion.answers.length === 2 ? QUESTION_TYPES.TRUE_FALSE : QUESTION_TYPES.ABCD;
      
      setFormData({
        question: editQuestion.question || '',
        answers: editQuestion.answers || [],
        correctAnswer: editQuestion.correctAnswer,
        length: editQuestion.length || editQuestion.timeLimit || QUIZ_VALIDATION.TIME_LIMIT.DEFAULT, 
        category: editQuestion.category || '',
        isTrueFalse: editQuestion.answers.length === 2,
        type: questionType,
      });
    } else {
      // Only reset when not editing (not on type change)
      setFormData(prev => ({
        question: '',
        answers: isAbcd ? Array(4).fill('') : ['Pravda', 'Lež'],
        correctAnswer: null,
        length: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
        category: '',
        isTrueFalse: !isAbcd,
        type: isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE,
      }));
    }
  }, [editQuestion]);

  /**
   * Validates form data against content and format rules
   * 
   * Checks all fields for required values, length constraints,
   * and validates that a correct answer is selected.
   * 
   * @function validateForm
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = () => {
    const newErrors = {
      question: '',
      answers: ['', '', '', ''],
      length: '',
      category: ''
    };
    let isValid = true;

    // Required fields validation
    if (!formData.question.trim()) {
      newErrors.question = isAbcd ? 'Otázka je povinná' : 'Tvrzení je povinné';
      isValid = false;
    }

    formData.answers.forEach((answer, index) => {
      if (!answer.trim()) {
        newErrors.answers[index] = 'Odpověď je povinná';
        isValid = false;
      }
    });

    if (!formData.length) {
      newErrors.length = 'Časový limit je povinný';
      isValid = false;
    }

    if (!formData.category) {
      newErrors.category = 'Kategorie je povinná';
      isValid = false;
    }

    // Question validation
    if (formData.question.length > QUIZ_VALIDATION.QUESTION_MAX_LENGTH) {
      newErrors.question = `Maximální délka je ${QUIZ_VALIDATION.QUESTION_MAX_LENGTH} znaků`;
      isValid = false;
    }

    // Answers validation
    formData.answers.forEach((answer, index) => {
      if (answer.length > QUIZ_VALIDATION.ANSWER_MAX_LENGTH) {
        newErrors.answers[index] = `Maximální délka je ${QUIZ_VALIDATION.ANSWER_MAX_LENGTH} znaků`;
        isValid = false;
      }
    });

    // Time limit validation
    if (formData.length < QUIZ_VALIDATION.TIME_LIMIT.MIN || 
        formData.length > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
      newErrors.length = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
      isValid = false;
    }

    // Category validation
    if (!QUIZ_CATEGORIES.includes(formData.category)) {
      newErrors.category = 'Vyberte platnou kategorii';
      isValid = false;
    }

    // Validate that a correct answer is selected
    if (formData.correctAnswer === null) {
      newErrors.correctAnswer = isAbcd ? 
        'Vyberte správnou odpověď' : 
        'Vyberte zda je tvrzení pravdivé nebo nepravdivé';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Validates question with backend API
   * 
   * Sends question data to the server for additional validation
   * like checking for duplicate questions.
   * 
   * @async
   * @function checkQuestionWithBackend
   * @param {Object} questionData - The question data to validate
   * @returns {Promise<boolean>} True if validation succeeds, false otherwise
   */
  const checkQuestionWithBackend = async (questionData) => {
    try {
      const response = await fetch('/check_question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: [questionData]
        })
      });

      if (!response.ok) {
        const data = await response.json();
        setBackendError(data.error);
        return false;
      }
      setBackendError('');
      return true;
    } catch (error) {
      console.error('Error checking question:', error);
      setBackendError('Chyba při kontrole otázky');
      return false;
    }
  };

  /**
   * Resets form to default state
   * 
   * Clears all form fields and errors, resetting to the default
   * state based on current question type.
   * 
   * @function resetForm
   */
  const resetForm = () => {
    setFormData({
      question: '',
      answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Lež'],
      correctAnswer: null,
      length: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
      category: '',
      isTrueFalse: !isAbcd,
      type: isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE,
    });
    
    setErrors({
      question: '',
      answers: ['', '', '', ''],
      length: '',
      category: ''
    });
    setBackendError('');
  };

  /**
   * Exposes form methods to parent component
   * 
   * Provides the parent component with access to form submission
   * and reset functionality through the forwarded ref.
   */
  useImperativeHandle(ref, () => ({
    submitForm: async () => {
      if (validateForm()) {
        // Ensure type is set before submission
        const dataToSubmit = {
          ...formData,
          type: formData.type || (isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE),
          timeLimit: formData.length
        };
        
        const backendValid = await checkQuestionWithBackend(dataToSubmit);
        if (backendValid) {
          onSubmit(dataToSubmit);
          resetForm();
        }
      }
    },
    resetForm // Expose reset function
  }));

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      pb: 2,
      pt: 0.8
    }}>
      <TextField
        fullWidth
        label={isAbcd ? "Otázka" : "Tvrzení"}
        value={formData.question}
        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
        error={!!errors.question}
        helperText={errors.question || `${formData.question.length}/${QUIZ_VALIDATION.QUESTION_MAX_LENGTH}`}
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

      {isAbcd ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {formData.answers.map((answer, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label={`Odpověď ${answerLetters[index]}`}
                value={answer}
                onChange={(e) => {
                  const newAnswers = [...formData.answers];
                  newAnswers[index] = e.target.value;
                  setFormData({ ...formData, answers: newAnswers });
                }}
                error={!!errors.answers[index]}
                helperText={errors.answers[index] || `${answer.length}/${QUIZ_VALIDATION.ANSWER_MAX_LENGTH}`}
                slotProps={{ 
                  htmlInput: { 
                    maxLength: QUIZ_VALIDATION.ANSWER_MAX_LENGTH
                  } 
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                <Radio
                  checked={formData.correctAnswer === index}
                  onChange={() => setFormData({ ...formData, correctAnswer: index })}
                />
              </Box>
            </Box>
          ))}
          
          {/* Error message for ABCD form when no correct answer is selected */}
          {errors.correctAnswer && (
            <FormHelperText error sx={{ mt: 1, ml: 2 }}>
              {errors.correctAnswer}
            </FormHelperText>
          )}
        </Box>
      ) : (
        <FormControl error={!!errors.correctAnswer}>
          <FormLabel>Je tvrzení pravdivé?</FormLabel>
          <RadioGroup
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: Number(e.target.value) })}
          >
            <FormControlLabel value={0} control={<Radio />} label="Pravda" />
            <FormControlLabel value={1} control={<Radio />} label="Lež" />
          </RadioGroup>
          {errors.correctAnswer && (
            <FormHelperText error>{errors.correctAnswer}</FormHelperText>
          )}
        </FormControl>
      )}

      <Box sx={{ px: 2, width: '99%' }}>
        <Typography gutterBottom>
          Časový limit: {formData.length} vteřin
        </Typography>
        <Slider
          value={formData.length}
          onChange={(e, newValue) => setFormData({ ...formData, length: newValue })}
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
              transform: 'translateX(-50%)',
            }
          }}
        />
        {errors.length && <Typography color="error" variant="caption">{errors.length}</Typography>}
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

      {backendError && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            '& .MuiAlert-message': { 
              width: '100%' 
            }
          }}
        >
          Serverová validace selhala: {backendError}
        </Alert>
      )}
    </Box>
  );
});

export default QuestionForm;