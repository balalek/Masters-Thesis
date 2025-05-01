/**
 * @fileoverview Score Page component for displaying round results and leaderboards
 * 
 * This module provides:
 * - Display of question results with type-specific visualizations
 * - Leaderboard display showing current standings
 * - Automatic navigation to next question after countdown
 * - Special handling for final question transitions
 * - Dynamic rendering based on question type
 * 
 * @module Pages/Desktop/ScorePage/ScorePage
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { getSocket, getServerTime } from '../../../utils/socket';
import ABCDAnswers from '../../../components/desktop/answerTypes/ABCDAnswers';
import TrueFalseAnswers from '../../../components/desktop/answerTypes/TrueFalseAnswers';
import OpenAnswerResult from '../../../components/desktop/answerTypes/OpenAnswerResult';
import Leaderboard from '../../../components/desktop/miscellaneous/Leaderboard';
import GuessNumberResult from '../../../components/desktop/answerTypes/GuessNumberResult';
import DrawingAnswerResult from '../../../components/desktop/answerTypes/DrawingAnswerResult';
import WordChainResults from '../../../components/desktop/answerTypes/WordChainResults';
import MathQuizResults from '../../../components/desktop/answerTypes/MathQuizResults';
import BlindMapResult from '../../../components/desktop/answerTypes/BlindMapResult';

/**
 * Score Page component for displaying results between questions
 * 
 * @component
 * @returns {JSX.Element} The rendered score page component
 */
const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const correctAnswer = location.state?.correctAnswer;
  const answerCounts = location.state?.answerCounts || [0, 0, 0, 0];
  const isLastQuestion = location.state?.isLastQuestion || false;
  const question = location.state?.question || { options: ["Option 1", "Option 2", "Option 3", "Option 4"] };
  const showQuestionPreviewAt = location.state?.showQuestionPreviewAt;
  const [countdown, setCountdown] = useState(8);
  const socket = getSocket();
  const [timeRemaining, setTimeRemaining] = useState(5);

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
                    activeTeam: data.active_team,
                    blind_map_is_team_play: data.active_team !== null
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

  // Countdown effect for the last question
  useEffect(() => {
    if (isLastQuestion) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Navigate immediately to final score page
            socket.emit('show_final_score');
            navigate('/final-score', { 
              state: { 
                scores: scores,
                correctAnswer: correctAnswer,
                question: question,
                isRemote: location.state?.isRemote
              } 
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLastQuestion]);

  // Socket event listener for game reset
  useEffect(() => {
      const socket = getSocket();
  
      socket.on('game_reset', (data) => {
        navigate(data.was_remote ? '/remote' : '/');
      });
  
      return () => {
        socket.off('game_reset');
      };
    }, [navigate]);

  /**
   * Handles quiz closure and cleanup.
   * 
   * Resets the game state on the server and navigates back to the appropriate page.
   * 
   * @function handleCloseQuiz
   */
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

  /**
   * Renders the appropriate answer component based on question type.
   * 
   * Dynamically selects and configures the correct visualization component
   * for the current question's answer type.
   * 
   * @function renderAnswers
   * @returns {JSX.Element} The appropriate answer component for the question type
   */
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
      case 'DRAWING':
        return <DrawingAnswerResult 
          question={{
            ...question,
            correctAnswer: correctAnswer,
            drawer: question.drawer || 'Unknown',
            playerAnswers: question.playerAnswers || []
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
      case 'WORD_CHAIN':
        return <WordChainResults 
          wordChain={question.word_chain || []}
          eliminatedPlayers={question.eliminated_players || []}
          isTeamMode={scores.is_team_mode}
          winningTeam={question.winning_team}
          lastPlayer={question.last_player || question.current_player}
          explodedTeam={question.exploded_team}
          explodedPlayer={question.exploded_player}
        />;
      case 'MATH_QUIZ':
        return <MathQuizResults 
          sequences={question.sequences || []}
          eliminatedPlayers={question.eliminated_players || []}
          isTeamMode={scores.is_team_mode}
          playerAnswers={question.player_answers || {}}
        />;
      case 'BLIND_MAP':
        return <BlindMapResult 
          question={question} 
          team_guesses={location.state?.team_guesses || question?.team_guesses}
          captain_guesses={location.state?.captain_guesses || question?.captain_guesses}
          player_locations={location.state?.player_locations || question?.player_locations}
          winning_team={location.state?.winning_team || question?.winning_team}
          is_team_mode={location.state?.is_team_mode || question?.is_team_mode}
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
        <Typography variant="h4" component="h1" sx={{ 
          position: 'absolute', 
          left: '50%', 
          transform: 'translateX(-50%)',
          visibility: isLastQuestion && countdown === 0 ? 'hidden' : 'visible'
        }}>
          {isLastQuestion ? '' : 'Výsledky kola'}
        </Typography>

        {/* Right - Close Quiz Button (only show if last question) */}
        { isLastQuestion && countdown === 0 && !location.state?.isRemote && (
          <Button
            variant="contained"
            onClick={handleCloseQuiz}
            sx={{ visibility: 'hidden' }}
          >
            Ukončit kvíz
          </Button>
        )}
      </Box>

      {/* Main content area - Hide everything when countdown is 0 (when it's last question) */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0,
        visibility: countdown === 0 ? 'hidden' : 'visible'
      }}>
        {isLastQuestion ? (
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

      {/* Answer buttons - rendered based on question type - Hide when countdown is 0 */}
      <Box sx={{ visibility: countdown === 0 ? 'hidden' : 'visible' }}>
        {renderAnswers()}
      </Box>
    </Box>
  );
};

export default ScorePage;