import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Select, MenuItem, Typography, Button, Container, Snackbar, Alert } from '@mui/material';
import QuestionForm from './components/QuestionForm';
import QuestionPreview from './components/QuestionPreview';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { QUIZ_VALIDATION, QUIZ_TYPES } from '../../../constants/quizValidation';

const scrollbarSx = {
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  }
};

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const [quizName, setQuizName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuizType, setSelectedQuizType] = useState(QUIZ_TYPES.ABCD);
  const [isAbcd, setIsAbcd] = useState(true);
  const formRef = React.useRef(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [quizNameError, setQuizNameError] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [quizNameHelperText, setQuizNameHelperText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleAddQuestion = (question) => {
    if (!question.type) {
      question.type = isAbcd ? QUIZ_TYPES.ABCD : QUIZ_TYPES.TRUE_FALSE;
    }
    
    if (editingQuestion) {
      setQuestions(questions.map(q => {
        if (q.id === editingQuestion.id) {
          const updatedQuestion = { ...question, id: editingQuestion.id };
          return updatedQuestion;
        }
        return q;
      }));
      setEditingQuestion(null);
      if (formRef.current) {
        formRef.current.resetForm();
      }
    } else {
      const newQuestion = { ...question, id: Date.now() };
      setQuestions([...questions, newQuestion]);
    }
  };

  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleEditQuestion = (questionToEdit) => {
    setEditingQuestion(questionToEdit);
    // Set form type based on question type
    setIsAbcd(questionToEdit.answers.length === 4);
  };

  const handleMoveQuestion = (fromIndex, toIndex) => {
    const updatedQuestions = [...questions];
    const [removed] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, removed);
    setQuestions(updatedQuestions);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active && over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragStart = (event) => {
    if (!event.active) return;
  };

  const toggleQuestionType = () => {
    setIsAbcd(!isAbcd);
  };

  const handleAddQuestionClick = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const resetState = () => {
    setQuizName('');
    setQuestions([]); // Reset questions array
    setQuizNameError(false);
    setEditingQuestion(null);
    setQuizNameHelperText('');
    setSelectedQuizType(QUIZ_TYPES.ABCD); // Reset quiz type
    setIsAbcd(true); // Reset question type toggle
    if (formRef.current) {
      formRef.current.resetForm();
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizName.trim()) {
      setQuizNameError(true);
      setQuizNameHelperText("Vyplňte název kvízu");
      return;
    }

    if (questions.length === 0) {
      alert('Přidejte alespoň jednu otázku');
      return;
    }

    try {
      console.log('Creating quiz with questions:', questions);
      // Check each question for missing type
      questions.forEach((q, index) => {
        if (!q.type) {
          console.warn(`Question at index ${index} is missing type!`, q);
        }
      });

      const response = await fetch('/create_quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: quizName,
          questions: questions,
          type: selectedQuizType // Send the quiz type
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodařilo se vytvořit kvíz');
      }

      resetState(); // Call resetState before showing success message
      setOpenSnackbar(true);
      
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Chyba při vytváření kvízu: ' + error.message);
    }
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        height: '100vh',
        py: 3,
        overflow: 'hidden' // Prevent container scroll
      }}
    >
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' // Prevent box scroll
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3 
        }}>
          <Select
            value={selectedQuizType}
            onChange={(e) => setSelectedQuizType(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value={QUIZ_TYPES.ABCD}>ABCD Kvíz</MenuItem>
            <MenuItem value="other" disabled>Další typy (Připravujeme)</MenuItem>
          </Select>
          <TextField
            fullWidth
            placeholder="Název kvízu"
            value={quizName}
            onChange={(e) => {
              setQuizName(e.target.value);
              setQuizNameError(false);
              setQuizNameHelperText('');
            }}
            error={quizNameError || quizName.length > QUIZ_VALIDATION.QUIZ_NAME_MAX_LENGTH}
            helperText={
              quizNameHelperText || 
              (quizName.length > QUIZ_VALIDATION.QUIZ_NAME_MAX_LENGTH 
                ? `Název kvízu nesmí být delší než ${QUIZ_VALIDATION.QUIZ_NAME_MAX_LENGTH} znaků` 
                : '')
            }
          />
          <Button 
            variant="outlined" 
            onClick={handleBackToHome}
            color="error"
            sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}
          >
            Zpět domů
          </Button>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 3,
          flexGrow: 1,
          overflow: 'hidden', // Prevent grid scroll
          height: 'calc(100% - 80px)' // Subtract header height
        }}>
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            p: 3, 
            border: '1px solid', 
            borderColor: 'divider',
            borderRadius: 1,
            height: '100%',
            overflow: 'hidden'
          }}>
            <Button 
              variant="outlined" 
              onClick={toggleQuestionType}
              sx={{ mb: 2 }}
            >
              Přepnout na {isAbcd ? 'Pravda/Lež' : 'ABCD'}
            </Button>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                flexGrow: 1,
                overflow: 'auto',
                pr: 2,
                ...scrollbarSx
              }}>
                <QuestionForm 
                  ref={formRef}
                  onSubmit={handleAddQuestion}
                  editQuestion={editingQuestion}
                  isAbcd={isAbcd}
                />
              </Box>

              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={handleAddQuestionClick}
                >
                  {editingQuestion ? 'Aktualizovat otázku' : 'Přidat otázku'}
                </Button>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            p: 3, 
            border: '1px solid', 
            borderColor: 'divider',
            borderRadius: 1,
            height: '100%',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2 
            }}>
              <Typography variant="h6">Náhled kvízu</Typography>
              <Button variant="outlined" onClick={() => {}}>
                Přidat náhodnou otázku
              </Button>
            </Box>
            <Box sx={{ 
              flexGrow: 1,
              overflow: 'auto',
              pr: 2,
              ...scrollbarSx
            }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <QuestionPreview
                  questions={questions || []}
                  onDelete={handleDeleteQuestion}
                  onEdit={handleEditQuestion}
                  onMove={handleMoveQuestion}
                />
              </DndContext>
            </Box>
            <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button 
                variant="contained" 
                fullWidth 
                onClick={handleCreateQuiz}
                disabled={questions.length === 0}
              >
                Vytvořit kvíz
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Kvíz byl úspěšně vytvořen!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateQuizPage;
