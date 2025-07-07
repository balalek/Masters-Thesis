/**
 * @fileoverview Team Map component for displaying team guesses on geographical maps
 * 
 * This module provides:
 * - Visual representation of team member guesses on maps
 * - Support for multiple map types (Czech Republic and Europe)
 * - Special indicators for team captain guesses
 * - Preview functionality for captain's current selection before submission
 * - Visual distinction between active and inactive teams
 * @author Bc. Martin Baláž
 * @module Components/Desktop/QuizTypes/TeamMap
 */
import React from 'react';
import { Box } from '@mui/material';
import czMapImage from '../../../assets/maps/cz.png';
import europeMapImage from '../../../assets/maps/europe.png';
import StarIcon from '@mui/icons-material/Star';

/**
 * Team Map component for displaying geographical guesses in team mode
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.mapType - Type of map to display ('cz' or 'europe')
 * @param {Object} props.teamGuesses - Team member guesses organized by team
 * @param {Object} props.captainGuesses - Captain's final guesses for each team
 * @param {Object} props.captainPreviews - Captain's current selection preview
 * @param {string} props.activeTeam - Currently active team ('blue' or 'red')
 * @returns {JSX.Element} The rendered team map component
 */
const TeamMap = ({ mapType = 'cz', teamGuesses = {}, captainGuesses = {}, captainPreviews = {}, activeTeam = 'blue' }) => {
  
  // Ensure teamGuesses is properly structured to avoid errors
  if (!teamGuesses || typeof teamGuesses !== 'object') {
    teamGuesses = { blue: [], red: [] };
  }
  
  // Ensure both teams are present in teamGuesses
  if (!teamGuesses.blue) teamGuesses.blue = [];
  if (!teamGuesses.red) teamGuesses.red = [];
  
  // Ensure captainGuesses is properly structured
  if (!captainGuesses || typeof captainGuesses !== 'object') {
    captainGuesses = {};
  }

  /**
   * Get the appropriate map image based on map type
   * 
   * @function getMapImage
   * @returns {string} URL of the map image to display
   */
  const getMapImage = () => {
    return mapType === 'cz' ? czMapImage : europeMapImage;
  };

  return (
    <Box sx={{ 
      position: 'relative',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Map image */}
      <Box
        component="img"
        src={getMapImage()}
        alt={mapType === 'cz' ? 'Mapa České republiky' : 'Mapa Evropy'}
        sx={{ 
          width: '100%', 
          height: 'auto',
          borderRadius: 2,
          boxShadow: 3
        }}
      />
      
      {/* Render both teams' guesses */}
      {Object.entries(teamGuesses).map(([team, guesses]) => 
        Array.isArray(guesses) && guesses.map((guess, index) => 
          guess && typeof guess.x === 'number' && typeof guess.y === 'number' && (
            <Box
              key={`${team}-${index}`}
              sx={{
                position: 'absolute',
                left: `${guess.x * 100}%`,
                top: `${guess.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '15px',
                height: '15px',
                bgcolor: team === 'blue' ? '#186CF6' : '#EF4444',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                zIndex: 9,
                opacity: team === activeTeam ? 1 : 0.4
              }}
            />
          )
        )
      )}
      
      {/* Captain preview dots - show only for active team */}
      {Object.entries(captainPreviews).map(([team, preview]) => 
        preview && team === activeTeam && (
          <Box
            key={`preview-${team}`}
            sx={{
              position: 'absolute',
              left: `${preview.x * 100}%`,
              top: `${preview.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20
            }}
          >
            <StarIcon 
              sx={{ 
                color: team === 'blue' ? '#186CF6' : '#EF4444',
                fontSize: 26,
                filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
                stroke: 'white',
                strokeWidth: 0.75,
                opacity: 0.6
              }} 
            />
          </Box>
        )
      )}

      {/* Captain final guesses as stars */}
      {Object.entries(captainGuesses).map(([team, guess]) => 
        guess && typeof guess.x === 'number' && typeof guess.y === 'number' && (
          <Box
            key={`captain-final-${team}`}
            sx={{
              position: 'absolute',
              left: `${guess.x * 100}%`,
              top: `${guess.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25
            }}
          >
            <StarIcon 
              sx={{ 
                color: team === 'blue' ? '#186CF6' : '#EF4444',
                fontSize: 26,
                filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
                stroke: 'white',
                strokeWidth: 1,
                opacity: 0.6
              }} 
            />
          </Box>
        )
      )}
    </Box>
  );
};

export default TeamMap;