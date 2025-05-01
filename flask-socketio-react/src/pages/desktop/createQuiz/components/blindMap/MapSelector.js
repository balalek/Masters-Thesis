/**
 * @fileoverview Map Selector component for Blind Map question creation
 * 
 * This component provides:
 * - Interactive map interface for selecting geographical locations
 * - Support for both Czech Republic and European maps
 * - Visual radius indicators for scoring zones
 * - Difficulty level configuration with preset radius sizes
 * - Location preview with coordinates and map display
 * 
 * @module Components/Desktop/CreateQuiz/BlindMap/MapSelector
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Modal,
  Paper,
  FormHelperText,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { scrollbarStyle } from '../../../../../utils/scrollbarStyle';
import { QUIZ_VALIDATION } from '../../../../../constants/quizValidation';

// Import map images
import czMapImage from '../../../../../assets/maps/cz.png';
import europeMapImage from '../../../../../assets/maps/europe.png';

const RADIUS_PRESETS = QUIZ_VALIDATION.BLIND_MAP.RADIUS_PRESETS;

/**
 * Map Selector component for interactive location selection
 * 
 * Provides a UI for selecting geographic coordinates on a map with
 * difficulty settings that control the size of the scoring radius.
 * Supports both Czech Republic and European maps with appropriate scaling.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number|null} props.locationX - Current X coordinate (0-1)
 * @param {number|null} props.locationY - Current Y coordinate (0-1)
 * @param {string} props.mapType - Map type ('cz' or 'europe')
 * @param {string} props.error - Error message to display
 * @param {Function} props.onSelectLocation - Callback when location is selected
 * @param {string} props.radiusPreset - Difficulty preset ('EASY' or 'HARD')
 * @param {Function} props.onRadiusChange - Callback when radius preset changes
 * @returns {JSX.Element} The rendered map selector component
 */
