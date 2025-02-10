import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import ABCDQuiz from '../../../components/desktop/quizTypes/ABCDQuiz';
import TrueFalseQuiz from '../../../components/desktop/quizTypes/TrueFalseQuiz';

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

  const renderQuizType = () => {
    switch (question?.type) {
      case 'TRUE_FALSE':
        return <TrueFalseQuiz question={question} answersCount={answersCount} />;
      case 'ABCD':
      default:
        return <ABCDQuiz question={question} answersCount={answersCount} />;
    }
  };

  return renderQuizType();
}

export default GamePage;