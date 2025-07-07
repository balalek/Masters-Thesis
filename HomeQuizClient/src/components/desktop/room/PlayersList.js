/**
 * @fileoverview Players list component for displaying connected players
 * 
 * This component provides:
 * - Two-column layout of connected players
 * - Avatar display with player initials and colors
 * - Balanced distribution of players between columns
 * - Consistent styling with container border and header
 * @author Bc. Martin Baláž
 * @module Components/Desktop/Room/PlayersList
 */
import React from 'react';
import { Box, Typography, Container, Avatar } from '@mui/material';

/**
 * Players list component for displaying all connected players
 * 
 * Displays players in a balanced two-column layout with colored avatars
 * showing player initials. Players are distributed evenly between columns
 * to maintain visual balance.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.players - Array of player objects with name and color properties
 * @returns {JSX.Element} The rendered players list component
 */
const PlayersList = ({ players }) => {
  /**
   * Split players evenly between left and right columns
   * 
   * @function distributePlayersInColumns
   * @param {Array} players - Array of player objects to distribute
   * @returns {Object} Object with leftColumn and rightColumn arrays
   */
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