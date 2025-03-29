import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import ABCDAnswers from '../../../components/desktop/answerTypes/ABCDAnswers';
import TrueFalseAnswers from '../../../components/desktop/answerTypes/TrueFalseAnswers';
import OpenAnswerResult from '../../../components/desktop/answerTypes/OpenAnswerResult';
import Leaderboard from '../../../components/desktop/Leaderboard';
import GuessNumberResult from '../../../components/desktop/answerTypes/GuessNumberResult';

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const correctAnswer = location.state?.correctAnswer;
  const answerCounts = location.state?.answerCounts || [0, 0, 0, 0];
  const isLastQuestion = location.state?.isLastQuestion || false;
  const question = location.state?.question || { options: ["Option 1", "Option 2", "Option 3", "Option 4"] };
  const showQuestionPreviewAt = location.state?.showQuestionPreviewAt;
  const [countdown, setCountdown] = useState(null);
  const socket = getSocket();
  const [timeRemaining, setTimeRemaining] = useState(5);

  // Add logging for initial props
  useEffect(() => {
    console.log('ScorePage initial state:', {
      isLastQuestion,
      question,
      showQuestionPreviewAt
    });
  }, []);

  // Single timer effect that handles both countdown and navigation
  useEffect(() => {
    if (!isLastQuestion && showQuestionPreviewAt) {
      const timer = setInterval(() => {
        const now = getServerTime();
        const remaining = Math.ceil((showQuestionPreviewAt - now) / 1000);

        if (remaining <= 0) {
          clearInterval(timer);
          // Fetch and navigate immediately
          fetch(`http://${window.location.hostname}:5000/next_question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.question) {
                const current_time = getServerTime();
                const game_time = showQuestionPreviewAt + data.preview_time - current_time; // Time until game starts
                const question_end_time = current_time + (data.question.length * 1000) + game_time;

                navigate('/game', { 
                  state: { 
                    question: data.question,
                    showGameAt: showQuestionPreviewAt + data.preview_time,
                    question_end_time: question_end_time,
                    is_last_question: data.is_last_question,
                    activeTeam: data.active_team
                  } 
                });
              }
            });
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [navigate, isLastQuestion, showQuestionPreviewAt]);

  // Modify the countdown effect
  useEffect(() => {
    if (isLastQuestion) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Wrap both actions in a single requestAnimationFrame to batch them
            requestAnimationFrame(() => {
              socket.emit('show_final_score');
              navigate('/final-score', { 
                state: { 
                  scores: scores,
                  correctAnswer: correctAnswer,
                  question: question,
                  isRemote: location.state?.isRemote  // Add this line
                } 
              });
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLastQuestion]);

  useEffect(() => {
      const socket = getSocket();
  
      socket.on('game_reset', (data) => {
        navigate(data.was_remote ? '/remote' : '/');
      });
  
      return () => {
        socket.off('game_reset');
      };
    }, [navigate]);
    
  const handleCloseQuiz = () => {
    fetch(`http://${window.location.hostname}:5000/reset_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        navigate(data.was_remote ? '/remote' : '/');
      })
      .catch((error) => {
        console.error('Error resetting game:', error);
      });
  };

  // Add logging to inspect what question data we're receiving
  useEffect(() => {
    console.log('ScorePage question data:', {
      type: question?.type,
      correctAnswer,
      answerCounts,
      playerAnswers: question?.playerAnswers || []
    });
  }, [question, correctAnswer, answerCounts]);

  const renderAnswers = () => {
    // Simply use the question's type property directly
    const questionType = question?.type || 'ABCD'; // Default to ABCD if no type
    
    switch (questionType) {
      case 'OPEN_ANSWER':
        return <OpenAnswerResult 
          question={{
            ...question,
            correctAnswer: correctAnswer
          }} 
        />;
      case 'TRUE_FALSE':
        return <TrueFalseAnswers 
          question={question} 
          correctAnswer={correctAnswer} 
          answerCounts={answerCounts || [0, 0]} 
        />;
      case 'GUESS_A_NUMBER':
        return <GuessNumberResult
          correctAnswer={correctAnswer}
          playerGuesses={question.playerGuesses || []}
          teamMode={scores.is_team_mode}
          firstTeamAnswer={question.firstTeamAnswer}
          secondTeamVote={question.secondTeamVote}
        />;
      case 'ABCD':
      default:
        return <ABCDAnswers 
          question={question} 
          correctAnswer={correctAnswer} 
          answerCounts={answerCounts || [0, 0, 0, 0]} 
        />;
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      padding: 2,
      gap: 3
    }}>
      {/* Header with timer */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Left - Timer (only show if not last question) */}
        {!isLastQuestion && (
          <Typography 
            sx={{ 
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#3B82F6',
              mb: -2,
              mt: -2,
              ml: 1
            }}
          >
            {timeRemaining}
          </Typography>
        )}

        {/* Center - Title */}
        <Typography variant="h4" component="h1" sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {isLastQuestion ? '' : 'Výsledky kola'}
        </Typography>

        {/* Remove Next button since navigation is automatic */}
        {isLastQuestion && !countdown && !location.state?.isRemote && (
          <Button
            variant="contained"
            onClick={handleCloseQuiz}
          >
            Ukončit kvíz
          </Button>
        )}
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLastQuestion && countdown ? (
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4
          }}>
            <Typography variant="h2">
              Výsledné umístění se zobrazí za
            </Typography>
            <Typography 
              variant="h1" 
              sx={{
                fontSize: '10rem',
                fontWeight: 'bold',
                color: '#3B82F6'
              }}
            >
              {countdown}
            </Typography>
          </Box>
        ) : (
          <Leaderboard scores={scores} />
        )}
      </Box>

      {/* Answer buttons - now rendered based on question type */}
      {renderAnswers()}
    </Box>
  );
};

export default ScorePage;