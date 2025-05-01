/**
 * @fileoverview Open Answer Form component for creating and editing open-answer questions
 * 
 * This component provides:
 * - Form fields for question text and correct answer
 * - Media attachment support for images and audio
 * - Progressive image reveal option for images
 * - Time limit configuration via slider
 * - Validation for all fields with error display
 * - Support for editing existing questions
 * 
 * @module Components/Desktop/CreateQuiz/OpenAnswerForm
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  Alert,
  Slider,
} from '@mui/material';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES } from '../../../../constants/quizValidation';

/**
 * Open Answer Form component for creating and editing open-ended questions
 * 
 * Provides a form with fields for question text, answer, category, and time limit.
 * Supports media attachments with image and audio formats, including an option
 * for progressive image reveal during gameplay.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Object} props.editQuestion - Question data when editing an existing question
 * @param {Object} ref - Forwarded ref for parent control of form submission
 * @returns {JSX.Element} The rendered form component
 */
const OpenAnswerForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  const initialFormData = editQuestion || {
    question: '',
    answer: '',
    length: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
    category: '',
    mediaType: null, // 'image' or 'audio' or null
    mediaUrl: null,
    showImageGradually: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [mediaFile, setMediaFile] = useState(null);
  const [fileName, setFileName] = useState('');

  // Handle editing - populate form with existing question data
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        question: editQuestion.question || '',
        answer: editQuestion.answer || '',
        length: editQuestion.timeLimit || editQuestion.length || QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
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

  /**
   * Validates form data against content and format rules
   * 
   * Checks question text, answer, category, and time limit against constraints.
   * Also validates media file size if a file is selected.
   * 
   * @function validateForm
   * @returns {boolean} True if validation passes, false otherwise
   */
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

    if (formData.length < QUIZ_VALIDATION.TIME_LIMIT.MIN || 
        formData.length > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
      newErrors.length = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
    }

    if (mediaFile && mediaFile.size > QUIZ_VALIDATION.MEDIA_FILE_SIZE_LIMIT) {
      newErrors.media = `Soubor je příliš velký. Maximální velikost je ${QUIZ_VALIDATION.MEDIA_FILE_SIZE_LIMIT / 1024 / 1024}MB`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles file selection for media attachments
   * 
   * Validates file type and size, updates form state with file information,
   * and determines media type (image or audio).
   * 
   * @function handleFileSelect
   * @param {Event} event - File input change event
   */
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
      oldMediaUrl: prev.mediaUrl,
      showImageGradually: isImage ? prev.showImageGradually : false
    }));

    setErrors({ ...errors, media: null });
  };

  /**
   * Handles form submission after validation
   * 
   * Validates form data and calls the onSubmit callback with question data
   * including any media file to be uploaded.
   * 
   * @function handleSubmit
   */
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

  /**
   * Resets form to default state
   * 
   * Clears all form fields and errors, and resets media file selection.
   * 
   * @function resetForm
   */
  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      length: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
      category: '',
      mediaType: null,
      mediaUrl: null,
      showImageGradually: false,
    });
    setMediaFile(null);
    setFileName('');
    setErrors({});
  };

  // This allows the parent component to call submitForm and resetForm directly
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