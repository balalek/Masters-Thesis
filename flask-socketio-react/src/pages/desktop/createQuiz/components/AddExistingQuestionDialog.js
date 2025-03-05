import React, { useState } from 'react';
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

const mockQuestions = [
  {
    id: 1001,
    text: "Jaké je hlavní město České republiky?",
    type: QUESTION_TYPES.ABCD,
    answers: [
      { text: "Praha", isCorrect: true },
      { text: "Brno", isCorrect: false },
      { text: "Ostrava", isCorrect: false },
      { text: "Plzeň", isCorrect: false }
    ],
    isMyQuestion: true,
    quizName: "Česká geografie",
    timesPlayed: 145
  },
  {
    id: 1002,
    text: "Země je placatá.",
    type: QUESTION_TYPES.TRUE_FALSE,
    answers: [
      { text: "Pravda", isCorrect: false },
      { text: "Nepravda", isCorrect: true }
    ],
    isMyQuestion: true,
    quizName: "Obecné znalosti",
    timesPlayed: 89
  },
  {
    id: 1003,
    text: "Která z následujících není primární barva?",
    type: QUESTION_TYPES.ABCD,
    answers: [
      { text: "Červená", isCorrect: false },
      { text: "Zelená", isCorrect: false },
      { text: "Oranžová", isCorrect: true },
      { text: "Modrá", isCorrect: false }
    ],
    isMyQuestion: false,
    quizName: "Výtvarná výchova",
    timesPlayed: 234
  },
  {
    id: 1004,
    text: "Která z následujících není primární barva?",
    type: QUESTION_TYPES.ABCD,
    answers: [
      { text: "Červená", isCorrect: false },
      { text: "Zelená", isCorrect: false },
      { text: "Oranžová", isCorrect: true },
      { text: "Modrá", isCorrect: false }
    ],
    isMyQuestion: true,
    quizName: "Výtvarná výchova",
    timesPlayed: 234
  }
];

const AddExistingQuestionDialog = ({ open, onClose, onAddQuestions }) => {
  const [search, setSearch] = useState('');
  const [questionSource, setQuestionSource] = useState('others');
  const [questionTypes, setQuestionTypes] = useState('all');
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Add this to check what types we're dealing with
  React.useEffect(() => {
    console.log('Question types in mock data:', 
      [...new Set(mockQuestions.map(q => q.type))]
    );
  }, []);

  // Reset states when dialog opens
  React.useEffect(() => {
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
    console.log('Selected value:', event.target.value); // Debug log
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

  // Add debug logging
  console.log('QUIZ_TYPES:', QUIZ_TYPES);
  console.log('Current questionTypes:', questionTypes);
  console.log('Filtered Questions:', mockQuestions.map(q => ({ text: q.text, type: q.type })));
  console.log('QUIZ_TYPES values:', QUIZ_TYPES);

  const filteredQuestions = mockQuestions.filter(question => {
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
            Nalezeno {filteredQuestions.filter(q => !selectedQuestions.some(sq => sq.id === q.id)).length} otázek
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
