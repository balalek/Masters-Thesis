import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const isLastQuestion = location.state?.isLastQuestion || false;

  

  const handleNextQuestion = () => {
    fetch('http://localhost:5000/next_question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.question) {
            console.log('ScorePage loaded with isLastQuestion:', data.is_last_question);
            navigate('/game', { state: { question: data.question, is_last_question: data.is_last_question } });
        } else {
          console.error(data.error);
        }
      })
      .catch((error) => {
        console.error('Error fetching next question:', error);
      });
  };

  const handleCloseQuiz = () => {
    fetch('http://localhost:5000/reset_game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data.message);
        navigate('/');
      })
      .catch((error) => console.error('Error resetting game:', error));
  };

  return (
    <div>
      <h1>Scores</h1>
      <ul>
        {Object.entries(scores).map(([player, score]) => (
          <li key={player}>
            {player}: {score}
          </li>
        ))}
      </ul>
      {isLastQuestion ? (
        <button onClick={handleCloseQuiz}>Close Quiz</button>
      ) : (
        <button onClick={handleNextQuestion}>Next Question</button>
      )}
    </div>
  );
};

export default ScorePage;