import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

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
