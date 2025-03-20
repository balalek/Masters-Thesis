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

const WordChainForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  const initialFormData = editQuestion || {
    length: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
    rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS // Always 1
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  // Handle editing
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        length: editQuestion.length || QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
        rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS // Always 1, even when editing
      });
    }
  }, [editQuestion]);

  const validateForm = () => {
    const newErrors = {};

    // Time limit validation
    if (formData.length < QUIZ_VALIDATION.WORD_CHAIN.MIN_TIME || 
        formData.length > QUIZ_VALIDATION.WORD_CHAIN.MAX_TIME) {
      newErrors.length = `Časový limit musí být mezi ${QUIZ_VALIDATION.WORD_CHAIN.MIN_TIME} až ${QUIZ_VALIDATION.WORD_CHAIN.MAX_TIME} sekundami`;
    }

    // Rounds validation not needed anymore since it's fixed at 1

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      ...formData,
      rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS, // Always 1
      type: 'WORD_CHAIN'
    });
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      length: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
      rounds: QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS // Always 1
    });
    setErrors({});
  };

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

      {/* Removed rounds slider since it's fixed at 1 */}

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
