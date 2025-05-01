/**
 * @fileoverview QuickPlayModal component - dialog for configuring and starting quick play games
 * @module Components/Desktop/Miscellaneous/QuickPlayModal
 */
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Slider,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  OutlinedInput,
  ListItemText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { QUIZ_TYPES, QUIZ_TYPE_TRANSLATIONS, QUIZ_VALIDATION, QUIZ_CATEGORIES } from '../../../constants/quizValidation';
import { scrollbarStyle } from '../../../utils/scrollbarStyle';

/**
 * Quiz types available for quick play mode
 * @constant
 * @type {string[]}
 */
const QUICK_PLAY_TYPES = [
  QUIZ_TYPES.ABCD,
  QUIZ_TYPES.TRUE_FALSE,
  QUIZ_TYPES.OPEN_ANSWER,
  QUIZ_TYPES.DRAWING,
  QUIZ_TYPES.WORD_CHAIN,
  QUIZ_TYPES.GUESS_A_NUMBER,
  QUIZ_TYPES.MATH_QUIZ,
  QUIZ_TYPES.BLIND_MAP
];

/**
 * Modal dialog component for configuring and starting quick play games
 * 
 * Provides customizable options for each quiz type:
 * - Drawing: rounds and time per round
 * - Word Chain: rounds and player time limits
 * - ABCD/True-False/Open Answer/Guess a number: number of questions and categories
 * - Math Quiz: number of questions
 * - Blind Map: rounds and map preference
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when the dialog is closed
 * @param {Function} props.onStartGame - Function to call with configuration when a game is started
 * @param {string} props.selectedType - The initially selected quiz type
 * @returns {React.ReactElement} Rendered modal dialog
 */
