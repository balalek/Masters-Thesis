import React, { useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import StarIcon from '@mui/icons-material/Star'; // Import a star icon for captain
import czMapImage from '../../../assets/maps/cz.png';
import europeMapImage from '../../../assets/maps/europe.png';
import { QUIZ_VALIDATION } from '../../../constants/quizValidation';

const BlindMapResult = ({ question, team_guesses, captain_guesses, player_locations, is_team_mode, winning_team }) => {
  // Add more detailed debug logging
  useEffect(() => {
    console.log('BlindMapResult FULL PROPS:', { question, team_guesses, captain_guesses, player_locations, is_team_mode, winning_team });
    console.log('Receiving team mode?', is_team_mode);
    console.log('Team guesses from props:', team_guesses);
    console.log('Team guesses from results:', question?.blind_map_state?.results?.team_guesses);
  }, [question, team_guesses, captain_guesses, player_locations, winning_team]);
  
  // Extract data with proper fallbacks for nested properties
  const city_name = question?.city_name || 'Neznámé město';
  const map_type = question?.map_type || 'cz';
  
  // First check if the data is in the blind_map_state.results
  let correct_location;
  let blind_map_data = question?.blind_map_state?.results || {};
  const radius_preset = question?.radius_preset || 'EASY'; // Default to EASY if not provided

  if (question?.location_x !== undefined && question?.location_y !== undefined) {
    // Fallback to question data
    correct_location = { x: question.location_x, y: question.location_y };
  }

  // Log the extracted location for debugging
  console.log('Using correct_location:', correct_location);
  
  // Log all available data sources for team information
  console.log('TEAM DATA SOURCES:');
  console.log('- is_team_mode from blind_map_data:', is_team_mode);
  console.log('- team_guesses prop:', team_guesses);
  console.log('- team_guesses from blind_map_data:', blind_map_data?.team_guesses);
  console.log('- captain_guesses prop:', captain_guesses);
  console.log('- captain_guesses from blind_map_data:', blind_map_data?.captain_guesses);

  // Add debug logs to check what data we're receiving
  console.log('Player locations:', player_locations);

  return (
    <Box sx={{ width: '100%', px: 2 }}>
      
      {/* Map container */}
      <Box sx={{ 
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        overflow: 'hidden',
        // Remove negative bottom margin - this was making the leaderboard too big
        marginBottom: 0
      }}>
        {/* Wrapper for map and pins */}
        <Box sx={{
          position: 'relative',
          transform: map_type === 'europe' ? 'scale(0.7)' : 'none',
          transformOrigin: 'bottom center',
          // Use a more moderate negative margin - just enough to remove empty space
          marginTop: map_type === 'europe' ? '-30%' : 0,
          // Keep inline-block to wrap content
          display: 'inline-block',
          width: '100%'
        }}>
          {/* Map image */}
          <Box
            component="img"
            src={map_type === 'cz' ? czMapImage : europeMapImage}
            alt={map_type === 'cz' ? 'Mapa České republiky' : 'Mapa Evropy'}
            sx={{ 
              width: '100%', 
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 2,
              boxShadow: 3,
              display: 'block' // Ensures no extra space below the image
            }}
          />

          {/* Exact location marker and radius circle */}
          <Box
            sx={{
              position: 'absolute',
              left: `${correct_location.x * 100}%`,
              top: `${correct_location.y * 101}%`, // Keep the y-adjustment of 101%
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Exact radius circle - using different pixel values based on preset */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: radius_preset === 'EASY' ? '50px' : '40px',  // 50px for EASY, 40px for HARD
                height: radius_preset === 'EASY' ? '50px' : '40px', // 50px for EASY, 40px for HARD
                borderRadius: '50%',
                bgcolor: 'rgba(76, 175, 80, 0.3)',
                border: '2px solid rgba(76, 175, 80, 0.7)',
                zIndex: 8,
                pointerEvents: 'none'
              }}
            />
          </Box>

          {/* Team guesses - also enhance visibility similarly */}
          {is_team_mode && Object.entries(team_guesses || {}).map(([team, guesses]) => {
            console.log(`Rendering team ${team} guesses:`, guesses);
            console.log(`Is Array? ${Array.isArray(guesses)}, Length: ${guesses ? guesses.length : 0}`);
            
            // Identify captain's playerName to filter it out from team guesses
            const captainName = captain_guesses && captain_guesses[team] ? captain_guesses[team].playerName : null;
            
            return Array.isArray(guesses) && guesses.map((guess, index) => {
              console.log(`Guess ${index}:`, guess);
              console.log(`Has coordinates? x: ${guess?.x}, y: ${guess?.y}`);
              
              // Skip rendering this guess if it belongs to the captain (to avoid duplicate dots)
              if (captainName && guess.playerName === captainName) {
                console.log(`Skipping captain ${captainName}'s guess from team guesses`);
                return null;
              }
              
              return guess && typeof guess.x === 'number' && typeof guess.y === 'number' && (
                <Box
                  key={`${team}-${index}`}
                  sx={{
                    position: 'absolute',
                    left: `${guess.x * 100}%`,
                    top: `${guess.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '20px', // Increased from 15px
                    height: '20px', // Increased from 15px
                    bgcolor: team === 'blue' ? '#186CF6' : '#EF4444', // Use player color or fallback to team color
                    borderRadius: '50%',
                    border: `2px solid white`, // Team color border
                    boxShadow: '0 0 8px rgba(0,0,0,0.7)', // Enhanced shadow
                    zIndex: 15, // Increased z-index
                    opacity: 1, // Full opacity
                    // Add tooltip-like label with player name
                    '&:hover::after': {
                      content: `"${guess.playerName || team}"`,
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
              );
            });
          })}

          {/* Individual player guesses - enhanced visibility */}
          {!is_team_mode && Array.isArray(player_locations) && player_locations.map((location, index) => 
            location && typeof location.x === 'number' && typeof location.y === 'number' && (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  left: `${location.x * 100}%`,
                  top: `${location.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '20px', // Increased from 15px
                  height: '20px', // Increased from 15px
                  bgcolor: location.color || 'gray',
                  borderRadius: '50%',
                  border: '2px solid white', // Thicker border
                  boxShadow: '0 0 8px rgba(0,0,0,0.7)', // Enhanced shadow
                  zIndex: 15, // Higher z-index to ensure visibility
                  opacity: 1, // Full opacity instead of 0.7
                  // Add tooltip-like label with player name
                  '&:hover::after': {
                    content: `"${location.playerName || 'Player'}"`,
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
            )
          )}

          {/* Captain guesses - use star icon instead of bigger dot */}
          {is_team_mode && captain_guesses && Object.entries(captain_guesses || {}).map(([team, guess]) => {
            console.log(`Captain guess for team ${team}:`, guess);
            console.log(`Has valid coordinates? x: ${guess?.x}, y: ${guess?.y}`);
            
            return guess && typeof guess.x === 'number' && typeof guess.y === 'number' && (
              <Box
                key={`captain-${team}`}
                sx={{
                  position: 'absolute',
                  left: `${guess.x * 100}%`,
                  top: `${guess.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 25, // Higher z-index to stay on top
                  // Add tooltip-like label with player name
                  '&:hover::after': {
                    content: `"${team === 'blue' ? 'Modrý' : 'Červený'} kapitán"`,
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
              >
                <StarIcon 
                  sx={{ 
                    color: team === 'blue' ? '#186CF6' : '#EF4444',
                    fontSize: 26,
                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
                    stroke: 'white',
                    strokeWidth: 0.75
                  }} 
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default BlindMapResult;
