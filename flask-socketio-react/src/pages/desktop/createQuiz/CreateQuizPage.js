import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Select, MenuItem, Typography, Button, Container } from '@mui/material';
import QuestionForm from './components/QuestionForm';
import QuestionPreview from './components/QuestionPreview';

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
  const [selectedQuizType, setSelectedQuizType] = useState('abcd');
  const [isAbcd, setIsAbcd] = useState(true);
  const formRef = React.useRef(null);

  const handleAddQuestion = (question) => {
    setQuestions([...questions, { ...question, id: Date.now() }]);
  };

  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleEditQuestion = (id, updatedQuestion) => {
    setQuestions(questions.map(q => q.id === id ? { ...updatedQuestion, id } : q));
  };

  const handleMoveQuestion = (fromIndex, toIndex) => {
    const updatedQuestions = [...questions];
    const [removed] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, removed);
    setQuestions(updatedQuestions);
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
            <MenuItem value="abcd">ABCD Kvíz</MenuItem>
            <MenuItem value="other" disabled>Další typy (Připravujeme)</MenuItem>
          </Select>
          <TextField
            fullWidth
            placeholder="Název kvízu"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
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
              sx={{ mb: 2, }}
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
                  isAbcd={isAbcd}
                />
              </Box>

              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={handleAddQuestionClick}
                >
                  Přidat otázku
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
              <QuestionPreview
                questions={questions}
                onDelete={handleDeleteQuestion}
                onEdit={handleEditQuestion}
                onMove={handleMoveQuestion}
              />
            </Box>
            <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button 
                variant="contained" 
                fullWidth 
                onClick={() => {}}
              >
                Vytvořit kvíz
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default CreateQuizPage;
