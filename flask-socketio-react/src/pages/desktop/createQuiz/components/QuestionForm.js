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
  Slider // Add this import
} from '@mui/material';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES, QUESTION_TYPES } from '../../../../constants/quizValidation';

const QuestionForm = forwardRef(({ onSubmit, editQuestion = null, isAbcd }, ref) => {
  const answerLetters = ['A', 'B', 'C', 'D'];

  const initialFormData = editQuestion || {
    question: '',
    answers: isAbcd ? Array(4).fill('') : ['Pravda', 'Lež'],
    correctAnswer: null, // Changed from 0 to null to have no default selected answer
    timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
    category: '',
    isTrueFalse: !isAbcd,
    type: isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE,
  };

  const [formData, setFormData] = useState(initialFormData);

  const [errors, setErrors] = useState({
    question: '',
    answers: ['', '', '', ''],
    timeLimit: '',
    category: ''
  });

  const [backendError, setBackendError] = useState('');

  useEffect(() => {
    const newType = isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE;
    setFormData(prev => ({
      ...prev,
      isTrueFalse: !isAbcd,
      answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Lež'],
      correctAnswer: null,
      type: newType,
    }));
  }, [isAbcd]);

  useEffect(() => {
    if (editQuestion) {
      const questionType = editQuestion.answers.length === 2 ? QUESTION_TYPES.TRUE_FALSE : QUESTION_TYPES.ABCD;
      setFormData(prev => ({
        ...editQuestion,
        isTrueFalse: editQuestion.answers.length === 2,
        type: questionType,
      }));
    }
  }, [editQuestion]);

  const validateForm = () => {
    const newErrors = {
      question: '',
      answers: ['', '', '', ''],
      timeLimit: '',
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

    if (!formData.timeLimit) {
      newErrors.timeLimit = 'Časový limit je povinný';
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
    if (formData.timeLimit < QUIZ_VALIDATION.TIME_LIMIT.MIN || 
        formData.timeLimit > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
      newErrors.timeLimit = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
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

  const checkQuestionWithBackend = async (questionData) => {
    // Log the question data before sending to backend
    console.log('Question data being sent to backend:', JSON.stringify(questionData));
    
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
        setBackendError(data.error); // Set backend error separately
        return false;
      }
      setBackendError(''); // Clear error on success
      return true;
    } catch (error) {
      console.error('Error checking question:', error);
      setBackendError('Chyba při kontrole otázky');
      return false;
    }
  };

  const resetForm = () => {
    const newFormData = {
      question: '',
      answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Lež'],
      correctAnswer: null,
      timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
      category: '',
      isTrueFalse: !isAbcd,
      type: isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE,
    };
    
    setFormData(newFormData);
    
    setErrors({
      question: '',
      answers: ['', '', '', ''],
      timeLimit: '',
      category: ''
    });
    setBackendError('');
  };

  useImperativeHandle(ref, () => ({
    submitForm: async () => {
      if (validateForm()) {
        // Ensure type is set before submission
        const dataToSubmit = {
          ...formData,
          type: formData.type || (isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE)
        };
        
        const backendValid = await checkQuestionWithBackend(dataToSubmit);
        if (backendValid) {
          onSubmit(dataToSubmit);
          resetForm(); // Reset form after successful submit
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
      pt: 0.8 // padding top to prevent label cutoff
    }}>
      <TextField
        fullWidth
        label={isAbcd ? "Otázka" : "Tvrzení"}
        value={formData.question}
        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
        error={!!errors.question}
        helperText={errors.question || `${formData.question.length}/${QUIZ_VALIDATION.QUESTION_MAX_LENGTH}`}
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
              />
              <Box sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                <Radio
                  checked={formData.correctAnswer === index}
                  onChange={() => setFormData({ ...formData, correctAnswer: index })}
                />
              </Box>
            </Box>
          ))}
          
          {/* Add error message for ABCD form when no correct answer is selected */}
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

      <Box sx={{ px: 2, width: '99%' }}> {/* Adjust width and padding */}
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
              transform: 'translateX(-50%)', // Center the labels under marks
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
