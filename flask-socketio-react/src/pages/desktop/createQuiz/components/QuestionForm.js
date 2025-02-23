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
  Alert
} from '@mui/material';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES } from '../../../../constants/quizValidation';

const QuestionForm = forwardRef(({ onSubmit, editQuestion = null, isAbcd }, ref) => {
  const answerLetters = ['A', 'B', 'C', 'D'];

  const [formData, setFormData] = useState(
    editQuestion || {
      question: '',
      answers: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 30,
      category: '',
      isTrueFalse: !isAbcd,
    }
  );

  const [errors, setErrors] = useState({
    question: '',
    answers: ['', '', '', ''],
    timeLimit: '',
    category: ''
  });

  const [backendError, setBackendError] = useState('');

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      isTrueFalse: !isAbcd,
      answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Lež'],
      correctAnswer: 0
    }));
  }, [isAbcd]);

  useEffect(() => {
    if (editQuestion) {
      setFormData({
        ...editQuestion,
        isTrueFalse: editQuestion.answers.length === 2
      });
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
      newErrors.question = 'Otázka je povinná';
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

    setErrors(newErrors);
    return isValid;
  };

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
    setFormData({
      question: '',
      answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Lež'],
      correctAnswer: 0,
      timeLimit: 30,
      category: '',
      isTrueFalse: !isAbcd,
    });
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
        const backendValid = await checkQuestionWithBackend(formData);
        if (backendValid) {
          onSubmit(formData);
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
        label="Otázka"
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
            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
              <Radio
                checked={formData.correctAnswer === index}
                onChange={() => setFormData({ ...formData, correctAnswer: index })}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <FormControl>
          <FormLabel>Správná odpověď</FormLabel>
          <RadioGroup
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: Number(e.target.value) })}
          >
            <FormControlLabel value={0} control={<Radio />} label="Pravda" />
            <FormControlLabel value={1} control={<Radio />} label="Lež" />
          </RadioGroup>
        </FormControl>
      )}

      <TextField
        type="number"
        label="Časový limit (vteřiny)"
        value={formData.timeLimit || ''} // Use empty string when value is 0
        onChange={(e) => {
          const value = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value));
          setFormData({ ...formData, timeLimit: value });
        }}
        error={!!errors.timeLimit}
        helperText={errors.timeLimit || `Zadejte čas mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`}
        slotProps={{
          input: {
            step: 1,
            min: 0  // Prevent negative numbers
          }
        }}
      />

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
