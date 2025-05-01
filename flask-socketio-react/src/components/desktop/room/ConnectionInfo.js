/**
 * @fileoverview Connection Info component for displaying player join instructions
 * 
 * This component provides:
 * - QR code for quick mobile device connection
 * - Text URL alternative for manual connection
 * - Visual divider between connection methods
 * - Network connectivity instructions
 * 
 * @module Components/Desktop/Room/ConnectionInfo
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Connection information display with QR code and text URL
 * 
 * Presents multiple ways for players to join the game session,
 * including a scannable QR code and a text URL address.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.connectionUrl - The URL for players to connect to the game
 * @returns {JSX.Element} The rendered connection info component
 */
const ConnectionInfo = ({ connectionUrl }) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%'
  }}>
    {/* QR Code */}
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>QR kód pro připojení:</Typography>
      <QRCodeSVG value={connectionUrl} size={128} />
    </Box>

    {/* Divider */}
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <Box sx={{ width: '1px', height: '40%', backgroundColor: 'grey.400' }} />
      <Typography sx={{ my: 2 }}>Nebo</Typography>
      <Box sx={{ width: '1px', height: '40%', backgroundColor: 'grey.400' }} />
    </Box>

    {/* URL */}
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>Adresa pro připojení:</Typography>
      <Typography>{connectionUrl}</Typography>
      <Typography sx={{ pt:1 }}  color="textSecondary">Pro připojení musíte být </Typography>
      <Typography color="textSecondary">připojeni na stejnou Wi-Fi.</Typography>
    </Box>
  </Box>
);

export default ConnectionInfo;