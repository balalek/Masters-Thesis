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
import TooLateAnswer from '../../../components/mobile/TooLateAnswer';
import OpenAnswerQuizMobile from '../../../components/mobile/quizTypes/OpenAnswerQuizMobile';
import GuessANumberQuizMobile from '../../../components/mobile/quizTypes/GuessANumberQuizMobile';
import TeamCaptainGuessNumberMobile from '../../../components/mobile/quizTypes/TeamCaptainGuessNumberMobile';
import MoreLessVoteMobile from '../../../components/mobile/quizTypes/MoreLessVoteMobile';
import GuessANumberPlacement from '../../../components/mobile/GuessANumberPlacement';

const MobileGamePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialGameData = location.state?.gameData; // Get initial game data
  const [question, setQuestion] = useState(initialGameData?.question || {
    type: 'ABCD',
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
  const [showButtons, setShowButtons] = useState(true);
  const [playerRole, setPlayerRole] = useState('player'); // 'player', 'captain', 'voter'
  const [teamName, setTeamName] = useState(null); // 'blue' or 'red'
  const [quizPhase, setQuizPhase] = useState(1); // For guess-a-number quiz phases
  const [firstTeamAnswer, setFirstTeamAnswer] = useState(null);
  const [guessPlacementData, setGuessPlacementData] = useState(null);
  const [showGuessPlacement, setShowGuessPlacement] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on('next_question', (data) => {
      console.log('next_question event received in MobileGamePage:', data);
      setQuestion(data.question);
      setLoading(true);
      setShowResult(false);
      setGuessPlacementData(null);
      setShowGuessPlacement(false);
      setIsCorrect(null);
      setShowButtons(false);  // Hide buttons initially
    });

    socket.on('answer_correctness', (data) => {
      setIsCorrect(data.correct);
      setPointsEarned(data.points_earned);
      setTotalPoints(data.total_points);

      // Handle guess-a-number placement data
      if (data.guessResult && data.correct !== null) {
        setGuessPlacementData(data.guessResult);
        setShowGuessPlacement(true);
        setLoading(true);
        return; // Early return to avoid showing regular result screens
      } else if (data.guessResult && data.correct === null) {
        // Handle the case where the answer is too late
        setGuessPlacementData(null); // Clear previous data
        setShowGuessPlacement(false);
        setIsCorrect(null); // null triggers the "too late" screen
        setShowResult(true);
        setLoading(true); // Stop the loading spinner
        return;
      }
      
      // Always show result for correct answers, regardless of question type
      if (data.correct) {
        setShowResult(true);
        setLoading(true);
      } else if (question?.type !== 'OPEN_ANSWER') {
        // For incorrect answers in non-open questions, also show the result
        setShowResult(true);
        setLoading(true);
      }
    });

    socket.on('all_answers_received', (data) => {
      console.log('all_answers_received event received in MobileGamePage');
      
      // Skip setting showResult for GUESS_A_NUMBER questions
      // This prevents overriding the placement visualization
      if (question?.type !== 'GUESS_A_NUMBER') {
        console.log('Setting showResult to true for all_answers_received');
        setShowResult(true);
      }
      
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
  }, [navigate, playerName, finalScoreData, question]);

  // Add a new effect for quiz-specific roles
  useEffect(() => {
    const socket = getSocket();
    socket.on('player_role_update', (data) => {
      setPlayerRole(data.role);
      setTeamName(data.team);
      
      if (data.quizPhase) {
        setQuizPhase(data.quizPhase);
      }
      
      if (data.firstTeamAnswer !== undefined) {
        setFirstTeamAnswer(data.firstTeamAnswer);
      }
    });

    return () => {
      socket.off('player_role_update');
    };
  }, []);

  const handleAnswer = (index) => {
    const socket = getSocket();
    const answerTime = getServerTime();  // Get the current server time
    socket.emit('submit_answer', { player_name: playerName, answer: index, answer_time: answerTime });
    setLoading(true);
  };

  const handleOpenAnswer = (answer) => {
    const socket = getSocket();
    const now = getServerTime();
    
    // Submit the open answer without setting loading state
    socket.emit('submit_open_answer', {
      player_name: playerName,
      answer: answer,
      answer_time: now
    });
  };

  // Special handlers for guess-a-number quiz
  const handleNumberGuess = (value) => {
    const socket = getSocket();
    const now = getServerTime();
    
    socket.emit('submit_number_guess', {
      player_name: playerName,
      value: value,
      answer_time: now
    });
    
    // Only set loading for regular players, not captains or voters
    if (playerRole === 'player') {
      setLoading(true);
    }
  };

  const handleCaptainChoice = (finalAnswer) => {
    const socket = getSocket();
    
    socket.emit('submit_captain_choice', {
      player_name: playerName,
      team: teamName,
      final_answer: finalAnswer
    });
    
    setLoading(true);
  };

  const handleMoreLessVote = (vote) => {
    const socket = getSocket();
    
    socket.emit('submit_more_less_vote', {
      player_name: playerName,
      team: teamName,
      vote: vote
    });
  };

  if (showFinalScore && finalScoreData) {
    return (
      <MobileFinalScore
        {...finalScoreData}  // This spreads all the data from finalScoreData
        isTeamMode={finalScoreData.is_team_mode}
        teamName={finalScoreData.team_name}
        teamScores={finalScoreData.team_scores || { blue: 0, red: 0 }}  // Add default value
      />
    );
  }

    // Add condition for GuessANumberPlacement
    if (showGuessPlacement && guessPlacementData) {
      return <GuessANumberPlacement 
        points_earned={pointsEarned}
        total_points={totalPoints}
        placement={guessPlacementData.placement}
        totalPlayers={guessPlacementData.totalPlayers}
        accuracy={guessPlacementData.accuracy}
        yourGuess={guessPlacementData.yourGuess}
        correctAnswer={guessPlacementData.correctAnswer}
      />;
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
      return null;
    }
    
    // Get the current question's type
    const questionType = question?.type;
    
    switch (questionType) {
      case 'TRUE_FALSE':
        return <TrueFalseQuizMobile onAnswer={handleAnswer} />;
      case 'ABCD':
        return <ABCDQuizMobile onAnswer={handleAnswer} />;
      case 'OPEN_ANSWER':
        return <OpenAnswerQuizMobile onAnswer={handleOpenAnswer} />;
      case 'GUESS_A_NUMBER':
        // Different components based on player role and phase
        if (playerRole === 'captain' && quizPhase === 1) {
          return <TeamCaptainGuessNumberMobile 
            onAnswer={handleCaptainChoice} 
            teamName={teamName} 
          />;
        } else if (playerRole === 'voter' && quizPhase === 2) {
          return <MoreLessVoteMobile 
            onAnswer={handleMoreLessVote}
            firstTeamAnswer={firstTeamAnswer}
          />;
        } else {
          return <GuessANumberQuizMobile onAnswer={handleNumberGuess} />;
        }
      default:
        console.warn('Unknown question type:', questionType); // Debug log
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