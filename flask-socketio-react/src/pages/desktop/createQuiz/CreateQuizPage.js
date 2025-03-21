import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useBeforeUnload } from 'react-router-dom';
import { Box, TextField, Select, MenuItem, Typography, Button, Container, Snackbar, Alert } from '@mui/material';
import QuestionForm from './components/QuestionForm';
import QuestionPreview from './components/QuestionPreview';
import AddExistingQuestionDialog from './components/AddExistingQuestionDialog';
import OpenAnswerForm from './components/OpenAnswerForm';
import GuessANumberForm from './components/GuessANumberForm';
import MathQuizForm from './components/MathQuizForm';
import WordChainForm from './components/WordChainForm';  // Add this import
import DrawingForm from './components/DrawingForm'; // Add this import
import BlindMapForm from './components/BlindMapForm'; // Add this import
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
  const [isEditing, setIsEditing] = useState(location.state?.isEditing || false);
  const [quizId, setQuizId] = useState(location.state?.quizId);
  const autosaveIdentifier = location.state?.autosaveIdentifier;
  const [quizName, setQuizName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuizType, setSelectedQuizType] = useState(QUIZ_TYPES.ABCD);
  const [isAbcd, setIsAbcd] = useState(true);
  const formRef = React.useRef(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [quizNameError, setQuizNameError] = useState(false);
  const [quizNameHelperText, setQuizNameHelperText] = useState('');
  const [existingQuestionsDialogOpen, setExistingQuestionsDialogOpen] = useState(false);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [lastAutosaved, setLastAutosaved] = useState(null);
  const autosaveIntervalRef = useRef(null);
  const [autosaveId, setAutosaveId] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useBeforeUnload(
    React.useCallback((event) => {
      if (questions.length > 0) {
        event.preventDefault();
        return (event.returnValue = 'You have unsaved changes. Are you sure you want to leave?');
      }
    }, [questions])
  );

  // Update the performAutosave function to check isEditing before attempting to save
  const performAutosave = useCallback(() => {
    // Skip autosaving entirely when editing
    if (isEditing || questions.length === 0) return;
    
    const quizData = {
      name: quizName,
      questions: questions,
      quiz_type: selectedQuizType
    };
    
    const requestData = {
      quiz_data: quizData,
      is_editing: false,
      quiz_id: quizId,
      autosave_id: autosaveId
    };
    
    fetch('/unfinished_quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setLastAutosaved(new Date());
        
        if (data.autosave_id) {
          setAutosaveId(data.autosave_id);
        }
      }
    })
    .catch(error => {
      console.error('Error autosaving quiz:', error);
    });
  }, [quizName, questions, selectedQuizType, isEditing, quizId, autosaveId]);

  useEffect(() => {
    if (autosaveIntervalRef.current) {
      clearInterval(autosaveIntervalRef.current);
    }
    
    autosaveIntervalRef.current = setInterval(performAutosave, 30000);
    
    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [performAutosave]);

  useEffect(() => {
    if (questions.length > 0) {
      performAutosave();
    }
  }, [questions.length, performAutosave]);

  // Load autosaved quiz if identifier is provided
  useEffect(() => {
    if (autosaveIdentifier) {
      setAutosaveId(autosaveIdentifier);
      setDataLoaded(true);
      
      fetch(`/unfinished_quizzes/${autosaveIdentifier}`)
        .then(response => response.json())
        .then(data => {
          setQuizName(data.name);
          setSelectedQuizType(data.quiz_type || QUIZ_TYPES.ABCD);
          setIsAbcd(data.quiz_type !== QUIZ_TYPES.OPEN_ANSWER);
          
          // Check if any questions had missing media files
          const hasMissingMedia = data.questions.some(q => q.mediaFileNotFound);
          if (hasMissingMedia) {
            setSnackbar({
              open: true,
              message: "Některé otázky obsahovaly odkazy na soubory, které již neexistují. Tyto odkazy byly odstraněny.",
              severity: 'warning'
            });
          }
          
          setQuestions(data.questions || []);
          
          if (data.is_editing && data.original_quiz_id) {
            setIsEditing(true);
            setQuizId(data.original_quiz_id);
          }
        })
        .catch(error => {
          console.error('Error loading unfinished quiz:', error);
          setDataLoaded(false);
        });
    }
  }, [autosaveIdentifier]);

  // Load original quiz if editing
  useEffect(() => {
    if (isEditing && quizId) {
      if (dataLoaded) {
        return;
      }
      
      console.log("Fetching quiz data for editing:", quizId);
      
      fetch(`/quiz/${quizId}`)
        .then(response => response.json())
        .then(quiz => {
          console.log("Loaded quiz data:", quiz);
          setQuizName(quiz.name);
          
          if (quiz.type === QUIZ_TYPES.COMBINED_QUIZ) {
            setSelectedQuizType(QUIZ_TYPES.ABCD);
          } else {
            setSelectedQuizType(quiz.type);
          }
          
          // Transform the questions data to match the expected format
          const transformedQuestions = quiz.questions.map(q => {
            const baseQuestion = {
              id: q._id,
              _id: q._id,
              question: q.question || '', // Default empty string for math quiz
              type: q.type,
              length: q.length,  // Use length consistently
              category: q.category || '', // Default empty string for math quiz
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
            } else if (q.type === QUESTION_TYPES.GUESS_A_NUMBER) {
              return {
                ...baseQuestion,
                answer: q.number_answer || 0
              };
            } else if (q.type === QUESTION_TYPES.MATH_QUIZ) {
              // Handle math quiz questions
              return {
                ...baseQuestion,
                sequences: q.sequences?.map(seq => ({
                  id: Date.now() + Math.random(),
                  equation: seq.equation || '',
                  answer: seq.answer || '',
                  length: seq.length || QUIZ_VALIDATION.MATH_SEQUENCES_TIME_LIMIT.DEFAULT
                })) || []
              };
            } else if (q.type === QUESTION_TYPES.WORD_CHAIN) {
              // Add special handling for Word Chain question type
              return {
                ...baseQuestion,
                length: q.length || QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_TIME,
                rounds: q.rounds || QUIZ_VALIDATION.WORD_CHAIN.DEFAULT_ROUNDS
              };
            } else if (q.type === QUESTION_TYPES.DRAWING) {
              // Add special handling for Drawing question type
              return {
                ...baseQuestion,
                length: q.length || QUIZ_VALIDATION.DRAWING.DEFAULT_TIME,
                rounds: q.rounds || QUIZ_VALIDATION.DRAWING.DEFAULT_ROUNDS
              };
            } else if (q.type === QUESTION_TYPES.ABCD || q.type === QUESTION_TYPES.TRUE_FALSE) {
              return {
                ...baseQuestion,
                answers: q.options || q.answers || [],
                correctAnswer: q.answer
              };
            }
            
            return baseQuestion; // Fallback case
          });
          
          console.log("Transformed questions:", transformedQuestions);
          setQuestions(transformedQuestions);
          setDataLoaded(true); // Mark data as loaded after successful fetch
        })
        .catch(error => {
          console.error('Error fetching quiz:', error);
          navigate('/');
        });
    }
  }, [isEditing, quizId, navigate, dataLoaded]);

  // Update the cleanupAutosave function to use autosaveId
  const cleanupAutosave = useCallback(() => {
    if (autosaveId) {
      fetch(`/unfinished_quizzes/${autosaveId}?keep_files=true`, {
        method: 'DELETE'
      }).catch(error => {
        console.error('Error cleaning up autosave:', error);
      });
    }
  }, [autosaveId]);

  // Add a helper function to delete autosave
  const deleteAutosave = useCallback(() => {
    if (autosaveId) {
      console.log("Deleting autosave for empty quiz");
      fetch(`/unfinished_quizzes/${autosaveId}`, {
        method: 'DELETE'
      }).catch(error => {
        console.error('Error deleting autosave:', error);
      });
      setAutosaveId(null); // Reset autosave ID after deleting
      setLastAutosaved(null); // Reset last autosaved timestamp
    }
  }, [autosaveId]);

  const handleAddQuestion = async (question) => {
    // Explicitly check and delete old media URL if present and a new file is being uploaded
    if (question.oldMediaUrl && question.mediaFile) {
      console.log("Deleting old media file:", question.oldMediaUrl);
      try {
        const deleteResponse = await fetch('/delete_media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: question.oldMediaUrl })
        });
        
        if (!deleteResponse.ok) {
          console.error('Failed to delete old media file');
        } else {
          console.log('Successfully deleted old media file');
        }
      } catch (error) {
        console.error('Error deleting old media:', error);
      }
    }

    // If there's a media file, upload it first
    if (question.mediaFile) {
      setIsUploading(true);
      
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', question.mediaFile);
        
        const response = await fetch('/upload_media', {
          method: 'POST',
          body: uploadFormData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        
        // Update question with the uploaded file URL
        question.mediaUrl = data.url;
      } catch (error) {
        console.error('Error uploading file:', error);
        setSnackbar({
          open: true,
          message: `Chyba při nahrávání souboru: ${error.message}`,
          severity: 'error'
        });
        setIsUploading(false);
        return; // Don't proceed with adding the question if upload fails
      }
      
      setIsUploading(false);
    }
    
    // Now continue with the original logic to add the question
    if (selectedQuizType === QUIZ_TYPES.OPEN_ANSWER) {
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.OPEN_ANSWER,
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
        // No need to include mediaFile in the saved question
        fileName: question.fileName,
        answer: question.answer,
        mediaType: question.mediaType,
        mediaUrl: question.mediaUrl,
        showImageGradually: question.showImageGradually
      };

      // Remove the mediaFile property which is not needed anymore
      delete newQuestion.mediaFile;

      if (editingQuestion) {
        setQuestions(questions.map(q => q.id === editingQuestion.id ? newQuestion : q));
      } else {
        setQuestions([...questions, newQuestion]);
      }
      
      setEditingQuestion(null);
      if (formRef.current) {
        formRef.current.resetForm();
      }
    } else if (selectedQuizType === QUIZ_TYPES.GUESS_A_NUMBER) {
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.GUESS_A_NUMBER,
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
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
    } else if (selectedQuizType === QUIZ_TYPES.MATH_QUIZ) {
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.MATH_QUIZ,
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
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
    } else if (selectedQuizType === QUIZ_TYPES.WORD_CHAIN) {
      // Add handler for Word Chain
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.WORD_CHAIN,
        length: question.length, 
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
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
    } else if (selectedQuizType === QUIZ_TYPES.DRAWING) {
      // Add handler for Drawing
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.DRAWING,
        length: question.length, 
        rounds: question.rounds,
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
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
    } else if (selectedQuizType === QUIZ_TYPES.BLIND_MAP) {
      const newQuestion = {
        ...question,
        id: editingQuestion ? editingQuestion.id : Date.now(),
        _id: editingQuestion ? editingQuestion._id : undefined,
        type: QUIZ_TYPES.BLIND_MAP,
        modified: editingQuestion ? true : false,
        copy_of: editingQuestion && editingQuestion.modified ? null : editingQuestion?.copy_of || null,
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
      if (!question.type) {
        question.type = isAbcd ? QUESTION_TYPES.ABCD : QUESTION_TYPES.TRUE_FALSE;
      }
      
      if (editingQuestion) {
        setQuestions(questions.map(q => {
          if (q.id === editingQuestion.id) {
            return { 
              ...question, 
              id: editingQuestion.id,
              _id: editingQuestion._id,
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

  const handleDeleteQuestion = async (id) => {
    const questionToDelete = questions.find(q => q.id === id);
    
    // If question has media URL, delete it from Cloudinary first
    if (!isEditing && questionToDelete && questionToDelete.mediaUrl) {
      try {
        const response = await fetch('/delete_media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: questionToDelete.mediaUrl })
        });
        
        if (!response.ok) {
          console.error('Failed to delete media file');
        }
      } catch (error) {
        console.error('Error deleting media file:', error);
      }
    }

    // Check if this is the last question
    const isLastQuestion = questions.length === 1;

    // Update questions state
    setQuestions(questions.filter(q => q.id !== id));
    
    // If this was the last question, delete the autosave
    if (isLastQuestion && autosaveId && !isEditing) {
      deleteAutosave();
    }
    
    // Handle deleted question IDs for backend
    if (questionToDelete && questionToDelete._id) {
      setDeletedQuestionIds(prev => {
        const newSet = new Set(prev);
        newSet.add(questionToDelete._id);
        return newSet;
      });
    }
  };

  const handleEditQuestion = (questionToEdit) => {
    if (questionToEdit.type === QUIZ_TYPES.OPEN_ANSWER) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.OPEN_ANSWER);
    } else if (questionToEdit.type === QUIZ_TYPES.GUESS_A_NUMBER) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.GUESS_A_NUMBER);
    } else if (questionToEdit.type === QUIZ_TYPES.MATH_QUIZ) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.MATH_QUIZ);
    } else if (questionToEdit.type === QUIZ_TYPES.WORD_CHAIN) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.WORD_CHAIN);
    } else if (questionToEdit.type === QUIZ_TYPES.DRAWING) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.DRAWING);
    } else if (questionToEdit.type === QUIZ_TYPES.BLIND_MAP) {
      setEditingQuestion(questionToEdit);
      setSelectedQuizType(QUIZ_TYPES.BLIND_MAP);
    } else {
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

  // Update the back-to-home handler to skip autosave when editing
  const handleBackToHome = () => {
    // Existing logic
    if (questions.length > 0 && !isEditing) {
      if (window.confirm('Chcete odejít? Vaše rozdělaná práce bude uložena pro pozdější dokončení.')) {
        performAutosave();
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  // Reset autosaveId when creating a new quiz or quiz is saved
  const resetState = () => {
    setQuizName('');
    setQuestions([]);
    setQuizNameError(false);
    setEditingQuestion(null);
    setQuizNameHelperText('');
    setSelectedQuizType(QUIZ_TYPES.ABCD);
    setIsAbcd(true);
    setAutosaveId(null); // Reset the autosave ID
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

    // Add validation for standalone Word Chain quiz
    const allWordChain = questions.every(q => q.type === "WORD_CHAIN");
    if (allWordChain && questions.length === 1) {
      setSnackbar({
        open: true,
        message: 'Slovní řetěz nemůže být samostatný kvíz. Přidejte otázky jiného typu a vytvořte kombinovaný kvíz.',
        severity: 'error'
      });
      return;
    }

    // Add validation for standalone Drawing quiz
    const allDrawing = questions.every(q => q.type === "DRAWING");
    if (allDrawing && questions.length === 1) {
      setSnackbar({
        open: true,
        message: 'Kreslení nemůže být samostatný kvíz. Přidejte otázky jiného typu a vytvořte kombinovaný kvíz.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // No need to upload files again - just clean up the questions data
      const cleanedQuestions = questions.map(question => {
        // Remove any file references since we're using URLs now
        const { mediaFile, ...cleanQuestion } = question;
        return cleanQuestion;
      });

      let finalQuizType = selectedQuizType;
      
      const activeQuestions = questions.filter(q => 
        !(q._id && deletedQuestionIds.has(q._id))
      );
      
      if (activeQuestions.length > 0) {
        const uniqueQuestionTypes = new Set(activeQuestions.map(q => q.type).filter(Boolean));
        
        if (uniqueQuestionTypes.size === 2 && 
            uniqueQuestionTypes.has(QUESTION_TYPES.ABCD) && 
            uniqueQuestionTypes.has(QUESTION_TYPES.TRUE_FALSE)) {
              finalQuizType = QUIZ_TYPES.ABCD;
        } else if (uniqueQuestionTypes.size > 1) {
          finalQuizType = QUIZ_TYPES.COMBINED_QUIZ;
        } else {
          const firstType = Array.from(uniqueQuestionTypes)[0];
          if (firstType === QUESTION_TYPES.TRUE_FALSE) {
            finalQuizType = QUIZ_TYPES.ABCD;
          } else {
            finalQuizType = firstType;
          }
        }
      }

      const endpoint = isEditing ? `/quiz/${quizId}/update` : '/create_quiz';
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: quizName,
          questions: cleanedQuestions,
          type: finalQuizType,
          deletedQuestions: Array.from(deletedQuestionIds)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodařilo se vytvořit kvíz');
      }

      cleanupAutosave();
      
      resetState();
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
      const baseQuestion = {
        question: question.text || question.question || '',
        type: question.type,
        timeLimit: question.length || question.timeLimit,
        category: question.category,
        id: Date.now() + Math.random(),
        copy_of: question.copy_of || question.id,
        is_copy: true
      };
      
      if (question.type === QUESTION_TYPES.OPEN_ANSWER) {
        return {
          ...baseQuestion,
          answer: question.answer || question.open_answer || '',
          mediaType: question.mediaType || question.media_type,
          mediaUrl: question.mediaUrl || question.media_url,
          showImageGradually: question.showImageGradually || question.show_image_gradually || false,
          fileName: question.fileName || (question.mediaUrl ? question.mediaUrl.split('/').pop() : '')
        };
      } else if (question.type === QUESTION_TYPES.GUESS_A_NUMBER) {
        return {
          ...baseQuestion,
          answer: question.number_answer || question.answer || 0,
        };
      } else if (question.type === QUESTION_TYPES.MATH_QUIZ) {
        // Special handling for math quiz questions
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
        return {
          ...baseQuestion,
          answers: question.answers.map(a => a.text),
          correctAnswer: question.answers.findIndex(a => a.isCorrect)
        };
      }
      
      return baseQuestion; // Fallback case
    }).filter(q => q); // Filter out any undefined values
    
    setQuestions([...questions, ...newQuestions]);
  };

  // Add this function near other helper functions to check if Word Chain already exists
  const hasWordChainQuestion = (questions) => {
    return questions.some(q => q.type === QUIZ_TYPES.WORD_CHAIN);
  };

  // Add this function near other helper functions to check if Drawing question already exists
  const hasDrawingQuestion = (questions) => {
    return questions.some(q => q.type === QUIZ_TYPES.DRAWING);
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        height: '100vh',
        py: 3,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3,
          alignItems: 'center'
        }}>
          <Typography sx={{ 
            whiteSpace: 'nowrap',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'primary.main'
          }}>
            Vyberte typ otázky:
          </Typography>
          <Select
            value={selectedQuizType}
            onChange={(e) => setSelectedQuizType(e.target.value)}
            sx={{ minWidth: 200 }}
            disabled={!!editingQuestion} // Disable when editing a question
          >
            <MenuItem value={QUIZ_TYPES.ABCD}>ABCD, Pravda/lež</MenuItem>
            <MenuItem value={QUIZ_TYPES.OPEN_ANSWER}>Otevřená odpověď</MenuItem>
            <MenuItem value={QUIZ_TYPES.GUESS_A_NUMBER}>Hádej číslo</MenuItem>
            <MenuItem value={QUIZ_TYPES.MATH_QUIZ}>Matematické rovnice</MenuItem>
            <MenuItem value={QUIZ_TYPES.WORD_CHAIN}>Slovní řetěz</MenuItem>
            <MenuItem value={QUIZ_TYPES.DRAWING}>Kreslení</MenuItem>
            <MenuItem value={QUIZ_TYPES.BLIND_MAP}>Slepá mapa</MenuItem>
            <MenuItem value="other" disabled>Další typy (Připravujeme)</MenuItem>
          </Select>
          <TextField
            fullWidth
            label="Název kvízu"
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
            sx={{
              '& .MuiInputLabel-shrink': {
                transform: 'translate(14px, -4px) scale(0.75)',
              }
            }}
          />
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 2
            }}>
              {lastAutosaved && !isEditing && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Automaticky uloženo
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    v {lastAutosaved.toLocaleTimeString()}
                  </Typography>
                </Box>
              )}
              <Button 
                variant="outlined" 
                onClick={handleBackToHome}
                color="error"
                sx={{ 
                  whiteSpace: 'nowrap', 
                  minWidth: '150px',
                  height: '56px'
                }}
              >
                Zpět domů
              </Button>
            </Box>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 3,
          flexGrow: 1,
          overflow: 'hidden',
          height: 'calc(100% - 80px)'
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
                ) : selectedQuizType === QUIZ_TYPES.OPEN_ANSWER ? (
                  <OpenAnswerForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                ) : selectedQuizType === QUIZ_TYPES.GUESS_A_NUMBER ? (
                  <GuessANumberForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                ) : selectedQuizType === QUIZ_TYPES.MATH_QUIZ ? (
                  <MathQuizForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                ) : selectedQuizType === QUIZ_TYPES.WORD_CHAIN ? (
                  <WordChainForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                ) : selectedQuizType === QUIZ_TYPES.DRAWING ? (
                  <DrawingForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                ) : selectedQuizType === QUIZ_TYPES.BLIND_MAP ? (
                  <BlindMapForm
                    ref={formRef}
                    onSubmit={handleAddQuestion}
                    editQuestion={editingQuestion}
                  />
                ) : null}
              </Box>

              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={handleAddQuestionClick}
                  // Use direct ref check to see if file is uploading, and disable if already have Word Chain
                  disabled={isUploading || loading || 
                    ((selectedQuizType === QUIZ_TYPES.WORD_CHAIN && hasWordChainQuestion(questions) && !editingQuestion) ||
                     (selectedQuizType === QUIZ_TYPES.DRAWING && hasDrawingQuestion(questions) && !editingQuestion))}
                >
                  {isUploading 
                    ? 'Nahrávání souboru...' 
                    : (selectedQuizType === QUIZ_TYPES.WORD_CHAIN && hasWordChainQuestion(questions) && !editingQuestion)
                      ? 'Pouze jeden Slovní řetěz na kvíz'
                      : (selectedQuizType === QUIZ_TYPES.DRAWING && hasDrawingQuestion(questions) && !editingQuestion)
                        ? 'Pouze jedno Kreslení na kvíz'
                        : (editingQuestion ? 'Aktualizovat otázku' : 'Přidat otázku')}
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
