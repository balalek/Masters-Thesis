import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket, getServerTime } from '../../../utils/socket';
import { Box } from '@mui/material';
import CorrectAnswer from '../../../components/mobile/CorrectAnswer';
import IncorrectAnswer from '../../../components/mobile/IncorrectAnswer';
import Loading from '../../../components/mobile/Loading';
import MobileFinalScore from '../../../components/mobile/MobileFinalScore';
import ABCDQuizMobile from '../../../components/mobile/quizTypes/ABCDQuizMobile';
import TrueFalseQuizMobile from '../../../components/mobile/quizTypes/TrueFalseQuizMobile';
import TooLateAnswer from '../../../components/mobile/TooLateAnswer';  // Add this import

const MobileGamePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [question, setQuestion] = useState({
    options: ["Option 1", "Option 2", "Option 3", "Option 4"]
  });
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [finalScoreData, setFinalScoreData] = useState(null);
  const playerName = location.state?.playerName || 'Unknown Player';
  const [showButtons, setShowButtons] = useState(true);  // Add this state

  useEffect(() => {
    const socket = getSocket();

    socket.on('next_question', (data) => {
      console.log('next_question event received in MobileGamePage:', data);
      setQuestion(data.question);
      setLoading(true);
      setShowResult(false);
      setIsCorrect(null);
      setShowButtons(false);  // Hide buttons initially
    });

    socket.on('answer_correctness', (data) => {
      console.log('answer_correctness event received in MobileGamePage:', data);
      setIsCorrect(data.correct);
      setPointsEarned(data.points_earned);
      setTotalPoints(data.total_points);
    });

    socket.on('all_answers_received', (data) => {
      console.log('all_answers_received event received in MobileGamePage');
      setShowResult(true);
      
      // Calculate delay until buttons should show
      const now = getServerTime();
      const delay = data.show_buttons_at - now;
      
      // Schedule showing the buttons
      setTimeout(() => {
        setLoading(false);
        setShowButtons(true);
      }, delay);
    });

    socket.on('navigate_to_final_score', (data) => {
      console.log('Received final score data:', data);
      setFinalScoreData(data);
      setShowFinalScore(true);
    });

    socket.on('game_reset', () => {
      navigate('/play', { 
        state: { 
          playerName: playerName,
          playerColor: finalScoreData?.color 
        } 
      });
    });

    return () => {
      socket.off('next_question');
      socket.off('answer_correctness');
      socket.off('all_answers_received');
      socket.off('navigate_to_final_score');
      socket.off('game_reset');
    };
  }, [navigate, playerName, finalScoreData]);

  const handleAnswer = (index) => {
    const socket = getSocket();
    console.log('Submitting answer:', { player_name: playerName, answer: index });
    socket.emit('submit_answer', { player_name: playerName, answer: index });
    setLoading(true);
  };

  if (showFinalScore && finalScoreData) {
    return (
<MobileFinalScore
        playerName={finalScoreData.playerName}
        score={finalScoreData.score}
        placement={finalScoreData.placement}
        color={finalScoreData.color}
      />
    );
  }

  if (showResult) {
    if (isCorrect === null) {
      return <TooLateAnswer total_points={totalPoints} />;
    }
    return isCorrect ? 
      <CorrectAnswer points_earned={pointsEarned} total_points={totalPoints} /> : 
      <IncorrectAnswer points_earned={pointsEarned} total_points={totalPoints} />;
  }

  if (loading) return <Loading />;

  const renderQuizType = () => {
    if (!showButtons) {
      return null;  // or some placeholder content
    }
    
    switch (question?.type) {
      case 'TRUE_FALSE':
        return <TrueFalseQuizMobile onAnswer={handleAnswer} />;
      case 'ABCD':
      default:
        return <ABCDQuizMobile onAnswer={handleAnswer} />;
    }
  };

  return (
    <Box sx={{ height: '100vh' }}>
      {renderQuizType()}
    </Box>
  );
};

export default MobileGamePage;