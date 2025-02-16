import React from 'react';
import { Box, Typography, Container, Avatar } from '@mui/material';

const PlayersList = ({ players }) => {
  const distributePlayersInColumns = (players) => {
    const leftColumn = [];
    const rightColumn = [];
    players.forEach((player, index) => {
      if (index % 2 === 0) {
        leftColumn.push(player);
      } else {
        rightColumn.push(player);
      }
    });
    return { leftColumn, rightColumn };
  };

  const { leftColumn, rightColumn } = distributePlayersInColumns(players);

  return (
    <Container sx={{ 
      border: '2px solid grey',
      borderRadius: 2,
      padding: 2,
      width: '500px !important',
      minHeight: '375px',
      position: 'relative'
    }}>
      <Typography variant="h6" component="h2" align="center" sx={{ mb: 1 }}>
        Hráči
      </Typography>
      <Box sx={{ width: '100%', height: '1px', backgroundColor: 'grey.400', mb: 3 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Left column */}
        <Box sx={{ flex: 1 }}>
          {leftColumn.map((player, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ bgcolor: player.color, color: 'white' }}>
                {player.name[0].toUpperCase()}
              </Avatar>
              <Typography>{player.name}</Typography>
            </Box>
          ))}
        </Box>
        {/* Right column */}
        <Box sx={{ flex: 1 }}>
          {rightColumn.map((player, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ bgcolor: player.color, color: 'white' }}>
                {player.name[0].toUpperCase()}
              </Avatar>
              <Typography>{player.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default PlayersList;
