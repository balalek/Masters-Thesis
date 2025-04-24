import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, TextField, IconButton, ToggleButton, ToggleButtonGroup, Checkbox, FormControlLabel, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Snackbar, Alert, Paper, Divider, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QuizIcon from '@mui/icons-material/Abc';
import MapIcon from '@mui/icons-material/Map';
import DrawIcon from '@mui/icons-material/Draw';
import LinkIcon from '@mui/icons-material/Link';
import CalculateIcon from '@mui/icons-material/Calculate';
import Filter1Icon from '@mui/icons-material/Filter1';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import QuestionAnswerIcon from '@mui/icons-material/EditNote';
import SearchIcon from '@mui/icons-material/Search';
import QuizListItem from './QuizListItem';
import QuickPlayModal from '../../../components/desktop/miscellaneous/QuickPlayModal';
import { QUIZ_TYPES, QUIZ_TYPE_TRANSLATIONS } from '../../../constants/quizValidation';

const QuizTypeButton = ({ icon: Icon, label, value, selected, onChange }) => (
  <ToggleButton 
    value={value}
    selected={selected}
    onChange={onChange}
    sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      height: '140px',
      width: '100%',
      border: '1px solid rgba(255, 255, 255, 0.12)', // Make border visible
      '&.Mui-selected': {
        backgroundColor: 'primary.dark',
        '&:hover': {
          backgroundColor: 'primary.dark', // Keep the same color on hover when selected
        }
      }
    }}
  >
    <Box sx={{ 
      height: '60px', // Fixed height for icon container
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mb: 1.75
    }}>
      <Icon sx={{ fontSize: 40 }} />
    </Box>
    <Box sx={{ 
      flex: 1,
      display: 'flex',
      alignItems: 'flex-start', // Align text to top of remaining space
      justifyContent: 'center'
    }}>
      <Typography 
        variant="body2" 
        sx={{ 
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%'
        }}
      >
        {label}
      </Typography>
    </Box>
  </ToggleButton>
);

