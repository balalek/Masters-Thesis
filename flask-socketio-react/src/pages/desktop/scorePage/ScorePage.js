import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';
import { getSocket } from '../../../utils/socket';

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const correctAnswer = location.state?.correctAnswer;
  const answerCounts = location.state?.answerCounts || [0, 0, 0, 0];
  const isLastQuestion = location.state?.isLastQuestion || false;
  const question = location.state?.question || { options: ["Option 1", "Option 2", "Option 3", "Option 4"] };

  const [scrollPosition, setScrollPosition] = useState(0);
  const leaderboardRef = useRef(null);

  useEffect(() => {
    if (!leaderboardRef.current) return;

    const scrollHeight = leaderboardRef.current.scrollHeight;
    const clientHeight = leaderboardRef.current.clientHeight;
    
    if (scrollHeight > clientHeight) {
      const scroll = setInterval(() => {
        if (scrollPosition >= scrollHeight - clientHeight) {
          setScrollPosition(0);
        } else {
          setScrollPosition(prev => prev + 1);
        }
        leaderboardRef.current.scrollTop = scrollPosition;
      }, 50);

      return () => clearInterval(scroll);
    }
  }, [scrollPosition, scores]);

  const handleNextQuestion = () => {
    fetch(`http://${window.location.hostname}:5000/next_question`, {
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
    fetch(`http://${window.location.hostname}:5000/reset_game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        navigate('/');
      })
      .catch((error) => {
        console.error('Error resetting game:', error);
      });
  };

  const renderLeaderboard = () => {
    const sortedPlayers = Object.entries(scores)
      .sort(([,a], [,b]) => b.score - a.score);
    
    const maxScore = Math.max(1, ...sortedPlayers.map(([,data]) => data.score));

    return (
      <Container sx={{ 
        border: '2px solid grey',
        borderRadius: 2,
        padding: 2,
        width: '100% !important',
        maxWidth: 'none !important',
        height: '100%', // Make container fill available height
        display: 'flex', // Add flex display
        flexDirection: 'column', // Stack children vertically
      }} ref={leaderboardRef}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1.5,
          flex: 1, // Allow this box to grow
          overflow: 'auto' // Add scroll if content overflows
        }}>
          {sortedPlayers.map(([playerName, data], index) => (
            <Box 
              key={playerName} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                padding: 0.5
              }}
            >
              <Typography sx={{ minWidth: '200px', fontWeight: 'bold', fontSize: '1.5em' }}>{playerName}</Typography>
              <Box sx={{ 
                flex: 1,
                display: 'flex' // Add display flex
              }}>
                <Box 
                  sx={{ 
                    height: '30px',
                    backgroundColor: data.color,
                    borderRadius: 1,
                    width: `${Math.max(5, (data.score / maxScore) * 100)}%` // This will now work correctly
                  }} 
                />
              </Box>
              <Typography 
                sx={{ 
                  minWidth: '80px', 
                  textAlign: 'right',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  fontSize: '1.5em'
                }}
              >
                {data.score}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh', // Full viewport height
      padding: 2,
      gap: 3 // Consistent spacing between elements
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative' // For absolute positioned button
      }}>
        <Typography variant="h4" component="h1">
          Výsledky kola
        </Typography>
        <Button
          variant="contained"
          onClick={isLastQuestion ? handleCloseQuiz : handleNextQuestion}
          sx={{ position: 'absolute', right: 0 }}
        >
          {isLastQuestion ? 'Close Quiz' : 'Další kolo'}
        </Button>
      </Box>

      {/* Leaderboard container */}
      <Box sx={{ 
        flex: 1, // Take all available space
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0, // Allow container to shrink below content size
      }}>
        {renderLeaderboard()}
      </Box>

      {/* Answer buttons at bottom */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: 2
      }}>
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#14A64A',
            color: 'white',
            flex: '1 1 45%',
            height: '150px',
            fontSize: '2.5em',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: 2,
            paddingRight: 2,
            textTransform: 'none',
            opacity: correctAnswer === 0 ? 1 : 0.4
          }}
          startIcon={<StarIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
          >
            <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
              {question.options[0]}
            </Typography>
            <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
              {answerCounts[0]}×
            </Typography>
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#186CF6',
              color: 'white',
              flex: '1 1 45%',
              height: '150px',
              fontSize: '2.5em',
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingLeft: 2,
              paddingRight: 2,
              textTransform: 'none',
              opacity: correctAnswer === 1 ? 1 : 0.4
            }}
            startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
          >
            <Typography sx={{ fontSize: '0.92em', textAlign: 'left', flexGrow: 1, padding: 1, lineHeight: 1.2 }}>
              {question.options[1]}
            </Typography>
            <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
              {answerCounts[1]}×
            </Typography>
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#EF4444',
              color: 'white',
              flex: '1 1 45%',
              height: '150px',
              fontSize: '2.5em',
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingLeft: 2,
              paddingRight: 2,
              textTransform: 'none',
              opacity: correctAnswer === 2 ? 1 : 0.4
            }}
            startIcon={<PentagonIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
          >
            <Typography sx={{ fontSize: '0.92em', textAlign: 'left', flexGrow: 1, padding: 1, lineHeight: 1.2 }}>
              {question.options[2]}
            </Typography>
            <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
              {answerCounts[2]}×
            </Typography>
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#EAB308',
              color: 'white',
              flex: '1 1 45%',
              height: '150px',
              fontSize: '2.5em',
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingLeft: 2,
              paddingRight: 2,
              textTransform: 'none',
              opacity: correctAnswer === 3 ? 1 : 0.4
            }}
            startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
          >
            <Typography sx={{ fontSize: '0.92em', textAlign: 'left', flexGrow: 1, padding: 1, lineHeight: 1.2 }}>
              {question.options[3]}
            </Typography>
            <Typography sx={{ fontSize: '1.5em', color: 'white' }}>
              {answerCounts[3]}×
            </Typography>
          </Button>
      </Box>
    </Box>
  );
};

export default ScorePage;