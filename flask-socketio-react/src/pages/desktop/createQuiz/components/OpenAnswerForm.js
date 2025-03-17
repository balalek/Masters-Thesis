import React, { useState, useEffect } from 'react'; // Add useEffect import
import {
  Box,
  TextField,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  Alert,
  Slider, // Add this import
} from '@mui/material';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES } from '../../../../constants/quizValidation';

const OpenAnswerForm = React.forwardRef(({ onSubmit, editQuestion = null, onUploadStateChange }, ref) => {
  const initialFormData = editQuestion || {
    question: '',
    answer: '',
    timeLimit: 30,
    category: '',
    mediaType: null, // 'image' or 'audio' or null
    mediaUrl: null,
    showImageGradually: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [mediaFile, setMediaFile] = useState(null);
  const [fileName, setFileName] = useState('');

  // Add this useEffect to handle editing
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        question: editQuestion.question || '',
        answer: editQuestion.answer || '',
        timeLimit: editQuestion.timeLimit || 30,
        category: editQuestion.category || '',
        mediaType: editQuestion.mediaType || null,
        mediaUrl: editQuestion.mediaUrl || null,
        showImageGradually: editQuestion.showImageGradually || false,
      });
      if (editQuestion.mediaType) {
        setFileName(editQuestion.fileName || '');
      }
    }
  }, [editQuestion]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Otázka je povinná';
    } else if (formData.question.length > QUIZ_VALIDATION.QUESTION_MAX_LENGTH) {
      newErrors.question = `Maximální délka je ${QUIZ_VALIDATION.QUESTION_MAX_LENGTH} znaků`;
    }

    if (!formData.answer.trim()) {
      newErrors.answer = 'Odpověď je povinná';
    } else if (formData.answer.length > QUIZ_VALIDATION.ANSWER_MAX_LENGTH) {
      newErrors.answer = `Maximální délka je ${QUIZ_VALIDATION.ANSWER_MAX_LENGTH} znaků`;
    }

    if (!formData.category) {
      newErrors.category = 'Kategorie je povinná';
    }

    if (formData.timeLimit < QUIZ_VALIDATION.TIME_LIMIT.MIN || 
        formData.timeLimit > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
      newErrors.timeLimit = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
    }

    if (mediaFile && mediaFile.size > QUIZ_VALIDATION.MEDIA_FILE_SIZE_LIMIT) {
      newErrors.media = `Soubor je příliš velký. Maximální velikost je ${QUIZ_VALIDATION.MEDIA_FILE_SIZE_LIMIT / 1024 / 1024}MB`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const isImage = QUIZ_VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type);
    const isAudio = QUIZ_VALIDATION.ALLOWED_AUDIO_TYPES.includes(file.type);

    if (!isImage && !isAudio) {
      setErrors({ ...errors, media: 'Nepodporovaný formát souboru' });
      return;
    }

    if (file.size > QUIZ_VALIDATION.MEDIA_FILE_SIZE_LIMIT) {
      setErrors({ 
        ...errors, 
        media: `Soubor je příliš velký. Maximální velikost je ${QUIZ_VALIDATION.MEDIA_FILE_SIZE_LIMIT / 1024 / 1024}MB` 
      });
      return;
    }

    setMediaFile(file);
    setFileName(file.name);
    setFormData(prev => ({
      ...prev,
      mediaType: isImage ? 'image' : 'audio',
      mediaUrl: null,
      oldMediaUrl: prev.mediaUrl, // Store old URL to be cleaned up later
      showImageGradually: isImage ? prev.showImageGradually : false
    }));

    setErrors({ ...errors, media: null });
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Pass the form data along with the mediaFile to be uploaded by the parent
    onSubmit({
      ...formData,
      mediaFile, // This will be handled by CreateQuizPage
      fileName,
    });
    
    resetForm();
  };

  // Reset form should also ensure showImageGradually is false if no media
  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      timeLimit: 30,
      category: '',
      mediaType: null,
      mediaUrl: null,
      showImageGradually: false,  // Always reset to false
    });
    setMediaFile(null);
    setFileName('');
    setErrors({});
  };

  // Update ref implementation to include isUploading state
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
        sx={{ 
          '& .MuiInputLabel-root': {
            px: 0.5
          }
        }}
      />

      <TextField
        fullWidth
        label="Správná odpověď"
        value={formData.answer || ''}
        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
        error={!!errors.answer}
        helperText={errors.answer || `${(formData.answer || '').length}/${QUIZ_VALIDATION.ANSWER_MAX_LENGTH}`}
        sx={{ 
          '& .MuiInputLabel-root': {
            px: 0.5
          }
        }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="outlined"
          component="label"
        >
          {mediaFile ? 'Změnit soubor' : 'Nahrát obrázek/audio (volitelně)'}
          <input
            type="file"
            hidden
            accept={[...QUIZ_VALIDATION.ALLOWED_IMAGE_TYPES, ...QUIZ_VALIDATION.ALLOWED_AUDIO_TYPES].join(',')}
            onChange={handleFileSelect}
          />
        </Button>
        {fileName && (
          <Typography variant="body2">
            Vybráno: {fileName}
          </Typography>
        )}
      </Box>

      {formData.mediaType === 'image' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.showImageGradually}
              onChange={(e) => setFormData({ ...formData, showImageGradually: e.target.checked })}
            />
          }
          label="Zobrazovat obrázek postupně po čtvercích"
        />
      )}

      {errors.media && (
        <Alert severity="error">{errors.media}</Alert>
      )}

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
    </Box>
  );
});

export default OpenAnswerForm;