const DesktopHomePage = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [hideAudioQuizzes, setHideAudioQuizzes] = useState(false); // Changed name and default to false
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuizToCopy, setSelectedQuizToCopy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [unfinishedQuizzes, setUnfinishedQuizzes] = useState([]);
  const [quickPlayModalOpen, setQuickPlayModalOpen] = useState(false);

  const quizTypeIcons = {
    [QUIZ_TYPES.ABCD]: { icon: QuizIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.ABCD] },
    [QUIZ_TYPES.OPEN_ANSWER]: { icon: QuestionAnswerIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.OPEN_ANSWER] },
    [QUIZ_TYPES.BLIND_MAP]: { icon: MapIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.BLIND_MAP] },
    [QUIZ_TYPES.DRAWING]: { icon: DrawIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.DRAWING] },
    [QUIZ_TYPES.WORD_CHAIN]: { icon: LinkIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.WORD_CHAIN] },
    [QUIZ_TYPES.MATH_QUIZ]: { icon: CalculateIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.MATH_QUIZ] },
    [QUIZ_TYPES.GUESS_A_NUMBER]: { icon: Filter1Icon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.GUESS_A_NUMBER] },
    [QUIZ_TYPES.COMBINED_QUIZ]: { icon: ShuffleIcon, label: QUIZ_TYPE_TRANSLATIONS[QUIZ_TYPES.COMBINED_QUIZ] },
  };

  const fetchQuizzes = async (newPage = 1, newSearch = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: newPage,
        per_page: 20,
        filter: activeTab === 0 ? 'mine' : 'public',
        search: newSearch,
        type: selectedType === 'all' ? 'all' : selectedType
      });

      const response = await fetch(`/quizzes?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const newQuizzes = data.quizzes;
      setTotalQuizzes(data.total);
      setHasMore(data.hasMore);

      if (newPage === 1) {
        activeTab === 0 ? setQuizzes(newQuizzes) : setPublicQuizzes(newQuizzes);
      } else {
        activeTab === 0 
          ? setQuizzes(prev => [...prev, ...newQuizzes])
          : setPublicQuizzes(prev => [...prev, ...newQuizzes]);
      }
      setPage(newPage);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchQuizzes(1);
    
    // Fetch unfinished quizzes when the page loads
    fetchUnfinishedQuizzes();
  }, [activeTab, selectedType]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setPage(1);
      fetchQuizzes(1, searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchQuizzes(page + 1);
    }
  };

  const handleEditPublicQuiz = (quiz) => {
    setSelectedQuizToCopy(quiz);
    setOpenDialog(true);
  };

  const handleCreateCopy = async () => {
    try {
      const response = await fetch(`/quiz/${selectedQuizToCopy._id}/copy`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setOpenDialog(false);
      setSnackbar({
        open: true,
        message: "Kvíz byl úspěšně zkopírován",
        severity: 'success'
      });

      // Navigate to edit page with the new quiz ID
      navigate('/create-quiz', {
        state: {
          isEditing: true,
          quizId: data.quizId
        }
      });
      
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Nastala chyba při kopírování kvízu',
        severity: 'error'
      });
    }
  };

  const handleToggleShare = async (quiz) => {
    try {
      const response = await fetch(`/quiz/${quiz._id}/toggle-share`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      // Update quiz in state
      setQuizzes(prev => 
        prev.map(q => 
          q._id === quiz._id 
            ? { ...q, is_public: data.is_public }
            : q
        )
      );
      
      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Nastala chyba při sdílení kvízu',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleEditQuiz = (quiz) => {
    console.log('Editing quiz:', quiz);  // Debug log
    console.log('Quiz ID:', quiz._id);   // Debug log
    
    navigate('/create-quiz', { 
      state: { 
        isEditing: true,
        quizId: quiz._id
      }
    });
  };

  const handleDeleteQuiz = async (quiz) => {
    if (!window.confirm('Opravdu chcete smazat tento kvíz?')) {
      return;
    }

    try {
      const response = await fetch(`/quiz/${quiz._id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      // Update local state to remove the quiz
      setQuizzes(prev => prev.filter(q => q._id !== quiz._id));
      
      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Nastala chyba při mazání kvízu',
        severity: 'error'
      });
    }
  };

  // Filter quizzes based on audio preference
  const filteredQuizzes = (activeTab === 0 ? quizzes : publicQuizzes).filter(quiz => {
    // If hideAudioQuizzes is true and quiz has audio content, filter it out
    if (hideAudioQuizzes && quiz.has_audio) {
      return false;
    }
    return true;
  });

  // Add this function to fetch unfinished quizzes
  const fetchUnfinishedQuizzes = async () => {
    try {
      const response = await fetch('/unfinished_quizzes');
      if (!response.ok) throw new Error('Failed to fetch unfinished quizzes');
      
      const data = await response.json();
      setUnfinishedQuizzes(data.unfinished_quizzes || []);
    } catch (error) {
      console.error('Error fetching unfinished quizzes:', error);
    }
  };
  
  // Add function to continue editing an unfinished quiz
  const continueUnfinishedQuiz = (unfinishedQuiz) => {
    navigate('/create-quiz', { 
      state: { 
        autosaveIdentifier: unfinishedQuiz.identifier,
        isEditing: unfinishedQuiz.is_editing,
        quizId: unfinishedQuiz.original_quiz_id
      }
    });
  };
  
  // Add function to delete an unfinished quiz
  const deleteUnfinishedQuiz = async (identifier) => {
    if (!window.confirm('Opravdu chcete odstranit tento rozdělaný kvíz?')) {
      return;
    }
    
    try {
      const response = await fetch(`/unfinished_quizzes/${identifier}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete unfinished quiz');
      
      // Refresh the list
      fetchUnfinishedQuizzes();
      
      setSnackbar({
        open: true,
        message: 'Rozdělaný kvíz byl úspěšně odstraněn',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Nastala chyba při mazání rozdělaného kvízu',
        severity: 'error'
      });
    }
  };

  const handleQuickPlayClick = () => {
    setQuickPlayModalOpen(true);
  };

  const handleStartQuickPlay = (config) => {
    try {
      // Activate quiz to allow players to join
      fetch(`/activate_quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(() => {
        // Navigate to room page with quick play configuration
        navigate('/room', { 
          state: { 
            quickPlayConfig: config
          }
        });
      });
    } catch (error) {
      console.error('Error starting quick play game:', error);
      setSnackbar({
        open: true,
        message: 'Nastala chyba při spouštění rychlé hry',
        severity: 'error'
      });
    }
    
    // Close the modal
    setQuickPlayModalOpen(false);
  };

  return (
    <Box>
      {/* Header/Navigation Bar */}
      <Box 
        sx={{ 
          p: 2,
          pr: 4,
          pl: 4, 
          mb: 4, 
          backgroundColor: '#212121', // Dark grey that's slightly lighter than typical dark theme background
          color: '#fff',
          borderBottom: '1px solid #212121', // Subtle border for separation
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 'bold',
            letterSpacing: 1
          }}
        >
          Domácí kvíz
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-quiz')}
          sx={{ 
            backgroundColor: 'primary.light',
            '&:hover': {
              backgroundColor: 'primary.dark'
            }
          }}
        >
          Vytvořit kvíz
        </Button>
      </Box>

      {/* Main Content */}
      <Box sx={{ pr: 4, pl: 4 }}>
        {/* Quiz Types */}
        <Typography variant="h5" sx={{ mb: 2, textAlign: 'left' }}>Typy kvízů</Typography>
        <ToggleButtonGroup
          value={selectedType}
          exclusive
          onChange={(e, value) => setSelectedType(value || 'all')}
          sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)', // Always 8 columns
            gap: 2,
            mb: 4,
            width: '100%',
            '& .MuiToggleButton-root': {
              borderRadius: 1,
              borderColor: 'primary.dark',
            }
          }}
        >
          {Object.entries(quizTypeIcons).map(([type, { icon, label }]) => (
            <QuizTypeButton
              key={type}
              value={type}
              icon={icon}
              label={label}
              selected={selectedType === type}
            />
          ))}
        </ToggleButtonGroup>

        {/* Tabs and Search */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Moje kvízy" />
            <Tab label="Veřejné kvízy" />
            <Tab label="Rozdělané kvízy" />  {/* Add this new Tab */}
          </Tabs>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          gap: 2 
        }}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={hideAudioQuizzes}
                onChange={(e) => setHideAudioQuizzes(e.target.checked)}
              />
            }
            label="Nezobrazovat audio otázky" // Updated label
            sx={{ mr: 2 }}
          />
          <TextField
            size="small"
            placeholder="Hledat kvíz..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }
            }}
            fullWidth
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={handleQuickPlayClick}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Rychlá hra
          </Button>
        </Box>

        {/* Add notice when WORD_CHAIN type is selected */}
        {(selectedType === QUIZ_TYPES.WORD_CHAIN || selectedType === QUIZ_TYPES.DRAWING) && (
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              mb: 4, 
              mt: 2, 
              borderRadius: 2, 
              backgroundColor: 'info.lighter',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Box sx={{ ml: 1, width: '100%' }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                {selectedType === QUIZ_TYPES.WORD_CHAIN 
                  ? "Informace o Slovním řetězu" 
                  : "Informace o kreslení"}
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
                Tento typ kvízu lze spustit pouze v rámci rychlé hry, nebo může být součástí kombinovaného kvízu.
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Show different content based on selected tab */}
        {activeTab === 2 ? (
          // Unfinished quizzes tab content - now using QuizListItem
          <Box sx={{ mt: 2 }}>
            {unfinishedQuizzes.length > 0 ? (
              <Box 
                sx={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 3
                }}
              >
                {unfinishedQuizzes.map((quiz) => (
                  <QuizListItem 
                    key={quiz.identifier}
                    quiz={quiz}
                    isUnfinished={true}
                    onContinue={continueUnfinishedQuiz}
                    onDelete={() => deleteUnfinishedQuiz(quiz.identifier)}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
                Nemáte žádné rozdělané kvízy
              </Typography>
            )}
          </Box>
        ) : (
          // Replace the quiz list with a grid layout
          <Box sx={{ mt: 2 }}>
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 3
              }}
            >
              {filteredQuizzes.map((quiz, index) => (
                <QuizListItem 
                  key={`${activeTab}-${quiz._id}-${page}-${index}`}
                  quiz={quiz} 
                  isPublic={activeTab === 1}
                  onEditPublic={() => handleEditPublicQuiz(quiz)}
                  onToggleShare={handleToggleShare}
                  onEdit={handleEditQuiz}
                  onDelete={handleDeleteQuiz}
                />
              ))}
            </Box>
            
            {hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="outlined"
                >
                  {loading ? 'Načítání...' : `Zobrazit další`}
                </Button>
              </Box>
            )}

            {!hasMore && filteredQuizzes.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Načteny všechny kvízy
                </Typography>
              </Box>
            )}
            
            {!loading && filteredQuizzes.length === 0 && selectedType != QUIZ_TYPES.WORD_CHAIN && selectedType != QUIZ_TYPES.DRAWING && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
                {searchQuery 
                  ? 'Nenalezeny žádné kvízy odpovídající vašemu vyhledávání'
                  : activeTab === 0 
                    ? 'Zatím jste nevytvořili žádné kvízy' 
                    : 'Nebyly nalezeny žádné veřejné kvízy'}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Copy Quiz Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Kopírovat kvíz</DialogTitle>
        <DialogContent>
          <Typography>
            Tento kvíz nevlastníte, chcete vytvořit jeho kopii a editovat ji?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Ne</Button>
          <Button onClick={handleCreateCopy} variant="contained">Ano</Button>
        </DialogActions>
      </Dialog>

      {/* Quick Play Modal */}
      <QuickPlayModal
        open={quickPlayModalOpen}
        onClose={() => setQuickPlayModalOpen(false)}
        onStartGame={handleStartQuickPlay}
        selectedType={selectedType !== 'all' ? selectedType : QUIZ_TYPES.DRAWING}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DesktopHomePage;