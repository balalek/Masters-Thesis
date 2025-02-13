import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';
import ABCDQuiz from '../../../components/desktop/quizTypes/ABCDQuiz';
import TrueFalseQuiz from '../../../components/desktop/quizTypes/TrueFalseQuiz';
import QuestionPreview from '../../../components/desktop/QuestionPreview';

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [answersCount, setAnswersCount] = useState(0);
  const [question, setQuestion] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(true);
  const { showGameAt } = location.state || {};

  useEffect(() => {
    const socket = getSocket();

    socket.on('all_answers_received', (data) => {
      console.log('Current question state:', {
        question,
        isLastQuestion,
        nextData: data
      });
      
      navigate('/scores', { 
        state: { 
          scores: data.scores, 
          correctAnswer: data.correct_answer, 
          answerCounts: data.answer_counts, 
          isLastQuestion: isLastQuestion,  // This might be wrong
          question: question,
          showQuestionPreviewAt: data.show_question_preview_at 
        } 
      });
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

  useEffect(() => {
    if (location.state) {
      console.log('GamePage received state:', location.state);
    }
  }, [location.state]);

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