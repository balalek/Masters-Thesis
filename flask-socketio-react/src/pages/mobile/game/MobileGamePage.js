import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSocket } from '../../../utils/socket';

const MobileGamePage = () => {
  const location = useLocation();
  const [question, setQuestion] = useState({
    options: ["Option 1", "Option 2", "Option 3", "Option 4"]
  });
  const [loading, setLoading] = useState(false);
  const playerName = location.state?.playerName || 'Unknown Player';

  useEffect(() => {
    const socket = getSocket();

    socket.on('next_question', (data) => {
      console.log('next_question event received in MobileGamePage:', data); // Debugging log
      setQuestion(data.question);
      setLoading(false);
    });

    return () => {
      socket.off('next_question');
    };
  }, []);

  const handleAnswer = (index) => {
    const socket = getSocket();
    console.log('Submitting answer:', { player_name: playerName, answer: index }); // Debugging log
    socket.emit('submit_answer', { player_name: playerName, answer: index });
    setLoading(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      {question.options.map((option, index) => (
        <button
          key={index}
          onClick={() => handleAnswer(index)}
          style={{
            width: '80%',
            height: '20%',
            fontSize: '1.5em',
            margin: '10px',
            backgroundColor: '#f0f0f0',
            border: '2px solid #ccc',
            borderRadius: '10px',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default MobileGamePage;