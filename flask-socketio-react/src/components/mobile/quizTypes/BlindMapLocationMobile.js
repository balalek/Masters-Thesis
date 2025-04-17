import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Alert, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import czMapImage from '../../../assets/maps/cz.png';
import europeMapImage from '../../../assets/maps/europe.png';
import { getSocket } from '../../../utils/socket';

const BlindMapLocationMobile = ({ onAnswer, cityName, mapType = 'cz', questionId, isCaptain = false, teamName }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('info');
  const [submitted, setSubmitted] = useState(false);
  const [teamGuesses, setTeamGuesses] = useState([]);
  const mapContainerRef = useRef(null);
  const socket = getSocket();
  
  useEffect(() => {
    socket.on('blind_map_feedback', (data) => {
      setFeedback(data.message);
      setFeedbackSeverity(data.severity);
      
      if (data.severity === 'success') {
        setSubmitted(true);
      } else {
        // Clear feedback after a timeout
        setTimeout(() => {
          setFeedback('');
        }, 3000);
      }
    });

    socket.on('blind_map_location_submitted', (data) => {
      if (data.team === teamName) {
        setTeamGuesses(prev => [...prev, data.guess]);
      }
    });
    
    return () => {
      socket.off('blind_map_feedback');
      socket.off('blind_map_location_submitted');
    };
  }, [socket, teamName]);
  
  // Helper function to get the current map image
  const getMapImage = () => {
    return mapType === 'cz' ? czMapImage : europeMapImage;
  };
  
  const handleMapClick = (e) => {
    if (mapContainerRef.current && !submitted) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      setSelectedLocation({ x, y });
      
      // If captain, emit preview location
      if (isCaptain) {
        socket.emit('captain_location_preview', {
          x: x,
          y: y,
          team: teamName
        });
      }
    }
  };
  
  const handleSubmit = () => {
    if (!selectedLocation || submitted) return;
    
    onAnswer({
      x: selectedLocation.x,
      y: selectedLocation.y,
      questionId
    });
  };
  
  if (submitted) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        width: '100%',
        p: 2,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            maxWidth: '90%',
            backgroundColor: '#4CAF50',
            color: 'white'
          }}
        >
          <Typography variant="h4" sx={{ mb: 2 }}>
            Odpověď odeslána
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Čekej na další otázku...
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        width: '100%',
        p: 0
      }}
    >
      {/* Top instruction area */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        textAlign: 'center'
      }}>
        <Box sx={{ fontSize: '1.25rem', fontWeight: 'medium' }}>
          {cityName}
        </Box>
        <Box sx={{ fontSize: '1rem', mt: 0.5 }}>
          {isCaptain 
            ? "Kapitáne, označ finální místo na mapě" 
            : "Označ polohu na mapě"}
        </Box>
      </Box>
      
      {/* Feedback message area */}
      <Box sx={{ 
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {feedback ? (
          <Alert 
            severity={feedbackSeverity} 
            sx={{ 
              width: '100%',
              borderRadius: 0,
              fontSize: '1.1rem',
              py: 1.5
            }}
          >
            {feedback}
          </Alert>
        ) : (
          <Box sx={{ height: '60px' }} />
        )}
      </Box>
      
      {/* Map container - scrollable */}
      <Box 
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          p: 1,
          pb: 8, // Add padding at bottom to prevent map content from being hidden behind the fixed button
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Map with position selection */}
        <Box
          ref={mapContainerRef}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: '600px'
          }}
          onClick={handleMapClick}
        >
          <Box
            component="img"
            src={getMapImage()}
            alt={mapType === 'cz' ? 'Mapa České republiky' : 'Mapa Evropy'}
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: 2,
              boxShadow: 2
            }}
          />
          
          {/* Team guesses */}
          {teamGuesses.map((guess, index) => (
            <Box
              key={`team-${index}`}
              sx={{
                position: 'absolute',
                left: `${guess.x * 100}%`,
                top: `${guess.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '15px',
                height: '15px',
                bgcolor: teamName === 'blue' ? '#186CF6' : '#EF4444',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                zIndex: 9,
                opacity: 0.8,
                '&:hover::after': {
                  content: `"${guess.playerName}"`,
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }
              }}
            />
          ))}
          
          {/* Selected location marker */}
          {selectedLocation && (
            <Box
              sx={{
                position: 'absolute',
                left: `${selectedLocation.x * 100}%`,
                top: `${selectedLocation.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                bgcolor: teamName === 'blue' ? '#186CF6' : '#EF4444',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                zIndex: 10
              }}
            />
          )}
        </Box>
      </Box>
      
      {/* Submit button - fixed at bottom */}
      <Box sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        p: 2,
        boxShadow: '0px -2px 4px rgba(0,0,0,0.1)', // Add a small shadow for visual separation
        zIndex: 1000 // High z-index to ensure it stays on top
      }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={!selectedLocation}
          endIcon={<SendIcon />}
          onClick={handleSubmit}
          sx={{
            py: 2,
            fontSize: '1.2rem'
          }}
        >
          Odpovědět
        </Button>
      </Box>
    </Box>
  );
};

export default BlindMapLocationMobile;
