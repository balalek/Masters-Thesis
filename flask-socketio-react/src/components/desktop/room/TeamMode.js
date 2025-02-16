import React from 'react';
import { Box, Typography, Container, Avatar, Button } from '@mui/material';
import CaptainIcon from '@mui/icons-material/Star';

const TeamMode = ({ 
  blueTeam, 
  redTeam, 
  blueTeamCaptainIndex, 
  redTeamCaptainIndex,
  onChangeBlueTeamCaptain,
  onChangeRedTeamCaptain 
}) => {
  const renderTeamPlayers = (players, captainIndex) => (
    <Box sx={{ flex: 1 }}>
      {players.map((player, index) => (
        <Box key={index} sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          mb: 2
        }}>
          <Avatar sx={{ 
            bgcolor: player.color,
            color: 'white'
          }}>
            {player.name[0].toUpperCase()}
          </Avatar>
          <Typography sx={{ 
            flex: 1,
            textAlign: 'left'
          }}>
            {player.name}
          </Typography>
          {index === captainIndex && <CaptainIcon sx={{ color: 'gold', ml: 'auto' }} />}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, maxWidth: '600px', margin: '0 auto' }}>
      {/* Blue Team */}
      <TeamContainer 
        title="Modrý tým"
        color="blue"
        players={blueTeam}
        captainIndex={blueTeamCaptainIndex}
        onChangeCaptain={onChangeBlueTeamCaptain}
        renderPlayers={renderTeamPlayers}
      />
      
      {/* Red Team */}
      <TeamContainer 
        title="Červený tým"
        color="red"
        players={redTeam}
        captainIndex={redTeamCaptainIndex}
        onChangeCaptain={onChangeRedTeamCaptain}
        renderPlayers={renderTeamPlayers}
      />
    </Box>
  );
};

const TeamContainer = ({ title, color, players, captainIndex, onChangeCaptain, renderPlayers }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Container sx={{ 
      border: `2px solid ${color}`,
      borderRadius: 2,
      padding: 2,
      width: '250px !important',
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
    <Button variant="contained" onClick={onChangeCaptain} sx={{ width: '100%' }}>
      Změnit kapitána
    </Button>
  </Box>
);

export default TeamMode;
