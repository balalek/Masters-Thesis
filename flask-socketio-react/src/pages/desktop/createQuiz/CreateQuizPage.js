import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, TextField, Select, MenuItem, Typography, Button, Container, Snackbar, Alert } from '@mui/material';
import QuestionForm from './components/QuestionForm';
import QuestionPreview from './components/QuestionPreview';
import AddExistingQuestionDialog from './components/AddExistingQuestionDialog';
import OpenAnswerForm from './components/OpenAnswerForm';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { QUIZ_VALIDATION, QUIZ_TYPES, QUESTION_TYPES } from '../../../constants/quizValidation';
import { scrollbarStyle } from '../../../utils/scrollbarStyle';

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = location.state?.isEditing || false;
  const quizId = location.state?.quizId;
  const [quizName, setQuizName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuizType, setSelectedQuizType] = useState(QUIZ_TYPES.ABCD);
  const [isAbcd, setIsAbcd] = useState(true);
  const formRef = React.useRef(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [quizNameError, setQuizNameError] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [quizNameHelperText, setQuizNameHelperText] = useState('');
  const [existingQuestionsDialogOpen, setExistingQuestionsDialogOpen] = useState(false);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    console.log('isEditing:', isEditing);  // Debug log
    console.log('quizId:', quizId);        // Debug log
    console.log('location.state:', location.state);  // Debug log

    if (isEditing && quizId) {
      console.log('Fetching quiz data for id:', quizId);  // Debug log
      fetch(`/quiz/${quizId}`)
        .then(response => {
          console.log('Response received:', response);  // Debug log
          return response.json();
        })
        .then(quiz => {
          console.log('Quiz data received:', quiz);  // Debug log
          setQuizName(quiz.name);
          
          // Handle COMBINED_QUIZ type by defaulting to ABCD
          if (quiz.type === QUIZ_TYPES.COMBINED_QUIZ) {
            setSelectedQuizType(QUIZ_TYPES.ABCD);
            console.log('Combined quiz detected, defaulting to ABCD type');
          } else {
            setSelectedQuizType(quiz.type);
          }
          
          // Transform the questions data to match the expected format
          const transformedQuestions = quiz.questions.map(q => {
            const baseQuestion = {
              id: q._id,
              _id: q._id,
              question: q.question,
              type: q.type,
              timeLimit: q.length,
              category: q.category,
              copy_of: q.copy_of,
              modified: false
            };
            
            // Handle different question types
            if (q.type === QUESTION_TYPES.OPEN_ANSWER) {
              return {
                ...baseQuestion,
                answer: q.open_answer || '',
                mediaType: q.media_type || null,
                mediaUrl: q.media_url || null,
                showImageGradually: q.show_image_gradually || false,
                fileName: q.media_url ? q.media_url.split('/').pop() : ''
              };
            } else if (q.type === QUESTION_TYPES.ABCD || q.type === QUESTION_TYPES.TRUE_FALSE) {
              return {
                ...baseQuestion,
                answers: q.options || q.answers || [],
                correctAnswer: q.answer
              };
            }
          });
          
          setQuestions(transformedQuestions);
        })
        .catch(error => {
          console.error('Error fetching quiz:', error);
          navigate('/');
        });
    }
  }, [isEditing, quizId, navigate]);

  const handleAddQuestion = (question) => {
    if (selectedQuizType === QUIZ_TYPES.OPEN_ANSWER) {
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.OPEN_ANSWER,
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
        // Include fileName with the question data
        fileName: question.fileName,
        answer: question.answer,
        mediaType: question.mediaType,
        mediaUrl: question.mediaUrl,
        showImageGradually: question.showImageGradually
      };

      if (editingQuestion) {
        setQuestions(questions.map(q => q.id === editingQuestion.id ? newQuestion : q));
      } else {
        setQuestions([...questions, newQuestion]);
      }
      
      setEditingQuestion(null);
      if (formRef.current) {
        formRef.current.resetForm();
      }
    } else {
      // Original ABCD/True-False handling
      if (!question.type) {
        question.type = isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE;
      }
      
      if (editingQuestion) {
        setQuestions(questions.map(q => {
          if (q.id === editingQuestion.id) {
            return { 
              ...question, 
              id: editingQuestion.id,
              _id: editingQuestion._id, // Preserve _id
              modified: true,
              copy_of: editingQuestion.modified ? null : editingQuestion.copy_of || null
            };
          }
          return q;
        }));
        setEditingQuestion(null);
        if (formRef.current) {
          formRef.current.resetForm();
        }
      } else {
        const newQuestion = { 
          ...question, 
          id: Date.now(),
          copy_of: null,
          modified: false
        };
        setQuestions([...questions, newQuestion]);
      }
    }
  };

  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
    // If question has _id (exists in MongoDB), add to deleted set
    const questionToDelete = questions.find(q => q.id === id);
    if (questionToDelete && questionToDelete._id) {
      setDeletedQuestionIds(prev => {
        const newSet = new Set(prev);
        newSet.add(questionToDelete._id);
        return newSet;
      });
    }
    console.log('Deleted question IDs:', Array.from(deletedQuestionIds)); // Debug log
  };

  const handleEditQuestion = (questionToEdit) => {
    // For open answer questions, we simply set the question directly like we do for ABCD
    if (questionToEdit.type === QUIZ_TYPES.OPEN_ANSWER) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.OPEN_ANSWER);
    } else {
      // For ABCD/True-False questions
      setEditingQuestion(questionToEdit);
      setIsAbcd(questionToEdit.type === QUESTION_TYPES.ABCD);
      setSelectedQuizType(QUIZ_TYPES.ABCD);
    }
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

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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
      setLoading(true);
      const hasMediaFiles = questions.some(q => q.mediaFile);
      
      if (hasMediaFiles) {
        setSnackbar({
          open: true,
          message: "Nahrávání souborů, prosím čekejte...",
          severity: "info"
        });
      }

      // Upload all media files first
      const updatedQuestions = await Promise.all(questions.map(async (question) => {
        if (question.mediaFile) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', question.mediaFile);

          const response = await fetch('/upload_media', {
            method: 'POST',
            body: uploadFormData
          });

          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();

          return {
            ...question,
            mediaUrl: data.url,
            mediaFile: undefined // Remove the file before sending to backend
          };
        }
        return question;
      }));

      // Simple and future-proof quiz type logic
      let finalQuizType = selectedQuizType;
      
      const activeQuestions = questions.filter(q => 
        // If question has an _id, check that it's not in the deleted set
        !(q._id && deletedQuestionIds.has(q._id))
      );
      
      console.log('Active questions:', activeQuestions); // Debug log
      console.log('Deleted question IDs:', Array.from(deletedQuestionIds)); // Debug log
      
      if (activeQuestions.length > 0) {
        // Get all unique question types
        const uniqueQuestionTypes = new Set(activeQuestions.map(q => q.type).filter(Boolean));
        console.log('Unique question types:', Array.from(uniqueQuestionTypes)); // Debug log
        
        // If have size 2, check if its abcd and true/false, then set to ABCD
        if (uniqueQuestionTypes.size === 2 && 
            uniqueQuestionTypes.has(QUESTION_TYPES.ABCD) && 
            uniqueQuestionTypes.has(QUESTION_TYPES.TRUE_FALSE)) {
              finalQuizType = QUIZ_TYPES.ABCD;
        }

        // If we have more than one type, it's a combined quiz
        else if (uniqueQuestionTypes.size > 1) {
          finalQuizType = QUIZ_TYPES.COMBINED_QUIZ;
        }
        else {
          // Get the first type, but if it's true/false, set to ABCD
          const firstType = Array.from(uniqueQuestionTypes)[0];
          if (firstType === QUESTION_TYPES.TRUE_FALSE) {
            finalQuizType = QUIZ_TYPES.ABCD;
          } else {
            finalQuizType = firstType;
          }
        }
      }

      console.log('Final quiz type:', finalQuizType); // Debug log

      const endpoint = isEditing ? `/quiz/${quizId}/update` : '/create_quiz';
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: quizName,
          questions: updatedQuestions,
          type: finalQuizType,
          deletedQuestions: Array.from(deletedQuestionIds) // Add deleted questions
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodařilo se vytvořit kvíz');
      }

      resetState(); // Call resetState before showing success message
      setOpenSnackbar(true);
      navigate('/');
      
    } catch (error) {
      console.error('Error creating/updating quiz:', error);
      setSnackbar({
        open: true,
        message: `Chyba při vytváření/úpravě kvízu: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExistingQuestions = (selectedQuestions) => {
    const newQuestions = selectedQuestions.map(question => {
      // Base question object with common properties
      const baseQuestion = {
        question: question.text,
        type: question.type,
        timeLimit: question.length,
        category: question.category,
        id: Date.now() + Math.random(),
        // Use copy_of if it exists, otherwise use the question's id
        copy_of: question.copy_of || question.id,
        is_copy: true
      };
      
      // Handle different question types
      if (question.type === QUESTION_TYPES.OPEN_ANSWER) {
        // For open answer questions
        return {
          ...baseQuestion,
          answer: question.answer || question.open_answer || '',
          mediaType: question.mediaType || question.media_type,
          mediaUrl: question.mediaUrl || question.media_url,
          showImageGradually: question.showImageGradually || question.show_image_gradually || false,
          fileName: question.fileName || (question.mediaUrl ? question.mediaUrl.split('/').pop() : '')
        };
      } else if (question.type === QUESTION_TYPES.ABCD || question.type === QUESTION_TYPES.TRUE_FALSE) {
        // For ABCD/True-False questions
        return {
          ...baseQuestion,
          answers: question.answers.map(a => a.text),
          correctAnswer: question.answers.findIndex(a => a.isCorrect)
        };
      }
    });
    
    setQuestions([...questions, ...newQuestions]);
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
            <MenuItem value={QUIZ_TYPES.OPEN_ANSWER}>Otevřené odpovědi</MenuItem>
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
            {selectedQuizType === QUIZ_TYPES.ABCD && (
              <Button 
                variant="outlined" 
                onClick={toggleQuestionType}
                sx={{ mb: 2 }}
              >
                Přepnout na {isAbcd ? 'Pravda/Lež' : 'ABCD'}
              </Button>
            )}

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
                ...scrollbarStyle
              }}>
                {selectedQuizType === QUIZ_TYPES.ABCD ? (
                  <QuestionForm 
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                    isAbcd={isAbcd}
                  />
                ) : (
                  <OpenAnswerForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                )}
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
              <Button 
                variant="outlined" 
                onClick={() => setExistingQuestionsDialogOpen(true)}
              >
                Přidat existující otázku
              </Button>
            </Box>
            <Box sx={{ 
              flexGrow: 1,
              overflow: 'auto',
              pr: 2,
              ...scrollbarStyle
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
                disabled={questions.length === 0 || loading}
              >
                {loading ? 'Zpracování...' : isEditing ? 'Aktualizovat kvíz' : 'Vytvořit kvíz'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      <AddExistingQuestionDialog 
        open={existingQuestionsDialogOpen}
        onClose={() => setExistingQuestionsDialogOpen(false)}
        onAddQuestions={handleAddExistingQuestions}
      />
    </Container>
  );
};

export default CreateQuizPage;
