import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Box, 
  FormControl, 
  Typography, 
  Divider,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  InputAdornment,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { QUESTION_TYPES, QUIZ_TYPES } from '../../../../../constants/quizValidation';
import QuestionCard from './QuestionCard';
import { scrollbarStyle } from '../../../../../utils/scrollbarStyle';
import { QUIZ_VALIDATION } from '../../../../../constants/quizValidation';

const AddExistingQuestionDialog = ({ open, onClose, onAddQuestions }) => {
  const [search, setSearch] = useState('');
  const [questionSource, setQuestionSource] = useState('others');
  const [questionTypes, setQuestionTypes] = useState('all');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  
  // Reset expanded question when the dialog closes or filters change
  useEffect(() => {
    setExpandedQuestionId(null);
  }, [open, search, questionSource, questionTypes]);

  const fetchQuestions = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        type: questionSource,
        questionType: questionTypes,
        search: search,
        page: pageNum
      });
      
      console.log(`Fetching questions with params: ${params.toString()}`);
      
      const response = await fetch(`/get_existing_questions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data = await response.json();
      console.log(`Got ${data.questions.length} questions, total: ${data.totalCount}`);
      
      const newQuestions = data.questions.map(q => {
        // Make sure answers is always properly formatted
        let answers = q.answers;
        if (!answers && q.type === QUESTION_TYPES.OPEN_ANSWER) {
          answers = [{ text: `Správná odpověď: ${q.open_answer || ''}`, isCorrect: true }];
        } else if (!answers && q.type === QUESTION_TYPES.GUESS_A_NUMBER) {
          answers = [{ text: `Správná odpověď: ${q.number_answer || '0'}`, isCorrect: true }];
        } else if (!answers && q.type === QUESTION_TYPES.BLIND_MAP) {
          // Add console log to debug the blind map data
          console.log('Processing blind map question:', q);
          answers = [{ text: `Správná odpověď: ${q.city_name || q.cityName || 'Není uvedeno'}`, isCorrect: true }];
        } else if (!answers && q.options) {
          answers = q.options.map((text, index) => ({
            text,
            isCorrect: index === q.answer
          }));
        }
        
        // Ensure we preserve all important fields for open answers
        const questionData = {
          ...q,
          id: q._id,
          text: q.question,
          answers: answers
        };
        
        // Make sure open answer fields are properly included
        if (q.type === QUESTION_TYPES.OPEN_ANSWER) {
          questionData.answer = q.open_answer;  // Make sure we preserve the answer
          questionData.mediaType = q.media_type;
          questionData.mediaUrl = q.media_url;
          questionData.showImageGradually = q.show_image_gradually;
          questionData.fileName = q.media_url ? q.media_url.split('/').pop() : '';
        } else if (q.type === QUESTION_TYPES.GUESS_A_NUMBER) {
          questionData.answer = q.number_answer || 0;
        } else if (q.type === QUESTION_TYPES.BLIND_MAP) {
          // Add BlindMap specific fields
          questionData.cityName = q.city_name || q.cityName || '';
          questionData.city_name = q.city_name || q.cityName || '';
          questionData.anagram = q.anagram || '';
          questionData.locationX = q.location_x || q.locationX || 0;
          questionData.locationY = q.location_y || q.locationY || 0;
          questionData.mapType = q.map_type || q.mapType || 'cz';
          questionData.radiusPreset = q.radius_preset || q.radiusPreset || 'HARD';
          questionData.clue1 = q.clue1 || '';
          questionData.clue2 = q.clue2 || '';
          questionData.clue3 = q.clue3 || '';
        }
        
        return questionData;
      });

      setQuestions(append ? [...questions, ...newQuestions] : newQuestions);
      setHasMore(data.hasMore);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError('Failed to load questions');
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuestions(nextPage, true);
  };

  // Modify useEffect to reset pagination when filters change
  useEffect(() => {
    if (open) {
      setPage(1);
      fetchQuestions(1, false);
    }
  }, [open, search, questionSource, questionTypes]);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setQuestionSource('others');
      setQuestionTypes('all');
      setSelectedQuestions([]);
    }
  }, [open]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleQuestionSourceChange = (event) => {
    setQuestionSource(event.target.value);
  };

  const handleQuestionTypesChange = (event) => {
    setQuestionTypes(event.target.value);
  };

  const handleToggleQuestion = (question) => {
    const currentIndex = selectedQuestions.findIndex(q => q.id === question.id);
    const newSelected = [...selectedQuestions];

    if (currentIndex === -1) {
      newSelected.push(question);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedQuestions(newSelected);
  };

  const handleAddSelected = () => {
    // Use the transformation logic before adding questions
    handleAddExistingQuestions(selectedQuestions);
    onClose();
  };

  const handleAddExistingQuestions = (selectedQuestions) => {
    console.log('Selected questions to add:', selectedQuestions);
    
    const newQuestions = selectedQuestions.map(question => {
      // Create base question with all original fields
      const baseQuestion = {
        question: question.text || question.question || '',
        type: question.type,
        timeLimit: question.length || question.timeLimit || 30,
        category: question.category || '',
        id: Date.now() + Math.random(),
        copy_of: question.copy_of || question._id || question.id,
        is_copy: true
      };
      
      if (question.type === QUESTION_TYPES.BLIND_MAP) {
        console.log('Processing Blind Map Question:', question);
        return {
          ...baseQuestion,
          text: "Slepá mapa",  // Preserve text field
          cityName: question.cityName || question.city_name || '',
          anagram: question.anagram || '',
          locationX: question.coords ? question.coords[0] : (question.locationX || question.location_x || 0),
          locationY: question.coords ? question.coords[1] : (question.locationY || question.location_y || 0),
          mapType: question.mapType || question.map_type || 'cz',
          radiusPreset: question.radiusPreset || question.radius_preset || 'HARD',
          clue1: question.clue1 || '',
          clue2: question.clue2 || '',
          clue3: question.clue3 || '',
          length: question.length || question.timeLimit || 30,
        };
      } else if (question.type === QUESTION_TYPES.OPEN_ANSWER) {
        return {
          ...baseQuestion,
          answer: question.answer || question.open_answer || '',
          mediaType: question.mediaType || question.media_type || '',
          mediaUrl: question.mediaUrl || question.media_url || '',
          showImageGradually: question.showImageGradually || question.show_image_gradually || false,
          fileName: question.fileName || (question.mediaUrl ? question.mediaUrl.split('/').pop() : '')
        };
      } else if (question.type === QUESTION_TYPES.GUESS_A_NUMBER) {
        return {
          ...baseQuestion,
          answer: question.number_answer || question.answer || 0,
        };
      } else if (question.type === QUESTION_TYPES.MATH_QUIZ) {
        return {
          ...baseQuestion,
          sequences: question.sequences?.map(seq => ({
            id: Date.now() + Math.random(),
            equation: seq.equation || '',
            answer: seq.answer || '',
            length: seq.length || QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT
          })) || []
        };
      } else if (question.type === QUESTION_TYPES.ABCD || question.type === QUESTION_TYPES.TRUE_FALSE) {
        // DEBUG THE SOURCE DATA
        console.log(`Processing ${question.type} question:`, JSON.stringify(question.answers));
        
        // Fix: Don't transform just directly use the answers as they are
        return {
          ...baseQuestion,
          answers: Array.isArray(question.answers) 
            ? question.answers.map(a => a.text)
            : [],
          correctAnswer: Array.isArray(question.answers) 
            ? question.answers.findIndex(a => a.isCorrect) 
            : 0
        };
      }
      
      // Default case - return the base question with all original properties
      return baseQuestion;
    });
    
    // Log the transformed questions for debugging
    console.log('Transformed questions:', newQuestions);
    onAddQuestions(newQuestions);
  };

  const filteredQuestions = questions.filter(question => {
    if (!question) return false;
    
    const matchesSearch = question.text && question.text.toLowerCase().includes(search.toLowerCase());
    const matchesSource = 
      (questionSource === 'mine' && question.isMyQuestion) ||
      (questionSource === 'others' && !question.isMyQuestion);
    
    // Fix matching logic to show ALL question types when "all" is selected
    const matchesType = 
      questionTypes === 'all' || question.type === questionTypes;
      
    return matchesSearch && matchesSource && matchesType;
  });

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      PaperProps={{
        sx: {
          height: '80vh', // Fixed height
          maxHeight: '800px', // Maximum height
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>Přidat existující otázku</DialogTitle>
      <DialogContent sx={{ 
        flex: 1,
        overflow: 'hidden', // Prevent content scroll
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          mb: 3,
          display: 'flex',
          gap: 2,
          alignItems: 'center'
        }}>
          <TextField
            sx={{ flexGrow: 1 }}
            placeholder="Hledat otázky..."
            value={search}
            onChange={handleSearchChange}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }
            }}
            size="medium"
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <Select
              value={questionSource}
              onChange={handleQuestionSourceChange}
              sx={{ height: '56px' }} // Match TextField height
            >
              <MenuItem value="mine">Moje otázky</MenuItem>
              <MenuItem value="others">Veřejné otázky</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <Select
              value={questionTypes}
              onChange={handleQuestionTypesChange}
              sx={{ height: '56px' }} // Match TextField height
            >
              <MenuItem value="all">Všechny typy</MenuItem>
              <MenuItem value={QUESTION_TYPES.ABCD}>ABCD</MenuItem>
              <MenuItem value={QUESTION_TYPES.TRUE_FALSE}>Pravda/Lež</MenuItem>
              <MenuItem value={QUESTION_TYPES.OPEN_ANSWER}>Otevřená odpověď</MenuItem>
              <MenuItem value={QUESTION_TYPES.GUESS_A_NUMBER}>Hádej číslo</MenuItem>
              <MenuItem value={QUESTION_TYPES.MATH_QUIZ}>Matematické rovnice</MenuItem>
              <MenuItem value={QUESTION_TYPES.BLIND_MAP}>Slepá mapa</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}>
          {selectedQuestions.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Vybrané otázky ({selectedQuestions.length})
              </Typography>
              <List sx={{ 
                mb: 2,
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
                bgcolor: 'primary.lighter',
                maxHeight: '30%',
                overflow: 'auto',
                ...scrollbarStyle
              }}>
                {selectedQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    isSelected={true}
                    onToggleSelect={handleToggleQuestion}
                    expandedQuestionId={expandedQuestionId}
                    onExpandToggle={setExpandedQuestionId}
                  />
                ))}
              </List>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Nalezeno {totalCount} otázek 
            {questions.length < totalCount && ` (zobrazeno ${questions.length})`}
          </Typography>

          <List sx={{ 
            flex: 1,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            ...scrollbarStyle
          }}>
            {filteredQuestions
              .filter(q => !selectedQuestions.some(sq => sq.id === q.id)) // Don't show already selected questions
              .map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isSelected={false}
                  onToggleSelect={handleToggleQuestion}
                  expandedQuestionId={expandedQuestionId}
                  onExpandToggle={setExpandedQuestionId}
                />
              ))}
            {filteredQuestions.length === 0 && (
              <ListItem>
                <ListItemText primary="Žádné výsledky nevyhovují zadaným filtrům" />
              </ListItem>
            )}
            {hasMore && (
              <ListItem sx={{ justifyContent: 'center', py: 2 }}>
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outlined"
                >
                  {loading ? 'Načítání...' : 'Zobrazit další'}
                </Button>
              </ListItem>
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        px: 3, // Match content padding
        py: 2,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button 
          variant="contained" 
          onClick={handleAddSelected}
          disabled={selectedQuestions.length === 0}
        >
          Přidat {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : ''} otázky
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddExistingQuestionDialog;