const MapSelector = ({ 
  locationX,
  locationY,
  mapType,
  error,
  onSelectLocation,
  radiusPreset = QUIZ_VALIDATION.BLIND_MAP.DEFAULT_PRESET,
  onRadiusChange = () => {}
}) => {
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const mapRef = useRef(null);
  const [tempLocation, setTempLocation] = useState({ x: null, y: null });
  const [selectedPreset, setSelectedPreset] = useState(radiusPreset || 'EASY');
  // Temporary preset state just for the modal
  const [tempPreset, setTempPreset] = useState(radiusPreset || 'EASY');
  const [mapDimensions, setMapDimensions] = useState({ width: 1, height: 1 });

  // Update selectedPreset when radiusPreset prop changes
  useEffect(() => {
    setSelectedPreset(radiusPreset || 'EASY');
  }, [radiusPreset]);

  /**
   * Update map dimensions when image loads
   * 
   * Captures the actual dimensions of the map image for
   * accurate radius circle scaling.
   * 
   * @function handleMapLoad
   */
  const handleMapLoad = () => {
    if (mapRef.current) {
      const { width, height } = mapRef.current.getBoundingClientRect();
      setMapDimensions({ width, height });
    }
  };

  /**
   * Handle map click to set temporary location
   * 
   * Calculates normalized coordinates (0-1) from the click position
   * relative to the map dimensions.
   * 
   * @function handleMapClick
   * @param {React.MouseEvent} e - Click event
   */
  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
    const y = ((e.clientY - rect.top) / rect.height).toFixed(4);
    
    setTempLocation({
      x: parseFloat(x),
      y: parseFloat(y)
    });
  };

  /**
   * Open the map selection modal
   * 
   * Initializes the temporary location and preset values
   * with the current values.
   * 
   * @function openMapSelector
   */
  const openMapSelector = () => {
    setTempLocation({ 
      x: locationX, 
      y: locationY 
    });
    // Reset temp preset to match current preset when opening modal
    setTempPreset(selectedPreset);
    setMapModalOpen(true);
  };

  /**
   * Close the map modal without saving changes
   * 
   * Resets temporary values to the current confirmed values.
   * 
   * @function closeMapModal
   */
  const closeMapModal = () => {
    setMapModalOpen(false);
    setTempLocation({ 
      x: locationX, 
      y: locationY 
    });
    // Reset temp preset when closing modal without confirming
    setTempPreset(selectedPreset);
  };

  /**
   * Confirm location selection and close modal
   * 
   * Saves the temporary location and preset values
   * as the confirmed values.
   * 
   * @function confirmLocationSelection
   */
  const confirmLocationSelection = () => {
    if (tempLocation.x !== null && tempLocation.y !== null) {
      onSelectLocation(tempLocation.x, tempLocation.y);
      // Only apply radius preset change when confirming
      if (tempPreset !== selectedPreset) {
        setSelectedPreset(tempPreset);
        onRadiusChange(tempPreset);
      }
    }
    setMapModalOpen(false);
  };

  /**
   * Handle radius preset change in the modal
   * 
   * Updates the temporary radius preset value.
   * 
   * @function handleRadiusPresetChange
   * @param {Object} event - Change event
   */
  const handleRadiusPresetChange = (event) => {
    const newPreset = event.target.value;
    // Only update the temporary preset
    setTempPreset(newPreset);
  };

  /**
   * Get the current map image based on mapType
   * 
   * Returns the appropriate map image for the current map type.
   * 
   * @function getCurrentMapImage
   * @returns {string} URL of the map image
   */
  const getCurrentMapImage = () => {
    return mapType === 'cz' ? czMapImage : europeMapImage;
  };

  return (
    <Box>
      <Button 
        variant="outlined" 
        fullWidth 
        sx={{ 
          py: 1.5,
          ...(locationX !== null && locationY !== null && {
            backgroundColor: 'success.lighter',
            borderColor: 'success.main',
            color: 'success.dark',
            '&:hover': {
              backgroundColor: 'success.light',
              borderColor: 'success.main',
            }
          })
        }}
        onClick={openMapSelector}
        startIcon={
          locationX !== null && locationY !== null ? 
          <Box component="span" sx={{ 
            width: 20, 
            height: 20, 
            bgcolor: 'success.main', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ✓
          </Box> : null
        }
      >
        {locationX !== null && locationY !== null ? 
          "Umístění vybráno - Upravit" : 
          "Vybrat umístění na mapě"
        }
      </Button>
      {error && (
        <FormHelperText error>{error}</FormHelperText>
      )}

      {locationX !== null && locationY !== null && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 1, 
            border: '1px solid', 
            borderColor: 'success.main',
            borderRadius: 1,
            backgroundColor: 'success.lighter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ fontWeight: 'bold', color: 'success.dark', mb: 1 }}
          >
            Umístění vybráno na mapě {mapType === 'cz' ? 'České republiky' : 'Evropy'}
          </Typography>
          
          <Box 
            sx={{ 
              position: 'relative',
              width: '100%',
              maxWidth: '200px',
              margin: '0 auto'
            }}
          >
            <Box
              component="img"
              src={getCurrentMapImage()}
              alt="Náhled vybraného místa"
              sx={{ 
                width: '100%', 
                height: 'auto',
                opacity: 0.8,
                borderRadius: 1
              }}
              onLoad={handleMapLoad}
            />
            
            {/* Only show the center marker in the preview, not the radius circles */}
            <Box
              sx={{
                position: 'absolute',
                left: `${locationX * 100}%`,
                top: `${locationY * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '12px',
                height: '12px',
                bgcolor: 'error.main',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                zIndex: 10
              }}
            />
          </Box>
          
          {/* Difficulty selector in preview should match modal layout */}
          <Box sx={{ 
            mt: 2,
            display: 'flex', 
            alignItems: 'center',
            gap: 2
          }}>
            <Typography>Náročnost:</Typography>
            <FormControl sx={{ minWidth: 150 }}>
              <Select
                value={selectedPreset}
                onChange={(e) => {
                  const newPreset = e.target.value;
                  setSelectedPreset(newPreset);
                  onRadiusChange(newPreset);
                }}
                size="small"
              >
                <MenuItem value="EASY">Snadnější</MenuItem>
                <MenuItem value="HARD">Obtížnější</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {selectedPreset === 'EASY' 
                ? 'Větší oblast na získání bodů' 
                : 'Menší oblast na získání bodů'}
            </Typography>
          </Box>
        </Box>
      )}

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
          <Typography variant="h6" sx={{ mb: 3 }}>
            Vyberte umístění na mapě {mapType === 'cz' ? 'České republiky' : 'Evropy'}
          </Typography>
          
          {/* Map image with click event */}
          
          <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
              component="img"
              src={getCurrentMapImage()}
              alt={mapType === 'cz' ? 'Mapa České republiky' : 'Mapa Evropy'}
              sx={{ 
                width: '100%', 
                height: 'auto',
                cursor: 'pointer'
              }}
              onClick={handleMapClick}
              ref={mapRef}
              onLoad={handleMapLoad}
            />
            
            {tempLocation.x !== null && tempLocation.y !== null && (
              <>
                {/* Temporary radius circle for selected location */}
                {tempPreset === 'EASY' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${tempLocation.x * 100}%`,
                      top: `${tempLocation.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${RADIUS_PRESETS.EASY.exact * 200}%`,
                      height: `${RADIUS_PRESETS.EASY.exact * 200 * (mapDimensions.width / mapDimensions.height)}%`,
                      bgcolor: 'rgba(244, 67, 54, 0.3)',
                      border: '1px solid rgba(244, 67, 54, 0.3)',
                      borderRadius: '50%',
                      zIndex: 8,
                      pointerEvents: 'none'
                    }}
                  />
                )}
                
                {/* Temporary radius circle for selected location */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${tempLocation.x * 100}%`,
                    top: `${tempLocation.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${RADIUS_PRESETS[tempPreset].exact * 200}%`,
                    height: `${RADIUS_PRESETS[tempPreset].exact * 200 * (mapDimensions.width / mapDimensions.height)}%`,
                    bgcolor: 'rgba(244, 67, 54, 0.3)',
                    border: '1px solid rgba(244, 67, 54, 0.7)',
                    borderRadius: '50%',
                    zIndex: 9,
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Center marker in modal */}
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
              </>
            )}
          </Box>
          
          {/* Difficulty controls at the bottom with the buttons */}
          <Box sx={{ 
            mt: 3, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>Náročnost:</Typography>
              <FormControl sx={{ minWidth: 150 }}>
                <Select
                  value={tempPreset}
                  onChange={handleRadiusPresetChange}
                  size="small"
                >
                  <MenuItem value="EASY">Snadnější</MenuItem>
                  <MenuItem value="HARD">Obtížnější</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {tempPreset === 'EASY' 
                  ? 'Větší oblast na získání bodů' 
                  : 'Menší oblast na získání bodů'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined"
                onClick={closeMapModal}
              >
                Zrušit
              </Button>
              <Button 
                variant="contained" 
                onClick={confirmLocationSelection}
                color="primary"
                disabled={tempLocation.x === null || tempLocation.y === null}
              >
                Potvrdit výběr
              </Button>
            </Box>
          </Box>
        </Paper>
      </Modal>
    </Box>
  );
};

export default MapSelector;