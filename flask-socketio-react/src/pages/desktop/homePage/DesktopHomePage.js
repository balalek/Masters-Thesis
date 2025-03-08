import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, TextField, IconButton, ToggleButton, ToggleButtonGroup, Checkbox, FormControlLabel, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ShareIcon from '@mui/icons-material/Share';
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
import QuizListItem from '../../../components/desktop/home/QuizListItem';
import { QUIZ_TYPES } from '../../../constants/quizValidation';

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
  const [allowAudioQuizzes, setAllowAudioQuizzes] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuizToCopy, setSelectedQuizToCopy] = useState(null);

  const quizTypeIcons = {
    [QUIZ_TYPES.ABCD]: { icon: QuizIcon, label: 'ABCD Kvíz' },
    [QUIZ_TYPES.OPEN_ANSWER]: { icon: QuestionAnswerIcon, label: 'Otevřené odpovědi' },
    [QUIZ_TYPES.BLIND_MAP]: { icon: MapIcon, label: 'Slepá mapa' },
    [QUIZ_TYPES.DRAWING]: { icon: DrawIcon, label: 'Kreslení' },
    [QUIZ_TYPES.WORD_CHAIN]: { icon: LinkIcon, label: 'Slovní řetěz' },
    [QUIZ_TYPES.MATH_QUIZ]: { icon: CalculateIcon, label: 'Matematický kvíz' },
    [QUIZ_TYPES.GUESS_A_NUMBER]: { icon: Filter1Icon, label: 'Hádej číslo' },
    [QUIZ_TYPES.COMBINED_QUIZ]: { icon: ShuffleIcon, label: 'Kombinovaný kvíz' },
  };

  useEffect(() => {
    // TODO: Fetch my quizzes and public quizzes separately
    setQuizzes([
      { id: 1, name: "My Quiz 1", type: "ABCD", questions: [1,2,3] },
      { id: 2, name: "My Quiz 2", type: "BLIND_MAP", questions: [1,2] },
    ]);
    setPublicQuizzes([
      { id: 3, name: "Public Quiz 1", type: "ABCD", questions: [1,2,3] },
      { id: 4, name: "Public Quiz 2", type: "BLIND_MAP", questions: [1,2] },
    ]);
  }, []);

  const handleEditPublicQuiz = (quiz) => {
    setSelectedQuizToCopy(quiz);
    setOpenDialog(true);
  };

  const handleCreateCopy = () => {
    // TODO: Implement quiz copy creation
    setOpenDialog(false);
    navigate(`/create-quiz?copy=${selectedQuizToCopy.id}`);
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
                checked={allowAudioQuizzes}
                onChange={(e) => setAllowAudioQuizzes(e.target.checked)}
              />
            }
            label="Povolit audio kvízy"
            sx={{ mr: 2 }}
          />
          <TextField
            size="small"
            placeholder="Hledat kvíz..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
            fullWidth
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Rychlá hra
          </Button>
        </Box>

        {/* Quiz List */}
        <Box sx={{ mt: 2 }}>
          {activeTab === 0 ? (
            quizzes.map((quiz) => (
              <QuizListItem 
                key={quiz.id} 
                quiz={quiz} 
                isPublic={false}
                onEditPublic={() => {}}
              />
            ))
          ) : (
            publicQuizzes.map((quiz) => (
              <QuizListItem 
                key={quiz.id} 
                quiz={quiz} 
                isPublic={true}
                onEditPublic={() => handleEditPublicQuiz(quiz)}
              />
            ))
          )}
        </Box>
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
    </Box>
  );
};

export default DesktopHomePage;