import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket, getServerTime } from '../../../utils/socket';
import ABCDQuiz from '../../../components/desktop/quizTypes/ABCDQuiz';
import TrueFalseQuiz from '../../../components/desktop/quizTypes/TrueFalseQuiz';
import QuestionPreview from '../../../components/desktop/miscellaneous/QuestionPreview';
import OpenAnswerQuiz from '../../../components/desktop/quizTypes/OpenAnswerQuiz';
import GuessANumberQuiz from '../../../components/desktop/quizTypes/GuessANumberQuiz';
import DrawingQuiz from '../../../components/desktop/quizTypes/DrawingQuiz';
import WordChainQuiz from '../../../components/desktop/quizTypes/WordChainQuiz';
import MathQuiz from '../../../components/desktop/quizTypes/MathQuiz';
import BlindMapQuiz from '../../../components/desktop/quizTypes/BlindMapQuiz';

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [answersCount, setAnswersCount] = useState(0);
  const [question, setQuestion] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(location.state?.is_last_question || false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(true);
  const { showGameAt } = location.state || {};
  const activeTeam = location.state?.activeTeam;
  const isTeamModeBlindMap = location.state?.blind_map_is_team_play || false;
    
  useEffect(() => {
    const socket = getSocket();

    socket.on('all_answers_received', (data) => {
      console.log('Received all_answers_received data:', data);
      
      // Create navigation state with the question's existing type
      const navigationState = {
        scores: data.scores,
        correctAnswer: data.correct_answer,
        question: question, // Use the existing question object with its type
        isLastQuestion: isLastQuestion,
        showQuestionPreviewAt: data.show_question_preview_at,
        isRemote: data.is_remote
      };
      
      // Add the appropriate data based on question type in navigationState
      if (question?.type === 'OPEN_ANSWER') {
        navigationState.question.playerAnswers = data.player_answers || [];
      } else if (question?.type === 'DRAWING') {
        navigationState.question.playerAnswers = data.player_answers || [];
        navigationState.question.drawer = data.drawer || question.player;
      } else if (question?.type === 'GUESS_A_NUMBER') {
        navigationState.question.playerGuesses = data.playerGuesses || [];
        navigationState.question.teamMode = data.teamMode || false;
        navigationState.question.firstTeamAnswer = data.firstTeamAnswer || null;
        navigationState.question.secondTeamVote = data.secondTeamVote || null;
      } else if (question?.type === 'WORD_CHAIN') {
        navigationState.question.word_chain = data.word_chain || [];
        navigationState.question.eliminated_players = data.eliminated_players || [];
        navigationState.question.last_player = data.last_player || question.current_player;
        // Team mode specific data
        navigationState.question.winning_team = data.winning_team;
        navigationState.question.exploded_team = data.exploded_team;
        navigationState.question.exploded_player = data.exploded_player;
      } else if (question?.type === 'MATH_QUIZ') {
        // Add math quiz specific data from server response
        navigationState.question.sequences = data.sequences || [];
        navigationState.question.player_answers = data.player_answers || {};
        navigationState.question.eliminated_players = data.eliminated_players || [];
      }
      else if (question?.type === 'BLIND_MAP') {
        navigationState.question.team_guesses = data.team_guesses || {};
        navigationState.question.captain_guesses = data.captain_guesses || {};
        navigationState.question.player_locations = data.player_locations || [];
        navigationState.question.winning_team = data.winning_team || null;
        navigationState.question.is_team_mode = data.scores.is_team_mode || false;
      } else {
        navigationState.answerCounts = data.answer_counts;
      }

      // Debug log to check what we're passing to ScorePage
      console.log('Navigating to ScorePage with data:', navigationState);
      
      // Navigate to scores page with appropriate data
      navigate('/scores', { state: navigationState });
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
    const socket = getSocket();

    socket.on('game_reset', (data) => {
      navigate(data.was_remote ? '/remote' : '/');
    });

    return () => {
      socket.off('game_reset');
    };
  }, [navigate]);

  useEffect(() => {
    if (location.state && location.state.question) {
      console.log('Setting question from location state:', location.state.question);
      setQuestion(location.state.question);
      setIsLastQuestion(location.state.is_last_question);
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state) {
      console.log('GamePage received state:', location.state);
    }
  }, [location.state]);

  useEffect(() => {
    // First check if the question is not null, if yes, then wait for question to be set
    if (question && location.state?.question_end_time && 
      (question.type !== 'GUESS_A_NUMBER' || activeTeam === null) &&
      (question.type !== 'WORD_CHAIN' || question.is_team_mode) &&
      (question.type !== 'MATH_QUIZ') &&
      (question.type !== 'BLIND_MAP')) {
      console.log('Hello? question type:', question?.type);
      const timer = setTimeout(() => {
        const socket = getSocket();
        socket.emit('time_up');  // Emit time_up when timer ends
      }, location.state.question_end_time - getServerTime());

      return () => clearTimeout(timer);
    }
  }, [location.state?.question_end_time, question, activeTeam]);

  if (showQuestionPreview) {
    return (
      <QuestionPreview 
        question={question?.question} 
        onPreviewComplete={() => setShowQuestionPreview(false)} 
        showAt={showGameAt}
      />
    );
  }

  if (!question) return <div>Chybička se vloudila...</div>;

  const renderQuizType = () => {
    if (!question) return null;
    
    switch (question.type) {
      case 'TRUE_FALSE':
        return <TrueFalseQuiz 
          question={question} 
          answersCount={answersCount}
          question_end_time={location.state?.question_end_time}
        />;
      case 'OPEN_ANSWER':
        return <OpenAnswerQuiz 
          question={question} 
          question_end_time={location.state?.question_end_time}
        />;
      case 'GUESS_A_NUMBER':
        return <GuessANumberQuiz 
          activeTeam={activeTeam}
          question={question} 
          question_end_time={location.state?.question_end_time}
        />;
      case 'ABCD':
        return <ABCDQuiz 
          question={question} 
          answersCount={answersCount}
          question_end_time={location.state?.question_end_time}
        />;
      case 'DRAWING':
        return <DrawingQuiz 
          question={question} 
          question_end_time={location.state?.question_end_time}
        />;
      case 'WORD_CHAIN':
        return <WordChainQuiz 
          question={question} 
          question_end_time={location.state?.question_end_time}
        />;
      case 'MATH_QUIZ':
        return <MathQuiz 
          question={question} 
          question_end_time={location.state?.question_end_time}
        />;
      case 'BLIND_MAP':
        return <BlindMapQuiz 
          question={question} 
          question_end_time={location.state?.question_end_time}
          isTeamMode={isTeamModeBlindMap}
        />;
      default:
        console.error('Unknown question type:', question.type);
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  return renderQuizType();
}

export default GamePage;