/**
 * @fileoverview Blind Map Result component for displaying map quiz results in score page
 * 
 * This module provides:
 * - Visualization of player/team guess locations on a map
 * - Display of the correct location with appropriate radius circle
 * - Support for both Czech Republic and Europe maps
 * - Team-specific styling for guesses in team mode
 * - Special indicators for team captains
 * 
 * @module Components/Desktop/AnswerTypes/BlindMapResult
 */
import React from 'react';
import { Box } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import czMapImage from '../../../assets/maps/cz.png';
import europeMapImage from '../../../assets/maps/europe.png';

/**
 * Blind Map Result component for displaying geography quiz results
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.question - Question data including location coordinates and map type
 * @param {Object} props.team_guesses - Team guesses with player locations
 * @param {Object} props.captain_guesses - Guesses from team captains
 * @param {Array} props.player_locations - Individual player guess locations
 * @param {boolean} props.is_team_mode - Whether the game is in team mode
 * @returns {JSX.Element} The rendered blind map result component
 */
const BlindMapResult = ({ question, team_guesses, captain_guesses, player_locations, is_team_mode }) => {

  const map_type = question?.map_type || 'cz';

  let correct_location;
  const radius_preset = question?.radius_preset || 'EASY'; // Default to EASY if not provided

  if (question?.location_x !== undefined && question?.location_y !== undefined) {
    correct_location = { x: question.location_x, y: question.location_y };
  }

  return (
    <Box sx={{ width: '100%', px: 2 }}>
      
      {/* Map container */}
      <Box sx={{ 
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        overflow: 'hidden',
        marginBottom: 0
      }}>
        {/* Wrapper for map and pins */}
        <Box sx={{
          position: 'relative',
          transform: map_type === 'europe' ? 'scale(0.7)' : 'none',
          transformOrigin: 'bottom center',
          marginTop: map_type === 'europe' ? '-30%' : 0,
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
              display: 'block'
            }}
          />

          {/* Exact location marker and radius circle */}
          <Box
            sx={{
              position: 'absolute',
              left: `${correct_location.x * 100}%`,
              top: `${correct_location.y * 101}%`,
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

          {/* Team guesses */}
          {is_team_mode && Object.entries(team_guesses || {}).map(([team, guesses]) => {
            
            // Identify captain's playerName to filter it out from team guesses
            const captainName = captain_guesses && captain_guesses[team] ? captain_guesses[team].playerName : null;
            
            return Array.isArray(guesses) && guesses.map((guess, index) => {
              
              // Skip rendering this guess if it belongs to the captain (to avoid duplicate dots)
              if (captainName && guess.playerName === captainName) {
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
                    width: '20px',
                    height: '20px',
                    bgcolor: team === 'blue' ? '#186CF6' : '#EF4444',
                    borderRadius: '50%',
                    border: `2px solid white`,
                    boxShadow: '0 0 8px rgba(0,0,0,0.7)',
                    zIndex: 15,
                    opacity: 1,
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

          {/* Individual player guesses */}
          {!is_team_mode && Array.isArray(player_locations) && player_locations.map((location, index) => 
            location && typeof location.x === 'number' && typeof location.y === 'number' && (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  left: `${location.x * 100}%`,
                  top: `${location.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '20px',
                  height: '20px',
                  bgcolor: location.color || 'gray',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 8px rgba(0,0,0,0.7)',
                  zIndex: 15,
                  opacity: 1,
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
                  zIndex: 25,
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