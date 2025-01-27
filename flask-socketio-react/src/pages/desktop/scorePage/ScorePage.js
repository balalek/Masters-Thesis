import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';
import { getSocket } from '../../../utils/socket';

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const correctAnswer = location.state?.correctAnswer;
  const answerCounts = location.state?.answerCounts || [0, 0, 0, 0];
  const isLastQuestion = location.state?.isLastQuestion || false;
  const question = location.state?.question || { options: ["Option 1", "Option 2", "Option 3", "Option 4"] };

  const handleNextQuestion = () => {
    fetch(`http://${window.location.hostname}:5000/next_question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.question) {
          console.log('ScorePage loaded with isLastQuestion:', data.is_last_question);
          navigate('/game', { state: { question: data.question, is_last_question: data.is_last_question } });
        } else {
          console.error(data.error);
        }
      })
      .catch((error) => {
        console.error('Error fetching next question:', error);
      });
  };

  const handleCloseQuiz = () => {
    fetch(`http://${window.location.hostname}:5000/reset_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        navigate('/');
      })
      .catch((error) => {
        console.error('Error resetting game:', error);
      });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between', padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h4" component="h1">
          Výsledky kola
        </Typography>
        <Button
          variant="contained"
          onClick={isLastQuestion ? handleCloseQuiz : handleNextQuestion}
          sx={{ position: 'absolute', right: 16 }}
        >
          {isLastQuestion ? 'Close Quiz' : 'Další kolo'}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
        {Object.entries(scores).map(([player, score]) => (
          <Typography key={player} variant="h6" component="p">
            {player}: {score}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
      <Button
        variant="contained"
        sx={{
          backgroundColor: '#14A64A',
          color: 'white',
          flex: '1 1 45%',
          height: '150px',
          fontSize: '2.5em',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 2,
          paddingRight: 2,
          textTransform: 'none',
          opacity: correctAnswer === 0 ? 1 : 0.4
        }}
        startIcon={<StarIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question.options[0]}
          </Typography>
          <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
            {answerCounts[0]}×
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#186CF6',
            color: 'white',
            flex: '1 1 45%',
            height: '150px',
            fontSize: '2.5em',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: 2,
            paddingRight: 2,
            textTransform: 'none',
            opacity: correctAnswer === 1 ? 1 : 0.4
          }}
          startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', textAlign: 'left', flexGrow: 1, padding: 1, lineHeight: 1.2 }}>
            {question.options[1]}
          </Typography>
          <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
            {answerCounts[1]}×
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#EF4444',
            color: 'white',
            flex: '1 1 45%',
            height: '150px',
            fontSize: '2.5em',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: 2,
            paddingRight: 2,
            textTransform: 'none',
            opacity: correctAnswer === 2 ? 1 : 0.4
          }}
          startIcon={<PentagonIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', textAlign: 'left', flexGrow: 1, padding: 1, lineHeight: 1.2 }}>
            {question.options[2]}
          </Typography>
          <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
            {answerCounts[2]}×
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#EAB308',
            color: 'white',
            flex: '1 1 45%',
            height: '150px',
            fontSize: '2.5em',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: 2,
            paddingRight: 2,
            textTransform: 'none',
            opacity: correctAnswer === 3 ? 1 : 0.4
          }}
          startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', textAlign: 'left', flexGrow: 1, padding: 1, lineHeight: 1.2 }}>
            {question.options[3]}
          </Typography>
          <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
            {answerCounts[3]}×
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};

export default ScorePage;