import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Slider,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { QUIZ_VALIDATION } from '../../../../../constants/quizValidation';
import { isValidAnagram, generateAnagram, fixAnagram } from './AnagramUtils';
import MapSelector from './MapSelector';
import CluesSection from './CluesSection';

const BlindMapForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  const initialFormData = editQuestion || {
    cityName: '',
    anagram: '',
    locationX: null,
    locationY: null,
    mapType: 'cz',
    radiusPreset: 'HARD',
    clue1: '',
    clue2: '',
    clue3: '',
    timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  // Handle editing
  useEffect(() => {
    if (editQuestion) {
      // Rearrange clues to avoid gaps
      const clues = rearrangeClues(
        editQuestion.clue1 || '', 
        editQuestion.clue2 || '', 
        editQuestion.clue3 || ''
      );
      
      setFormData({
        cityName: editQuestion.cityName || '',
        anagram: editQuestion.anagram ? editQuestion.anagram.toLowerCase() : '',
        locationX: editQuestion.locationX || null,
        locationY: editQuestion.locationY || null,
        mapType: editQuestion.mapType || 'cz',
        radiusPreset: editQuestion.radiusPreset || 'HARD',
        clue1: clues.clue1,
        clue2: clues.clue2,
        clue3: clues.clue3,
        timeLimit: editQuestion.timeLimit || editQuestion.length || QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
      });
    }
  }, [editQuestion]);

  // Handle blur event for anagram field
  const handleAnagramBlur = () => {
    if (formData.cityName && formData.anagram) {
      const fixedAnagram = fixAnagram(formData.cityName, formData.anagram);
      if (fixedAnagram !== formData.anagram) {
        setFormData({
          ...formData,
          anagram: fixedAnagram
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // City name validation
    if (!formData.cityName.trim()) {
      newErrors.cityName = 'Název města je povinný';
    } else if (formData.cityName.length > 50) {
      newErrors.cityName = 'Název města nesmí být delší než 50 znaků';
    }

    // Enhanced anagram validation - now case-insensitive
    if (!formData.anagram.trim()) {
      newErrors.anagram = 'Přesmyčka je povinná';
    } else if (formData.anagram.replace(/\s+/g, '').length !== formData.cityName.replace(/\s+/g, '').length) {
      newErrors.anagram = 'Přesmyčka musí obsahovat stejný počet znaků jako název města';
    } else if (!isValidAnagram(formData.cityName, formData.anagram)) {
      newErrors.anagram = 'Přesmyčka musí obsahovat stejné znaky a mezery jako název města';
    }

    // Map location validation
    if (formData.locationX === null || formData.locationY === null) {
      newErrors.location = 'Vyberte místo na mapě';
    }

    // Clue validations
    if (formData.clue1.length > 100) {
      newErrors.clue1 = 'Nápověda nesmí být delší než 100 znaků';
    }
    
    if (formData.clue2.length > 100) {
      newErrors.clue2 = 'Nápověda nesmí být delší než 100 znaků';
    }
    
    if (formData.clue3.length > 100) {
      newErrors.clue3 = 'Nápověda nesmí být delší než 100 znaků';
    }

    // Time limit validation
    if (formData.timeLimit < QUIZ_VALIDATION.TIME_LIMIT.MIN || 
        formData.timeLimit > QUIZ_VALIDATION.TIME_LIMIT.MAX) {
      newErrors.timeLimit = `Časový limit musí být mezi ${QUIZ_VALIDATION.TIME_LIMIT.MIN}-${QUIZ_VALIDATION.TIME_LIMIT.MAX} vteřinami`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateAnagram = () => {
    if (formData.cityName) {
      const newAnagram = generateAnagram(formData.cityName);
      setFormData({
        ...formData,
        anagram: newAnagram
      });
    }
  };

  const handleMapTypeChange = (event, value) => {
    if (value) {
      if (value !== formData.mapType) {
        // Reset location if map type changes
        setFormData({
          ...formData,
          mapType: value,
          locationX: null,
          locationY: null
        });
      } else {
        setFormData({
          ...formData,
          mapType: value
        });
      }
    }
  };

  // Add handler for radius preset changes
  const handleRadiusChange = (preset) => {
    if (preset) {
      setFormData(prevData => ({
        ...prevData,
        radiusPreset: preset
      }));
    }
  };

  const handleSelectLocation = (x, y) => {
    if (x !== null && y !== null) {
      setFormData(prevData => ({
        ...prevData,
        locationX: x,
        locationY: y
      }));
    }
  };

  const handleClueChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Rearrange clues to avoid gaps
    const rearrangedClues = rearrangeClues(formData.clue1, formData.clue2, formData.clue3);

    // Create a copy of formData with lowercased anagram and rearranged clues
    const submissionData = {
      ...formData,
      anagram: formData.anagram.toLowerCase(),
      question: "Slepá mapa",
      length: formData.timeLimit,
      clue1: rearrangedClues.clue1,
      clue2: rearrangedClues.clue2,
      clue3: rearrangedClues.clue3
    };

    onSubmit(submissionData);
    resetForm();
  };

  // Helper function to rearrange clues
  const rearrangeClues = (clue1, clue2, clue3) => {
    const nonEmptyClues = [clue1, clue2, clue3].filter(clue => clue && clue.trim() !== '');
    
    return {
      clue1: nonEmptyClues[0] || '',
      clue2: nonEmptyClues[1] || '',
      clue3: nonEmptyClues[2] || ''
    };
  };

  const resetForm = () => {
    setFormData({
      cityName: '',
      anagram: '',
      locationX: null,
      locationY: null,
      mapType: 'cz',
      radiusPreset: 'HARD', // Changed from 'MEDIUM' to 'HARD'
      clue1: '',
      clue2: '',
      clue3: '',
      timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
    });
    setErrors({});
  };

  React.useImperativeHandle(ref, () => ({
    submitForm: handleSubmit,
    resetForm
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 0.8 }}>
      <TextField
        fullWidth
        label="Název města"
        value={formData.cityName || ''}
        onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
        error={!!errors.cityName}
        helperText={errors.cityName || `${(formData.cityName || '').length}/50`}
        slotProps={{ 
          input: { 
            maxLength: 50 
          } 
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <TextField
          fullWidth
          label="Přesmyčka"
          value={formData.anagram || ''}
          onChange={(e) => setFormData({ 
            ...formData, 
            anagram: e.target.value.toLowerCase()
          })}
          onBlur={handleAnagramBlur}
          error={!!errors.anagram}
          helperText={
            errors.anagram || 
            (isValidAnagram(formData.cityName, formData.anagram) 
              ? "Přesmyčka je platná ✓" 
              : "Přesmyčka musí obsahovat stejné znaky jako název města")
          }
        />
        <Button 
          variant="outlined" 
          onClick={handleGenerateAnagram}
          disabled={!formData.cityName}
          sx={{ height: 56 }}
        >
          Generovat přesmyčku
        </Button>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        mb: 1 
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            whiteSpace: 'nowrap' 
          }}
        >
          Vyberte typ mapy:
        </Typography>
        <ToggleButtonGroup
          value={formData.mapType}
          exclusive
          onChange={handleMapTypeChange}
        >
          <ToggleButton value="cz">Česká republika</ToggleButton>
          <ToggleButton value="europe">Evropa</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <MapSelector
        locationX={formData.locationX}
        locationY={formData.locationY}
        mapType={formData.mapType}
        radiusPreset={formData.radiusPreset}
        error={errors.location}
        onSelectLocation={handleSelectLocation}
        onRadiusChange={handleRadiusChange}
      />

      <CluesSection
        clue1={formData.clue1}
        clue2={formData.clue2}
        clue3={formData.clue3}
        onChange={handleClueChange}
        errors={{
          clue1: errors.clue1,
          clue2: errors.clue2,
          clue3: errors.clue3
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
    </Box>
  );
});

export default BlindMapForm;
