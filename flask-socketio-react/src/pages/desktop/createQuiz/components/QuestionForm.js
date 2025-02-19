import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Box, 
  TextField, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  Typography,
  FormControl,
  FormLabel 
} from '@mui/material';

const QuestionForm = forwardRef(({ onSubmit, editQuestion = null, isAbcd }, ref) => {
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

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      isTrueFalse: !isAbcd,
      answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Nepravda'],
      correctAnswer: 0
    }));
  }, [isAbcd]);

  useImperativeHandle(ref, () => ({
    submitForm: () => {
      if (formData.question.trim() === '') return;
      onSubmit(formData);
      if (!editQuestion) {
        setFormData({
          question: '',
          answers: isAbcd ? ['', '', '', ''] : ['Pravda', 'Nepravda'],
          correctAnswer: 0,
          timeLimit: 30,
          category: '',
          isTrueFalse: !isAbcd,
        });
      }
    }
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
                label={`Odpověď ${index + 1}`}
                value={answer}
                onChange={(e) => {
                  const newAnswers = [...formData.answers];
                  newAnswers[index] = e.target.value;
                  setFormData({ ...formData, answers: newAnswers });
                }}
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
            <FormControlLabel value={1} control={<Radio />} label="Nepravda" />
          </RadioGroup>
        </FormControl>
      )}

      <TextField
        type="number"
        label="Časový limit (vteřiny)"
        value={formData.timeLimit}
        onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
      />

      <TextField
        label="Kategorie"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      />
    </Box>
  );
});

export default QuestionForm;
