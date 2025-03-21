import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Slider,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  FormHelperText,
  Tooltip,
  Modal,
  Paper
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { QUIZ_VALIDATION, QUIZ_CATEGORIES } from '../../../../constants/quizValidation';
import { scrollbarStyle } from '../../../../utils/scrollbarStyle';

// Import map images - adjust paths as needed for your project structure
import czMapImage from '../../../../assets/maps/cz.png';
import europeMapImage from '../../../../assets/maps/europe.png';

const BlindMapForm = React.forwardRef(({ onSubmit, editQuestion = null }, ref) => {
  const initialFormData = editQuestion || {
    question: '',
    cityName: '',
    anagram: '',
    locationX: null,
    locationY: null,
    mapType: 'cz',
    clue1: '',
    clue2: '',
    clue3: '',
    timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
    category: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const mapRef = useRef(null);
  // Add state for temporary location
  const [tempLocation, setTempLocation] = useState({ x: null, y: null });

  // Handle editing
  useEffect(() => {
    if (editQuestion) {
      setFormData({
        question: editQuestion.question || '',
        cityName: editQuestion.cityName || '',
        anagram: editQuestion.anagram || '',
        locationX: editQuestion.locationX || null,
        locationY: editQuestion.locationY || null,
        mapType: editQuestion.mapType || 'cz',
        clue1: editQuestion.clue1 || '',
        clue2: editQuestion.clue2 || '',
        clue3: editQuestion.clue3 || '',
        timeLimit: editQuestion.timeLimit || editQuestion.length || QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
        category: editQuestion.category || '',
      });
    }
  }, [editQuestion]);

  // Generate anagram
  const generateAnagram = () => {
    if (!formData.cityName) return;
    
    // Remove diacritics
    const normalized = formData.cityName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Convert to array and shuffle
    const chars = normalized.replace(/\s+/g, '').split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    
    setFormData({
      ...formData,
      anagram: chars.join('').toUpperCase()
    });
  };

  const validateForm = () => {
    const newErrors = {};

    // Question validation
    if (!formData.question.trim()) {
      newErrors.question = 'Otázka je povinná';
    } else if (formData.question.length > QUIZ_VALIDATION.QUESTION_MAX_LENGTH) {
      newErrors.question = `Maximální délka je ${QUIZ_VALIDATION.QUESTION_MAX_LENGTH} znaků`;
    }

    // City name validation
    if (!formData.cityName.trim()) {
      newErrors.cityName = 'Název města je povinný';
    }

    // Map location validation
    if (formData.locationX === null || formData.locationY === null) {
      newErrors.location = 'Vyberte místo na mapě';
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

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      ...formData,
      length: formData.timeLimit // Ensure length is included for backend compatibility
    });
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      question: '',
      cityName: '',
      anagram: '',
      locationX: null,
      locationY: null,
      mapType: 'cz',
      clue1: '',
      clue2: '',
      clue3: '',
      timeLimit: QUIZ_VALIDATION.TIME_LIMIT.DEFAULT,
      category: '',
    });
    setErrors({});
  };

  React.useImperativeHandle(ref, () => ({
    submitForm: handleSubmit,
    resetForm
  }));

  // Handle map click to set temporary location
  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
    const y = ((e.clientY - rect.top) / rect.height).toFixed(4);
    
    // Update temporary location instead of formData
    setTempLocation({
      x: parseFloat(x),
      y: parseFloat(y)
    });
  };

  // Open the map selection modal
  const openMapSelector = () => {
    // Initialize temp location with current location
    setTempLocation({ 
      x: formData.locationX, 
      y: formData.locationY 
    });
    setMapModalOpen(true);
  };

  // Close the map modal and discard changes
  const closeMapModal = () => {
    setMapModalOpen(false);
    // Reset temp location when closing modal without confirming
    setTempLocation({ 
      x: formData.locationX, 
      y: formData.locationY 
    });
  };

  // Confirm location selection
  const confirmLocationSelection = () => {
    // Only update formData when the button is clicked
    if (tempLocation.x !== null && tempLocation.y !== null) {
      setFormData({
        ...formData,
        locationX: tempLocation.x,
        locationY: tempLocation.y
      });
    }
    setMapModalOpen(false);
  };

  // Get the current map image based on mapType
  const getCurrentMapImage = () => {
    return formData.mapType === 'cz' ? czMapImage : europeMapImage;
  };

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

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <TextField
          fullWidth
          label="Název města"
          value={formData.cityName || ''}
          onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
          error={!!errors.cityName}
          helperText={errors.cityName}
        />
        <Button 
          variant="outlined" 
          onClick={generateAnagram}
          disabled={!formData.cityName}
          sx={{ mt: 1 }}
        >
          Generovat přesmyčku
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Přesmyčka"
        value={formData.anagram || ''}
        onChange={(e) => setFormData({ ...formData, anagram: e.target.value })}
      />

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          Vyberte typ mapy:
          <Tooltip title="Vyberte mapu, na které bude hráč hledat město.">
            <InfoIcon fontSize="small" sx={{ ml: 1, color: 'action.active' }} />
          </Tooltip>
        </Typography>
        <ToggleButtonGroup
          value={formData.mapType}
          exclusive
          onChange={(e, value) => {
            if (value) {
              setFormData({ ...formData, mapType: value });
              // Reset location if map type changes
              if (value !== formData.mapType) {
                setFormData(prev => ({
                  ...prev,
                  mapType: value,
                  locationX: null,
                  locationY: null
                }));
              }
            }
          }}
        >
          <ToggleButton value="cz">Česká republika</ToggleButton>
          <ToggleButton value="europe">Evropa</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Button 
          variant="outlined" 
          fullWidth 
          sx={{ py: 1.5 }}
          onClick={openMapSelector}
        >
          Vybrat umístění na mapě
          {formData.locationX !== null && formData.locationY !== null && " ✓"}
        </Button>
        {errors.location && (
          <FormHelperText error>{errors.location}</FormHelperText>
        )}

        {/* Preview selected location */}
        {formData.locationX !== null && formData.locationY !== null && (
          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Typography variant="caption">
              Souřadnice: X={formData.locationX.toFixed(4)}, Y={formData.locationY.toFixed(4)}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Map Selection Modal */}
      <Modal
        open={mapModalOpen}
        onClose={closeMapModal}
        aria-labelledby="map-selection-modal"
      >
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            maxWidth: '900px',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            outline: 'none',
            maxHeight: '90vh',
            overflow: 'auto',
            ...scrollbarStyle
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Vyberte umístění na mapě {formData.mapType === 'cz' ? 'České republiky' : 'Evropy'}
          </Typography>
          
          <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
              component="img"
              src={getCurrentMapImage()}
              alt={formData.mapType === 'cz' ? 'Mapa České republiky' : 'Mapa Evropy'}
              sx={{ 
                width: '100%', 
                height: 'auto',
                cursor: 'pointer'
              }}
              onClick={handleMapClick}
              ref={mapRef}
            />
            
            {/* Show pin marker at temporary selected location */}
            {tempLocation.x !== null && tempLocation.y !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${tempLocation.x * 100}%`,
                  top: `${tempLocation.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '20px',
                  height: '20px',
                  bgcolor: 'error.main',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                  zIndex: 10
                }}
              />
            )}
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={confirmLocationSelection}
              color="primary"
            >
              Potvrdit výběr
            </Button>
          </Box>
        </Paper>
      </Modal>

      <Typography variant="subtitle1">Nápovědy (volitelné):</Typography>
      
      <TextField
        fullWidth
        label="Nápověda 1"
        value={formData.clue1 || ''}
        onChange={(e) => setFormData({ ...formData, clue1: e.target.value })}
      />

      <TextField
        fullWidth
        label="Nápověda 2"
        value={formData.clue2 || ''}
        onChange={(e) => setFormData({ ...formData, clue2: e.target.value })}
      />

      <TextField
        fullWidth
        label="Nápověda 3"
        value={formData.clue3 || ''}
        onChange={(e) => setFormData({ ...formData, clue3: e.target.value })}
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

export default BlindMapForm;
