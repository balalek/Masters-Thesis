import React from 'react';
import { useNavigate } from 'react-router-dom';

const DesktopHomePage = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate('/room');
  };

  return (
    <div>
      <h1>Welcome to the Quiz Game!</h1>
      <button onClick={handleStartGame}>Go to Room</button>
    </div>
  );
};

export default DesktopHomePage;