import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Tabs, 
  Tab, 
  Box, 
  Slider
} from '@mui/material';
import { QUIZ_TYPES, QUIZ_TYPE_TRANSLATIONS, QUIZ_VALIDATION } from '../../constants/quizValidation';

// Available quiz type configurations for quick play
const QUICK_PLAY_TYPES = [
  QUIZ_TYPES.DRAWING,
  QUIZ_TYPES.WORD_CHAIN,
  // Add more types as they become available for quick play
];

/**
 * A modal dialog for configuring quick play games
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onClose - Function to call when the dialog is closed
 * @param {function} props.onStartGame - Function to call when a game is started
 * @param {string} props.selectedType - The currently selected quiz type
 */
const QuickPlayModal = ({ open, onClose, onStartGame, selectedType }) => {
  // Get the tab index based on the selected type
  const getInitialTabIndex = () => {
    const index = QUICK_PLAY_TYPES.indexOf(selectedType);
    return index >= 0 ? index : 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTabIndex());
  const [loading, setLoading] = useState(false);
  
  // Drawing-specific state
  const [drawingRounds, setDrawingRounds] = useState(
    QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
  );
  const [drawingTime, setDrawingTime] = useState(
    QUIZ_VALIDATION.DRAWING.DEFAULT_TIME
  );

  // Word chain-specific state
  const [wordChainRounds, setWordChainRounds] = useState(QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS); // Default 3 rounds
  const [wordChainTime, setWordChainTime] = useState(QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME); // Default 30 seconds

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleStartGame = () => {
    setLoading(true);
    
    const quizType = QUICK_PLAY_TYPES[activeTab];
    let config = {};
    
    // Prepare configuration based on the selected quiz type
    switch (quizType) {
      case QUIZ_TYPES.DRAWING:
        config = {
          quick_play_type: QUIZ_TYPES.DRAWING,
          numRounds: drawingRounds,
          roundLength: drawingTime
        };
        break;
      case QUIZ_TYPES.WORD_CHAIN:
        config = {
          quick_play_type: QUIZ_TYPES.WORD_CHAIN,
          numRounds: wordChainRounds,
          roundLength: wordChainTime
        };
        break;
      // Add cases for other quiz types as they become available
      default:
        config = { quick_play_type: quizType };
    }
    
    onStartGame(config);
  };

  // Render content based on selected tab
  const renderTabContent = () => {
    const quizType = QUICK_PLAY_TYPES[activeTab];
    
    switch (quizType) {
      case QUIZ_TYPES.DRAWING:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography gutterBottom>
              Počet kol: {drawingRounds}
            </Typography>
            <Slider
              value={drawingRounds}
              onChange={(e, value) => setDrawingRounds(value)}
              aria-labelledby="rounds-slider"
              valueLabelDisplay="auto"
              step={1}
              marks
              min={QUIZ_VALIDATION.DRAWING.MIN_ROUNDS}
              max={QUIZ_VALIDATION.DRAWING.MAX_ROUNDS_QUICK_PLAY}
              sx={{ mb: 4 }}
            />
            
            <Typography gutterBottom>
              Délka kola: {drawingTime} sekund
            </Typography>
            <Slider
              value={drawingTime}
              onChange={(e, value) => setDrawingTime(value)}
              aria-labelledby="time-slider"
              valueLabelDisplay="auto"
              step={15}
              marks
              min={QUIZ_VALIDATION.DRAWING.MIN_TIME}
              max={QUIZ_VALIDATION.DRAWING.MAX_TIME}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Celkový počet kol: {drawingRounds} × počet hráčů
            </Typography>
            <Typography variant="body2" color="text.secondary">
              V každém kole dostane hráč na výběr ze 3 slov ke kreslení
            </Typography>
          </Box>
        );
      
      case QUIZ_TYPES.WORD_CHAIN:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography gutterBottom>
              Počet her: {wordChainRounds}
            </Typography>
            <Slider
              value={wordChainRounds}
              onChange={(e, value) => setWordChainRounds(value)}
              aria-labelledby="word-chain-rounds-slider"
              valueLabelDisplay="auto"
              step={1}
              marks
              min={QUIZ_VALIDATION.WORD_CHAIN.MIN_ROUNDS}
              max={QUIZ_VALIDATION.WORD_CHAIN.MAX_ROUNDS_QUICK_PLAY}
              sx={{ mb: 4 }}
            />
            
            <Typography gutterBottom>
              Časový limit hráče: {wordChainTime} sekund (pouze režim všichni proti všem)
            </Typography>
            <Slider
              value={wordChainTime}
              onChange={(e, value) => setWordChainTime(value)}
              aria-labelledby="word-chain-time-slider"
              valueLabelDisplay="auto"
              step={5}
              marks
              min={QUIZ_VALIDATION.WORD_CHAIN.MIN_TIME}
              max={QUIZ_VALIDATION.WORD_CHAIN.MAX_TIME}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Hráči budou pokračovat ve slovním řetězu a snažit se vymyslet slovo začínající na poslední písmeno předchozího slova
            </Typography>
            <Typography variant="body2" color="text.secondary">
              První slovo bude vybráno náhodně ze slovníku
            </Typography>
          </Box>
        );
      
      // Add cases for other quiz types as they become available
      default:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography>
              Nastavení pro tento typ kvízu nejsou k dispozici
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Rychlá hra</DialogTitle>
      
      <DialogContent>
        {/* Tabs for different quiz types */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {QUICK_PLAY_TYPES.map((type, index) => (
            <Tab key={type} label={QUIZ_TYPE_TRANSLATIONS[type]} value={index} />
          ))}
        </Tabs>
        
        {/* Content based on selected tab */}
        {renderTabContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Zrušit</Button>
        <Button 
          onClick={handleStartGame} 
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Načítání...' : 'Spustit hru'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickPlayModal;