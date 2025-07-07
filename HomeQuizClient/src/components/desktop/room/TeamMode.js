/**
 * @fileoverview Team Mode component for displaying team assignments in quiz rooms
 * 
 * This component provides:
 * - Dual team display with color-coded containers
 * - Player listings with avatars and names
 * - Captain selection interface with star indicator
 * - Team member transfer controls for balancing teams
 * - Visual indicators for team roles and responsibilities
 * @author Bc. Martin Baláž
 * @module Components/Desktop/Room/TeamMode
 */
import React from 'react';
import { Box, Typography, Container, Avatar, IconButton } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * Team Mode component for displaying and managing team assignments
 * 
 * Renders two team containers side by side with players assigned to each team.
 * Provides functionality for selecting team captains and transferring players
 * between teams.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.blueTeam - Array of player objects in blue team
 * @param {Array} props.redTeam - Array of player objects in red team
 * @param {number} props.blueTeamCaptainIndex - Index of captain in blue team array
 * @param {number} props.redTeamCaptainIndex - Index of captain in red team array
 * @param {Function} props.onSelectCaptain - Handler for captain selection
 * @param {Function} props.onSwitchTeam - Handler for team transfers
 * @returns {JSX.Element} The rendered team mode component
 */
const TeamMode = ({ 
  blueTeam = [], 
  redTeam = [], 
  blueTeamCaptainIndex,
  redTeamCaptainIndex,
  onSelectCaptain,
  onSwitchTeam
}) => {
  const renderTeamPlayers = (players = [], teamCaptainIndex, isBlueTeam) => (
    <Box sx={{ flex: 1 }}>
      {players.map((player, index) => (
        <Box key={player.name || index} sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          mb: 2
        }}>
          <Avatar sx={{ bgcolor: player.color || (isBlueTeam ? 'blue' : 'red'), color: 'white' }}>
            {player.name ? player.name[0].toUpperCase() : '?'}
          </Avatar>
          <Typography sx={{ flex: 1, textAlign: 'left' }}>
            {player.name || 'Unknown'}
          </Typography>
          <IconButton 
            onClick={() => onSelectCaptain(player.name, isBlueTeam)}
            size="small"
            sx={{ mr: 1 }}
          >
            <StarIcon sx={{ 
              color: (isBlueTeam && index === blueTeamCaptainIndex) || 
                    (!isBlueTeam && index === redTeamCaptainIndex) ? 
                    'gold' : 'grey.400'
            }} />
          </IconButton>
          <IconButton 
            onClick={() => onSwitchTeam(player.name, isBlueTeam)}
            size="small"
            disabled={
              (isBlueTeam && blueTeam.length <= 1) || 
              (!isBlueTeam && redTeam.length <= 1) ||
              (isBlueTeam ? redTeam.length >= 5 : blueTeam.length >= 5)
            }
            title={isBlueTeam ? "Přesunout do červeného týmu" : "Přesunout do modrého týmu"}
          >
            {isBlueTeam ? <ArrowForwardIcon /> : <ArrowBackIcon />}
          </IconButton>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      gap: 3,
      maxWidth: '800px',
      margin: '0 auto' 
    }}>
      <TeamContainer 
        title="Modrý tým"
        color="blue"
        players={blueTeam}
        captainIndex={blueTeamCaptainIndex}
        renderPlayers={(players, captainIndex) => renderTeamPlayers(players, captainIndex, true)}
      />
      
      <TeamContainer 
        title="Červený tým"
        color="red"
        players={redTeam}
        captainIndex={redTeamCaptainIndex}
        renderPlayers={(players, captainIndex) => renderTeamPlayers(players, captainIndex, false)}
      />
    </Box>
  );
};

/**
 * Team container component for a single team's display
 * 
 * Renders a color-coded container with team heading and player list.
 * Used by the main TeamMode component to create consistent team displays.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - Team name to display
 * @param {string} props.color - Team color for styling
 * @param {Array} props.players - Array of player objects in this team
 * @param {number} props.captainIndex - Index of captain in players array
 * @param {Function} props.renderPlayers - Function to render player list
 * @returns {JSX.Element} The rendered team container
 */
const TeamContainer = ({ title, color, players, captainIndex, renderPlayers }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Container sx={{ 
      border: `2px solid ${color}`,
      borderRadius: 2,
      padding: 2,
      width: '350px !important',
      minHeight: '375px',
      position: 'relative',
      margin: 0
    }}>
      <Typography variant="h6" component="h2" align="center" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height: '1px', backgroundColor: color, mb: 3 }} />
      {renderPlayers(players, captainIndex)}
    </Container>
  </Box>
);

export default TeamMode;