/**
 * @fileoverview Tooltip component for remote game start instructions
 * 
 * This component provides:
 * - Informational tooltip explaining remote display setup
 * - Step-by-step instructions for connecting second screens
 * - Dynamic URL display based on current connection settings
 * - Help icon with hover functionality
 * 
 * @module Components/Desktop/Room/StartGameTooltip
 */
import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/**
 * Tooltip component that provides instructions for starting a game on a remote display
 * 
 * Displays a help icon that reveals instructions when hovered,
 * including the URL to enter on the secondary device.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.gameUrl - URL for the remote device to connect to
 * @returns {JSX.Element} The rendered tooltip component
 */
const StartGameTooltip = ({ gameUrl }) => {
  return (
    <Tooltip
      title={
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>Návod pro spuštění na jiné obrazovce:</strong>
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
            <li>Otevřete prohlížeč na jiné obrazovce, například na TV</li>
            <li>Zadejte tuto adresu: <strong>{gameUrl}</strong></li>
            <li>Klikněte na toto tlačítko pro spuštění hry</li>
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <IconButton size="small" sx={{ ml: 1 }}>
        <HelpOutlineIcon />
      </IconButton>
    </Tooltip>
  );
};

export default StartGameTooltip;