const QuickPlayModal = ({ open, onClose, onStartGame }) => {
  const [loading, setLoading] = useState(false);
  
  // State to track which quiz types are selected
  const [selectedTypes, setSelectedTypes] = useState({});
  
  // Drawing-specific state
  const [drawingRounds, setDrawingRounds] = useState(
    QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
  );
  const [drawingTime, setDrawingTime] = useState(
    QUIZ_VALIDATION.DRAWING.DEFAULT_TIME
  );

  // Word chain-specific state
  const [wordChainRounds, setWordChainRounds] = useState(QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS);
  const [wordChainTime, setWordChainTime] = useState(QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME);
  
  // ABCD-specific state
  const [abcdQuestions, setAbcdQuestions] = useState(5);
  const [abcdCategories, setAbcdCategories] = useState([]);

  // True/False-specific state
  const [trueFalseQuestions, setTrueFalseQuestions] = useState(5);
  const [trueFalseCategories, setTrueFalseCategories] = useState([]);
  
  // Open Answer-specific state
  const [openAnswerQuestions, setOpenAnswerQuestions] = useState(5);
  const [openAnswerCategories, setOpenAnswerCategories] = useState([]);
  const [excludeOpenAnswerAudio, setExcludeOpenAnswerAudio] = useState(false);
  
  // Guess a Number-specific state
  const [guessNumberQuestions, setGuessNumberQuestions] = useState(5);
  const [guessNumberCategories, setGuessNumberCategories] = useState([]);
  
  // Math Quiz-specific state
  const [mathQuizQuestions, setMathQuizQuestions] = useState(2);
  
  // Blind Map-specific state
  const [blindMapRounds, setBlindMapRounds] = useState(2);
  const [blindMapPreferredMap, setBlindMapPreferredMap] = useState('both'); // 'cz', 'eu', or 'both'
  
  // Track expanded accordion panels
  const [expanded, setExpanded] = useState(false);

  /**
   * Handle accordion panel expansion/collapse
   * 
   * @param {string} panel - Panel identifier to toggle
   * @returns {Function} Event handler for accordion changes
   */
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  /**
   * Toggle selection of a quiz type
   * 
   * @param {string} type - Quiz type identifier
   * @returns {Function} Event handler for checkbox changes
   */
  const handleTypeSelect = (type) => (event) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: event.target.checked
    }));

    // If checked, expand the panel
    if (event.target.checked) {
      setExpanded(type);
    }
  };

  /**
   * Start the game with current configuration
   * 
   * Gathers all selected quiz types and their configurations,
   * builds a combined game configuration and passes it to the parent.
   * 
   * @function handleStartGame
   */
  const handleStartGame = () => {
    setLoading(true);
    
    // Get all selected quiz types
    const types = Object.keys(selectedTypes).filter(type => selectedTypes[type]);
    
    if (types.length === 0) {
      alert('Vyberte alespoň jeden typ kvízu');
      setLoading(false);
      return;
    }

    // Create configuration for each selected type
    const typesConfig = types.map(type => {
      switch (type) {
        case QUIZ_TYPES.DRAWING:
          return {
            type: QUIZ_TYPES.DRAWING,
            numRounds: drawingRounds,
            roundLength: drawingTime
          };
        case QUIZ_TYPES.WORD_CHAIN:
          return {
            type: QUIZ_TYPES.WORD_CHAIN,
            numRounds: wordChainRounds,
            roundLength: wordChainTime
          };
        case QUIZ_TYPES.ABCD:
          return {
            type: QUIZ_TYPES.ABCD,
            numQuestions: abcdQuestions,
            categories: abcdCategories.length > 0 ? abcdCategories : null
          };
        case QUIZ_TYPES.TRUE_FALSE:
          return {
            type: QUIZ_TYPES.TRUE_FALSE,
            numQuestions: trueFalseQuestions,
            categories: trueFalseCategories.length > 0 ? trueFalseCategories : null
          };
        case QUIZ_TYPES.OPEN_ANSWER:
          return {
            type: QUIZ_TYPES.OPEN_ANSWER,
            numQuestions: openAnswerQuestions,
            categories: openAnswerCategories.length > 0 ? openAnswerCategories : null,
            excludeAudio: excludeOpenAnswerAudio
          };
        case QUIZ_TYPES.GUESS_A_NUMBER:
          return {
            type: QUIZ_TYPES.GUESS_A_NUMBER,
            numQuestions: guessNumberQuestions,
            categories: guessNumberCategories.length > 0 ? guessNumberCategories : null
          };
        case QUIZ_TYPES.MATH_QUIZ:
          return {
            type: QUIZ_TYPES.MATH_QUIZ,
            numQuestions: mathQuizQuestions
          };
        case QUIZ_TYPES.BLIND_MAP:
          return {
            type: QUIZ_TYPES.BLIND_MAP,
            numRounds: blindMapRounds,
            preferredMap: blindMapPreferredMap
          };
        default:
          return { type };
      }
    });

    // Always use the COMBINED_QUIZ format, even for a single quiz type
    const config = {
      quick_play_type: QUIZ_TYPES.COMBINED_QUIZ,
      typesConfig
    };
    
    onStartGame(config);
  };

  const atLeastOneSelected = Object.values(selectedTypes).some(Boolean);

  /**
   * Configuration for Select components with multiple options
   * 
   * @type {Object}
   */
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: 224,
        width: 250,
        ...scrollbarStyle
      },
    },
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Rychlá hra</DialogTitle>
      
      <DialogContent sx={{ ...scrollbarStyle }}>
        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
          Vyberte typy kvízů, které chcete zahrnout:
        </Typography>

        {QUICK_PLAY_TYPES.map((type) => (
          <Box key={type} sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!selectedTypes[type]}
                  onChange={handleTypeSelect(type)}
                  name={type}
                />
              }
              label={QUIZ_TYPE_TRANSLATIONS[type]}
            />
            
            {selectedTypes[type] && (
              <Accordion 
                expanded={expanded === type}
                onChange={handleAccordionChange(type)}
                sx={{ mt: 1, ml: 4 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Nastavení</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {type === QUIZ_TYPES.DRAWING && (
                    <Box>
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
                        sx={{ mb: 2 }}
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
                        Celkový počet kol: {drawingRounds} × počet hráčů (všichni hráči se vystřídají s kreslením)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        V každém kole dostane hráč na výběr ze 3 slov ke kreslení
                      </Typography>
                    </Box>
                  )}
                  
                  {type === QUIZ_TYPES.WORD_CHAIN && (
                    <Box>
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
                        sx={{ mb: 2 }}
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
                  )}

                  {type === QUIZ_TYPES.ABCD && (
                    <Box>
                      <Typography gutterBottom>
                        Počet otázek: {abcdQuestions}
                      </Typography>
                      <Slider
                        value={abcdQuestions}
                        onChange={(e, value) => setAbcdQuestions(value)}
                        aria-labelledby="abcd-questions-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={20}
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControl sx={{ width: '100%', mb: 2 }}>
                        <InputLabel id="abcd-categories-label">Kategorie (volitelné)</InputLabel>
                        <Select
                          labelId="abcd-categories-label"
                          id="abcd-categories"
                          multiple
                          value={abcdCategories}
                          onChange={(e) => setAbcdCategories(e.target.value)}
                          input={<OutlinedInput label="Kategorie (volitelné)" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                          MenuProps={MenuProps}
                        >
                          {QUIZ_CATEGORIES.map((category) => (
                            <MenuItem key={category} value={category}>
                              <Checkbox checked={abcdCategories.indexOf(category) > -1} />
                              <ListItemText primary={category} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Typography variant="body2" color="text.secondary">
                        Náhodné ABCD otázky vybrané z veřejných kvízů
                      </Typography>
                    </Box>
                  )}

                  {type === QUIZ_TYPES.TRUE_FALSE && (
                    <Box>
                      <Typography gutterBottom>
                        Počet otázek: {trueFalseQuestions}
                      </Typography>
                      <Slider
                        value={trueFalseQuestions}
                        onChange={(e, value) => setTrueFalseQuestions(value)}
                        aria-labelledby="true-false-questions-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={20}
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControl sx={{ width: '100%', mb: 2 }}>
                        <InputLabel id="true-false-categories-label">Kategorie (volitelné)</InputLabel>
                        <Select
                          labelId="true-false-categories-label"
                          id="true-false-categories"
                          multiple
                          value={trueFalseCategories}
                          onChange={(e) => setTrueFalseCategories(e.target.value)}
                          input={<OutlinedInput label="Kategorie (volitelné)" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                          MenuProps={MenuProps}
                        >
                          {QUIZ_CATEGORIES.map((category) => (
                            <MenuItem key={category} value={category}>
                              <Checkbox checked={trueFalseCategories.indexOf(category) > -1} />
                              <ListItemText primary={category} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Typography variant="body2" color="text.secondary">
                        Náhodné Pravda/Lež otázky vybrané z veřejných kvízů
                      </Typography>
                    </Box>
                  )}
                  
                  {type === QUIZ_TYPES.OPEN_ANSWER && (
                    <Box>
                      <Typography gutterBottom>
                        Počet otázek: {openAnswerQuestions}
                      </Typography>
                      <Slider
                        value={openAnswerQuestions}
                        onChange={(e, value) => setOpenAnswerQuestions(value)}
                        aria-labelledby="open-answer-questions-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={20}
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControl sx={{ width: '100%', mb: 2 }}>
                        <InputLabel id="open-answer-categories-label">Kategorie (volitelné)</InputLabel>
                        <Select
                          labelId="open-answer-categories-label"
                          id="open-answer-categories"
                          multiple
                          value={openAnswerCategories}
                          onChange={(e) => setOpenAnswerCategories(e.target.value)}
                          input={<OutlinedInput label="Kategorie (volitelné)" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                          MenuProps={MenuProps}
                        >
                          {QUIZ_CATEGORIES.map((category) => (
                            <MenuItem key={category} value={category}>
                              <Checkbox checked={openAnswerCategories.indexOf(category) > -1} />
                              <ListItemText primary={category} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={excludeOpenAnswerAudio}
                            onChange={(e) => setExcludeOpenAnswerAudio(e.target.checked)}
                          />
                        }
                        label="Nepřidávat audio otázky"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Náhodné otázky s otevřenou odpovědí vybrané z veřejných kvízů
                      </Typography>
                    </Box>
                  )}
                  
                  {type === QUIZ_TYPES.GUESS_A_NUMBER && (
                    <Box>
                      <Typography gutterBottom>
                        Počet otázek: {guessNumberQuestions}
                      </Typography>
                      <Slider
                        value={guessNumberQuestions}
                        onChange={(e, value) => setGuessNumberQuestions(value)}
                        aria-labelledby="guess-number-questions-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={20}
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControl sx={{ width: '100%', mb: 2 }}>
                        <InputLabel id="guess-number-categories-label">Kategorie (volitelné)</InputLabel>
                        <Select
                          labelId="guess-number-categories-label"
                          id="guess-number-categories"
                          multiple
                          value={guessNumberCategories}
                          onChange={(e) => setGuessNumberCategories(e.target.value)}
                          input={<OutlinedInput label="Kategorie (volitelné)" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                          MenuProps={MenuProps}
                        >
                          {QUIZ_CATEGORIES.map((category) => (
                            <MenuItem key={category} value={category}>
                              <Checkbox checked={guessNumberCategories.indexOf(category) > -1} />
                              <ListItemText primary={category} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Typography variant="body2" color="text.secondary">
                        Náhodné otázky typu Hádej číslo vybrané z veřejných kvízů
                      </Typography>
                    </Box>
                  )}
                  
                  {type === QUIZ_TYPES.MATH_QUIZ && (
                    <Box>
                      <Typography gutterBottom>
                        Počet otázek: {mathQuizQuestions}
                      </Typography>
                      <Slider
                        value={mathQuizQuestions}
                        onChange={(e, value) => setMathQuizQuestions(value)}
                        aria-labelledby="math-quiz-questions-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={20}
                        sx={{ mb: 2 }}
                      />
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Náhodné matematické otázky vybrané z veřejných kvízů
                      </Typography>
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 'medium' }}>
                        Pozor, jedna otázka obsahuje více matematických rovnic
                      </Typography>
                    </Box>
                  )}
                  
                  {type === QUIZ_TYPES.BLIND_MAP && (
                    <Box>
                      <Typography gutterBottom>
                        Počet kol: {blindMapRounds}
                      </Typography>
                      <Slider
                        value={blindMapRounds}
                        onChange={(e, value) => setBlindMapRounds(value)}
                        aria-labelledby="blind-map-rounds-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={1}
                        max={20}
                        sx={{ mb: 3 }}
                      />
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="map-selection-label">Preferované mapy</InputLabel>
                        <Select
                          labelId="map-selection-label"
                          value={blindMapPreferredMap}
                          label="Preferované mapy"
                          onChange={(e) => setBlindMapPreferredMap(e.target.value)}
                        >
                          <MenuItem value="cz">Česká republika</MenuItem>
                          <MenuItem value="eu">Evropa</MenuItem>
                          <MenuItem value="both">Obě mapy</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Náhodné otázky typu Slepá mapa vybrané z veřejných kvízů
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )}
            
            {type !== QUICK_PLAY_TYPES[QUICK_PLAY_TYPES.length - 1] && (
              <Divider sx={{ my: 2 }} />
            )}
          </Box>
        ))}

        {!atLeastOneSelected && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Vyberte alespoň jeden typ kvízu
          </Typography>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Zrušit</Button>
        <Button 
          onClick={handleStartGame} 
          variant="contained"
          disabled={loading || !atLeastOneSelected}
        >
          {loading ? 'Načítání...' : 'Spustit hru'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickPlayModal;