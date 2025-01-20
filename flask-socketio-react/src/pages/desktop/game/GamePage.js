import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on('all_answers_received', (data) => {
      // Navigate to score page with scores and isLastQuestion
      console.log('all_answers_received event received in GamePage:', data);
      console.log('Navigating to scores with isLastQuestion:', isLastQuestion);
      navigate('/scores', { state: { scores: data.scores, isLastQuestion: isLastQuestion } });
    });

    return () => {
      socket.off('all_answers_received');
    };
  }, [navigate, isLastQuestion]);

  useEffect(() => {
    if (location.state && location.state.question) {
      console.log('Setting question from location state:', location.state.question);
      setQuestion(location.state.question);
      setIsLastQuestion(location.state.is_last_question);
    }
  }, [location.state]);

  if (!question) return <div>Loading...</div>;

  return (
    <div>
      <h1>{question.question}</h1>
      <div>
        {question.options.map((option, index) => (
          <div key={index} style={{ border: '1px solid black', padding: '20px', margin: '10px' }}>
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GamePage;