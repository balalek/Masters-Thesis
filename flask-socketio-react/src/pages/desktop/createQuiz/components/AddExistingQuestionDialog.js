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
import { QUESTION_TYPES, QUIZ_TYPES } from '../../../../constants/quizValidation';
import QuestionCard from './QuestionCard';
import { scrollbarStyle } from '../../../../utils/scrollbarStyle';

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
      
      const response = await fetch(`/get_existing_questions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data = await response.json();
      const newQuestions = data.questions.map(q => ({
        ...q,
        id: q._id,
        text: q.question,
        answers: q.options.map((text, index) => ({
          text,
          isCorrect: index === q.answer
        }))
      }));

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
    onAddQuestions(selectedQuestions);
    onClose();
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(search.toLowerCase());
    const matchesSource = 
      (questionSource === 'mine' && question.isMyQuestion) ||
      (questionSource === 'others' && !question.isMyQuestion);
    
    // Updated type matching to only include ABCD and TRUE_FALSE when "all" is selected
    const matchesType = 
      (questionTypes === 'all' && (
        question.type === QUESTION_TYPES.ABCD || 
        question.type === QUESTION_TYPES.TRUE_FALSE
      )) || 
      question.type === questionTypes;
      
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
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
