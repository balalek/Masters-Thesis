/**
 * @fileoverview DesktopHomePage component - main homepage for the desktop view.
 * @module Pages/Desktop/HomePage/DesktopHomePage
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, TextField, ToggleButton, ToggleButtonGroup, Checkbox, FormControlLabel, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Paper } from '@mui/material';
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
import { useTheme } from '@mui/material/styles';

/**
 * Custom toggle button for quiz types in grid display (filter)
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ComponentType} props.icon - Icon component to display
 * @param {string} props.label - Button label text
 * @param {string} props.value - Button value used for selection state
 * @param {boolean} props.selected - Whether this button is currently selected
 * @param {Function} props.onChange - Handler for button click
 * @param {Object} props.theme - MUI theme object
 * @returns {React.Element} Styled toggle button with icon and label
 */
const QuizTypeButton = ({ icon: Icon, label, value, selected, onChange, theme }) => (
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
      border: '1px solid rgba(255, 255, 255, 0.12)', // Visible border
      '&.Mui-selected': {
        // Use primary.light in light mode and primary.dark in dark mode
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.primary.dark 
          : theme.palette.primary.light,
        '&:hover': {
          // Keep consistent with selected state on hover
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.palette.primary.dark 
            : theme.palette.primary.light,
        }
      }
    }}
  >
    <Box sx={{ 
      height: '60px',
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
      alignItems: 'flex-start',
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

/**
 * Main homepage component for desktop view of the quiz application
 * 
 * Provides a comprehensive UI for quiz management including:
 * - Quiz type filtering with visual buttons
 * - Search functionality for quizzes
 * - Tab navigation between my/public/unfinished quizzes
 * - Quiz creation, editing, sharing, and deletion
 * - Quick play functionality for quiz games with random existing questions
 * 
 * @component
 * @example
 * return (
 *   <DesktopHomePage />
 * )
 */
const DesktopHomePage = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [hideAudioQuizzes, setHideAudioQuizzes] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuizToCopy, setSelectedQuizToCopy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [unfinishedQuizzes, setUnfinishedQuizzes] = useState([]);
  const [quickPlayModalOpen, setQuickPlayModalOpen] = useState(false);
  const theme = useTheme();
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

  /**
   * Fetches quizzes from the server based on current filters
   * 
   * @function fetchQuizzes
   * @async
   * @param {number} newPage - Page number to fetch
   * @param {string} newSearch - Search query text
   * @returns {Promise<void>}
   */
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
      setHasMore(data.hasMore);

      // Add more quizzes to the existing list on scroll
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

  // Clear quiz list when switching tabs or changing type
  useEffect(() => {
    setPage(1);
    fetchQuizzes(1);
    // Fetch unfinished quizzes when the page loads
    fetchUnfinishedQuizzes();
  }, [activeTab, selectedType]);

  // Fetch quizzes when search query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setPage(1);
      fetchQuizzes(1, searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  /**
   * Loads more quizzes when scrolling or clicking load more
   * 
   * @function loadMore
   */
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchQuizzes(page + 1);
    }
  };

  /**
   * Initiates the process of editing a public quiz by first creating a copy
   * 
   * @function handleEditPublicQuiz
   * @param {Object} quiz - The quiz to edit
   */
  const handleEditPublicQuiz = (quiz) => {
    setSelectedQuizToCopy(quiz);
    setOpenDialog(true);
  };

  /**
   * Creates a copy of a selected quiz and redirects to edit view
   * 
   * Makes a POST request to the quiz copy endpoint and handles the navigation
   * to the edit page with the newly created quiz ID.
   * 
   * @async
   * @function handleCreateCopy
   * @returns {Promise<void>}
   * @throws Will display error snackbar if the API request fails
   */
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

  /**
   * Toggles the public/private status of a quiz
   * 
   * Makes a POST request to change the sharing status of the quiz
   * and updates the UI state to reflect the changes.
   * 
   * @async
   * @function handleToggleShare
   * @param {Object} quiz - The quiz object to toggle sharing for
   * @param {string} quiz._id - MongoDB ID of the quiz
   * @returns {Promise<void>}
   * @throws Will display error snackbar if the API request fails
   */
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

  /**
   * Closes the snackbar notification
   * 
   * @function handleCloseSnackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  /**
   * Navigates to the quiz edit page for a selected quiz
   * 
   * @function handleEditQuiz
   * @param {Object} quiz - The quiz to edit
   */
  const handleEditQuiz = (quiz) => {
    navigate('/create-quiz', { 
      state: { 
        isEditing: true,
        quizId: quiz._id
      }
    });
  };

  /**
   * Deletes a quiz after user confirmation
   * 
   * @function handleDeleteQuiz
   * @async
   * @param {Object} quiz - The quiz to delete
   * @returns {Promise<void>}
   */
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
      
      // Update quiz list to remove the quiz
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

  /**
   * Fetches unfinished (draft) quizzes from the server
   * 
   * @function fetchUnfinishedQuizzes
   * @async
   * @returns {Promise<void>}
   */
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
  
  /**
   * Continue editing a previously unfinished quiz
   * 
   * @function continueUnfinishedQuiz
   * @param {Object} unfinishedQuiz - The unfinished quiz to continue editing
   */
  const continueUnfinishedQuiz = (unfinishedQuiz) => {
    navigate('/create-quiz', { 
      state: { 
        autosaveIdentifier: unfinishedQuiz.identifier,
        isEditing: unfinishedQuiz.is_editing,
        quizId: unfinishedQuiz.original_quiz_id
      }
    });
  };
  
  /**
   * Delete an unfinished quiz draft after confirmation
   * 
   * @function deleteUnfinishedQuiz
   * @async
   * @param {string} identifier - Unique identifier of the unfinished quiz
   * @returns {Promise<void>}
   */
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

  /**
   * Opens the quick play configuration modal
   * 
   * @function handleQuickPlayClick
   */
  const handleQuickPlayClick = () => {
    setQuickPlayModalOpen(true);
  };

  /**
   * Starts a quick play game with the selected configuration
   * 
   * @function handleStartQuickPlay
   * @param {Object} config - Configuration for the quick play game
   * @returns {void}
   */
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
          backgroundColor: 'bar.main',
          color: '#fff',
          borderBottom: '1px solid #212121',
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
            gridTemplateColumns: 'repeat(8, 1fr)', // 8 columns
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
              theme={theme}
            />
          ))}
        </ToggleButtonGroup>

        {/* Tabs and Search */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Moje kvízy" />
            <Tab label="Veřejné kvízy" />
            <Tab label="Rozdělané kvízy" />
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
            label="Nezobrazovat audio otázky"
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

        {/* Show notice box when WORD_CHAIN or DRAWING type is selected */}
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
          // Unfinished quizzes tab content - using QuizListItem component
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