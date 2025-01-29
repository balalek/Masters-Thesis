import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import { Box, Button } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined'; // Triangle icon
import CircleIcon from '@mui/icons-material/CircleOutlined';
import CorrectAnswer from '../../../components/mobile/CorrectAnswer';
import IncorrectAnswer from '../../../components/mobile/IncorrectAnswer';
import Loading from '../../../components/mobile/Loading';

const MobileGamePage = () => {
  const location = useLocation();
  const [question, setQuestion] = useState({
    options: ["Option 1", "Option 2", "Option 3", "Option 4"]
  });
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const playerName = location.state?.playerName || 'Unknown Player';

  useEffect(() => {
    const socket = getSocket();

    socket.on('next_question', (data) => {
      console.log('next_question event received in MobileGamePage:', data); // Debugging log
      setQuestion(data.question);
      setLoading(false);
      setShowResult(false);
    });

    socket.on('answer_correctness', (data) => {
      console.log('answer_correctness event received in MobileGamePage:', data); // Debugging log
      setIsCorrect(data.correct);
      setPointsEarned(data.points_earned);
      setTotalPoints(data.total_points);
    });

    socket.on('all_answers_received', () => {
      console.log('all_answers_received event received in MobileGamePage'); // Debugging log
      setShowResult(true);
    });

    return () => {
      socket.off('next_question');
      socket.off('answer_correctness');
      socket.off('all_answers_received');
    };
  }, []);

  const handleAnswer = (index) => {
    const socket = getSocket();
    console.log('Submitting answer:', { player_name: playerName, answer: index }); // Debugging log
    socket.emit('submit_answer', { player_name: playerName, answer: index });
    setLoading(true);
  };

  if (showResult) {
    return isCorrect ? 
      <CorrectAnswer points_earned={pointsEarned} total_points={totalPoints} /> : 
      <IncorrectAnswer points_earned={pointsEarned} total_points={totalPoints} />;
  }

  if (loading) return <Loading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-around', gap: 2, height: '50%' }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#14A64A', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => handleAnswer(0)}
        >
          <StarIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#186CF6', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => handleAnswer(1)}
        >
          <SquareIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
      </Box>
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-around', gap: 2, height: '50%' }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EF4444', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => handleAnswer(2)}
        >
          <PentagonIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EAB308', color: 'white', flex: '1 1 45%', fontSize: '2.5em', justifyContent: 'center' }}
          onClick={() => handleAnswer(3)}
        >
          <CircleIcon sx={{ fontSize: '3em', color: 'white' }} />
        </Button>
      </Box>
    </Box>
  );
};

export default MobileGamePage;