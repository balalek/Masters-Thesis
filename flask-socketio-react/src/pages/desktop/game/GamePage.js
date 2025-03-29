import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket, getServerTime } from '../../../utils/socket';
import ABCDQuiz from '../../../components/desktop/quizTypes/ABCDQuiz';
import TrueFalseQuiz from '../../../components/desktop/quizTypes/TrueFalseQuiz';
import QuestionPreview from '../../../components/desktop/QuestionPreview';
import OpenAnswerQuiz from '../../../components/desktop/quizTypes/OpenAnswerQuiz';
import GuessANumberQuiz from '../../../components/desktop/quizTypes/GuessANumberQuiz';

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [answersCount, setAnswersCount] = useState(0);
  const [question, setQuestion] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(true);
  const { showGameAt } = location.state || {};
  const activeTeam = location.state?.activeTeam;

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
      
      // Add the appropriate data based on question type
      if (question?.type === 'OPEN_ANSWER') {
        navigationState.question.playerAnswers = data.player_answers || [];
      } else {
        navigationState.answerCounts = data.answer_counts;
      }
      
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
      (question.type !== 'GUESS_A_NUMBER' || activeTeam === null)) {
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
      default:
        console.error('Unknown question type:', question.type);
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  return renderQuizType();
}

export default GamePage;