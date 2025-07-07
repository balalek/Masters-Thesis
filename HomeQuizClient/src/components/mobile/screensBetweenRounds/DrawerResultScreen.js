/**
 * @fileoverview Drawer Result Screen for displaying drawing round results
 * 
 * This component provides:
 * - Results feedback for the player who was drawing
 * - Different visual states based on guessing success rate
 * - Points earned display with total score update
 * - Late selection indicator when player chose their word late
 * - Context-appropriate messages based on performance
 * @author Bc. Martin Baláž
 * @module Components/Mobile/ScreensBetweenRounds/DrawerResultScreen
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Drawer Result Screen component for displaying drawing results
 * 
 * Shows feedback to the player who was drawing based on how many
 * other players correctly guessed their drawing, including points
 * earned and visual indicators of success level.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.pointsEarned - Points earned for this drawing
 * @param {number} props.totalPoints - Player's total score after this round
 * @param {number} props.correctGuessCount - Number of players who guessed correctly
 * @param {number} props.totalGuessers - Total number of players who could guess
 * @param {boolean} props.isLateSelection - Whether the player selected their word late
 * @returns {JSX.Element} The rendered drawer result screen
 */
const DrawerResultScreen = ({ pointsEarned, totalPoints, correctGuessCount, totalGuessers, isLateSelection }) => {
  // Determine status based on how many people guessed correctly
  let status = "none"; // none, some, all
  if (correctGuessCount > 0) {
    status = correctGuessCount >= totalGuessers ? "all" : "some";
  }

  // Set colors and messages based on status
  const getStatusStyles = () => {
    switch (status) {
      case "all":
        return { 
          bgColor: '#14A64A', // Green
          icon: <CheckCircleIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          message: "Všichni hádající uhodli tvůj obrázek!"
        };
      case "some":
        return { 
          bgColor: '#3B82F6', // Blue 
          icon: <InfoIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          message: `${correctGuessCount} z ${totalGuessers} hráčů uhodlo tvůj obrázek.`
        };
      case "none":
        return { 
          bgColor: '#EF4444', // Red
          icon: <ErrorIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          message: "Nikdo neuhodl tvůj obrázek."
        };
      default:
        return { 
          bgColor: '#3B82F6', 
          icon: <InfoIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          message: "Konec kola."
        };
    }
  };

  const { bgColor, icon, message } = getStatusStyles();

  return (
    <Box
      sx={{
        backgroundColor: bgColor,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
        p: 3
      }}
    >
      {icon}
      
      <Typography 
        variant="h1" 
        sx={{ 
          color: 'white', 
          fontSize: '3em',
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {status === "all" ? "Výborně!" : status === "some" ? "Lepší než nic!" : "Nevadí, příště to vyjde!"}
      </Typography>
      
      <Typography 
        variant="h5" 
        sx={{ 
          color: 'white', 
          textAlign: 'center',
          mb: 2,
          px: 2
        }}
      >
        {message}
      </Typography>

      {isLateSelection && (
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'rgba(255,255,255,0.9)', 
            textAlign: 'center',
            backgroundColor: 'rgba(0,0,0,0.2)',
            p: 1,
            borderRadius: 1,
            mt: -1
          }}
        >
          Pozdní výběr slova: Získáváš pouze polovinu bodů!
        </Typography>
      )}
      
      <Typography 
        sx={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '2.5em',
          fontFamily: 'monospace',
          fontWeight: 'light',
          mt: 1
        }}
      >
        +{pointsEarned} bodů
      </Typography>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography 
          sx={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '1.2em',
            mb: 1
          }}
        >
          Celkové skóre
        </Typography>
        <Typography 
          sx={{ 
            color: 'white', 
            fontSize: '3.5em',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
        >
          {totalPoints}
        </Typography>
      </Box>
    </Box>
  );
};

export default DrawerResultScreen;