import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import { Box, Button, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined'; // Triangle icon
import CircleIcon from '@mui/icons-material/CircleOutlined';
import { use } from 'react';

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [answersCount, setAnswersCount] = useState(0);
  const [question, setQuestion] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on('all_answers_received', (data) => {
      // Navigate to score page with scores and isLastQuestion
      console.log('all_answers_received event received in GamePage:', data);
      console.log('Navigating to scores with isLastQuestion:', isLastQuestion);
      navigate('/scores', { state: { scores: data.scores, correctAnswer: data.correct_answer, answerCounts: data.answer_counts, isLastQuestion: isLastQuestion, question: question } });
    });

    return () => {
      socket.off('all_answers_received');
    };
  }, [navigate, isLastQuestion, question]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('answer_submitted', () => {
      setAnswersCount(prev => prev + 1);
    });

    return () => {
      socket.off('answer_submitted');
    }
  }, []);

  useEffect(() => {
    if (location.state && location.state.question) {
      console.log('Setting question from location state:', location.state.question);
      setQuestion(location.state.question);
      setIsLastQuestion(location.state.is_last_question);
    }
  }, [location.state]);

  if (!question) return <div>Chybička se vloudila...</div>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between', padding: 2 }}>
      <Typography variant="h3" component="h1" sx={{ textAlign: 'center', marginBottom: 2, marginTop: 2, lineHeight: 1.2 }}>
        {question.question}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        {/* Left side - Timer */}
        <Box sx={{ textAlign: 'center', paddingLeft: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            20
          </Typography>
        </Box>
        {/* Right side - Answer counter */}
        <Box sx={{ textAlign: 'center', paddingRight: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {answersCount}
          </Typography>
          <Typography variant="subtitle1" >
            odpovědí
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#14A64A', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<StarIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question.options[0]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#186CF6', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question.options[1]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EF4444', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<PentagonIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question.options[2]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EAB308', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question.options[3]}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
}

export default GamePage;