import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container } from '@mui/material';
import { getSocket } from '../../../utils/socket';
import ABCDAnswers from '../../../components/desktop/answerTypes/ABCDAnswers';
import TrueFalseAnswers from '../../../components/desktop/answerTypes/TrueFalseAnswers';

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scores = location.state?.scores || {};
  const correctAnswer = location.state?.correctAnswer;
  const answerCounts = location.state?.answerCounts || [0, 0, 0, 0];
  const isLastQuestion = location.state?.isLastQuestion || false;
  const question = location.state?.question || { options: ["Option 1", "Option 2", "Option 3", "Option 4"] };
  const scrollableRef = useRef(null);
  const [countdown, setCountdown] = useState(null);
  const socket = getSocket();
  
  // Modified auto-scroll effect
  useEffect(() => {
    const scrollContainer = scrollableRef.current;
    if (!scrollContainer) return;

    const duration = 3000; // 3 seconds for scrolling down
    let animationFrameId;
    
    const scroll = () => {
      let startTime = null;
      
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        
        if (progress < duration) {
          // Smooth scroll down
          const currentScroll = (progress / duration) * maxScroll;
          scrollContainer.scrollTop = currentScroll;
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Smooth scroll back to top over 1 second
          const scrollToTop = () => {
            const startPosition = scrollContainer.scrollTop;
            const startTime = Date.now();
            const duration = 1000; // 1 second to scroll back up

            const animateToTop = () => {
              const currentTime = Date.now();
              const progress = (currentTime - startTime) / duration;

              if (progress < 1) {
                scrollContainer.scrollTop = startPosition * (1 - progress);
                requestAnimationFrame(animateToTop);
              } else {
                scrollContainer.scrollTop = 0;
              }
            };

            requestAnimationFrame(animateToTop);
          };

          scrollToTop();
        }
      };
      
      animationFrameId = requestAnimationFrame(animate);
    };

    scroll(); // Start the initial scroll

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [scores]); // Re-run when scores change

  // Modify the countdown effect
  useEffect(() => {
    if (isLastQuestion) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Wrap both actions in a single requestAnimationFrame to batch them
            requestAnimationFrame(() => {
              socket.emit('show_final_score');
              navigate('/final-score', { 
                state: { 
                  scores: scores,
                  correctAnswer: correctAnswer,
                  question: question 
                } 
              });
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLastQuestion]);

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // Hide overflow at container level
      }}>
        <Box 
          ref={scrollableRef}
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1.5,
            overflowY: 'auto', // Enable vertical scrolling
            flex: 1,
            pr: 3,  // Add padding to the right to shift scrollbar
            mr: -1, // Negative margin to compensate for padding
            ml: -2, // Negative margin to compensate for padding
            scrollBehavior: 'smooth', // Add smooth scrolling
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            }
          }}
        >
          {sortedPlayers.map(([playerName, data], index) => (
            <Box 
              key={playerName} 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: '40px 250px 1fr 80px', // Fixed column widths
                gap: 2,
                alignItems: 'center',
                padding: '4px 0'
              }}
            >
              {/* Placement number */}
              <Typography sx={{ 
                fontSize: '1.5em',
                fontWeight: 'bold',
                color: 'grey.500',
                textAlign: 'right'
              }}>
                {index + 1}.
              </Typography>

              {/* Player name */}
              <Typography sx={{ 
                fontWeight: 'bold', 
                fontSize: '1.5em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingRight: 2,
                textAlign: 'left',
                width: '100%'
              }}>
                {playerName}
              </Typography>

              {/* Score bar container */}
              <Box sx={{ 
                position: 'relative',
                height: '30px'
              }}>
                <Box 
                  sx={{ 
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    backgroundColor: data.color,
                    borderRadius: 1,
                    width: `${Math.max(5, (data.score / maxScore) * 100)}%`
                  }} 
                />
              </Box>

              {/* Score number */}
              <Typography 
                sx={{ 
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

  const renderAnswers = () => {
    switch (question?.type) {
      case 'TRUE_FALSE':
        return <TrueFalseAnswers 
          question={question} 
          correctAnswer={correctAnswer} 
          answerCounts={answerCounts} 
        />;
      case 'ABCD':
      default:
        return <ABCDAnswers 
          question={question} 
          correctAnswer={correctAnswer} 
          answerCounts={answerCounts} 
        />;
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      padding: 2,
      gap: 3
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative'
      }}>
        <Typography variant="h4" component="h1">
          {isLastQuestion ? 'Poslední kolo dokončeno' : 'Výsledky kola'}
        </Typography>
        {!countdown && (  // Only show button when not counting down
          <Button
            variant="contained"
            onClick={isLastQuestion ? handleCloseQuiz : handleNextQuestion}
            sx={{ position: 'absolute', right: 0 }}
          >
            {isLastQuestion ? 'Ukončit kvíz' : 'Další kolo'}
          </Button>
        )}
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLastQuestion && countdown ? (
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Typography variant="h2" sx={{ textAlign: 'center' }}>
              Finální žebříček se zobrazí za {countdown}
            </Typography>
          </Box>
        ) : (
          renderLeaderboard()
        )}
      </Box>

      {/* Answer buttons - now rendered based on question type */}
      {renderAnswers()}
    </Box>
  );
};

export default ScorePage;