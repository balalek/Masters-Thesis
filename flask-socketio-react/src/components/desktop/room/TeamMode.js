import React from 'react';
import { Box, Typography, Container, Avatar, IconButton } from '@mui/material';
import StarIcon from '@mui/icons-material/Star'; // Changed from CaptainIcon
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const TeamMode = ({ 
  blueTeam = [], 
  redTeam = [], 
  blueTeamCaptainIndex,
  redTeamCaptainIndex,
  onSelectCaptain, // New prop instead of separate change functions
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
      gap: 3, // Increased gap between teams
      maxWidth: '800px', // Increased from 600px
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

const TeamContainer = ({ title, color, players, captainIndex, renderPlayers }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Container sx={{ 
      border: `2px solid ${color}`,
      borderRadius: 2,
      padding: 2,
      width: '350px !important', // Increased from 250px
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