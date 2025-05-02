/**
 * @fileoverview Word Chain Result component for displaying player performance after word chain game
 * 
 * This module provides:
 * - Role-based result displays (strategist, pacifist, winner, participant)
 * - Player statistics visualization (words contributed, average word length)
 * - Team victory or individual victory recognition
 * - Points earned visualization 
 * 
 * @module Components/Mobile/GameSpecificScreens/WordChainResult
 */
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import PeaceIcon from '@mui/icons-material/EmojiFoodBeverage';
import PersonIcon from '@mui/icons-material/Person';

/**
 * Word Chain Result component for showing game outcomes
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.wordChain - Array of words played in the game
 * @param {string} props.winningTeam - Name of team that won (if team mode)
 * @param {boolean} props.isTeamMode - Whether the game was played in team mode
 * @param {number} props.pointsEarned - Points earned in this game
 * @param {number} props.totalPoints - Total points for player/team
 * @param {string} props.playerName - Current player's name
 * @param {string} props.winner - Name of winning player (in free-for-all mode)
 * @returns {JSX.Element} The rendered word chain result component
 */
const WordChainResult = ({ 
  wordChain = [], 
  winningTeam,
  isTeamMode, 
  pointsEarned = 50, 
  totalPoints = 0,
  playerName = '',
  winner = ''
}) => {
  // Determine player role and team status based on gameplay data
  const playerRole = useMemo(() => {
    if (!wordChain || wordChain.length === 0 || !playerName) {
      return { role: 'participant', isWinner: false, stats: { words: 0, letters: 0, avgLength: 0 } };
    }

    // Filter to find words by this player
    const playerWords = wordChain.filter(item => item.player === playerName);
    
    // Check if player is on winning team or is the winner in free-for-all mode
    const isOnWinningTeam = isTeamMode 
      ? ((winningTeam === 'blue' && playerWords.some(item => item.team === 'blue')) ||
         (winningTeam === 'red' && playerWords.some(item => item.team === 'red')))
      : (playerName === winner); // In non-team mode, use winner prop
       
    if (playerWords.length === 0) {
      return { role: 'participant', isWinner: isOnWinningTeam, stats: { words: 0, letters: 0, avgLength: 0 } };
    }
    
    // Calculate player stats
    const wordCount = playerWords.length;
    const letterCount = playerWords.reduce((sum, item) => sum + item.word.length, 0);
    const avgLength = (letterCount / wordCount).toFixed(1);
    
    // Store player's own stats
    const playerOwnStats = {
      words: wordCount,
      letters: letterCount,
      avgLength: avgLength
    };
    
    // Find player with highest average word length across all players
    const playerStats = {};
    const playerWordCounts = {};
    
    wordChain.forEach(item => {
      if (item.player === 'system') return;
      
      if (!playerStats[item.player]) {
        playerStats[item.player] = { letters: 0, words: 0 };
        playerWordCounts[item.player] = 0;
      }
      
      playerStats[item.player].letters += item.word.length;
      playerStats[item.player].words += 1;
      playerWordCounts[item.player] += 1;
    });
    
    // Calculate averages and find strategist and pacifist
    let highestAvg = 0;
    let strategist = null;
    let lowestWordCount = Infinity;
    let pacifist = null;
    
    Object.entries(playerStats).forEach(([player, stats]) => {
      if (stats.words > 0) {
        const avg = stats.letters / stats.words;
        if (avg > highestAvg) {
          highestAvg = avg;
          strategist = player;
        }
        
        if (stats.words < lowestWordCount && stats.words > 0) {
          lowestWordCount = stats.words;
          pacifist = player;
        }
      }
    });
    
    // Determine player role
    if (playerName === strategist) {
      return { role: 'strategist', isWinner: isOnWinningTeam, stats: playerOwnStats };
    } else if (playerName === pacifist && pacifist !== strategist) {
      return { role: 'pacifist', isWinner: isOnWinningTeam, stats: playerOwnStats };
    } else if (isOnWinningTeam) {
      return { role: 'winner', isWinner: true, stats: playerOwnStats };
    } else {
      return { role: 'participant', isWinner: isOnWinningTeam, stats: playerOwnStats };
    }
  }, [wordChain, playerName, isTeamMode, winningTeam, winner]);

  /**
   * Get display content based on player's role
   * 
   * @function
   * @returns {Object} Visual elements and styling based on player role
   */
  const getDisplayContent = () => {
    switch (playerRole.role) {
      case 'strategist':
        return {
          icon: <EmojiObjectsIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          title: 'Slovní stratég',
          backgroundColor: playerRole.isWinner ? '#14A64A' : '#2196f3'
        };
      case 'pacifist':
        return {
          icon: <PeaceIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          title: 'Slovní pacifista',
          backgroundColor: playerRole.isWinner ? '#14A64A' : '#2196f3'
        };
      case 'winner':
        return {
          icon: <EmojiEventsIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          title: 'Vítěz',
          backgroundColor: '#14A64A'
        };
      default:
        return {
          icon: <PersonIcon sx={{ fontSize: '120px', color: 'white', mb: 2 }} />,
          title: 'Účastník hry',
          backgroundColor: '#2196f3'
        };
    }
  };

  const display = getDisplayContent();

  return (
    <Box
      sx={{
        backgroundColor: display.backgroundColor,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3
      }}
    >
      {display.icon}
      
      <Typography 
        variant="h1" 
        sx={{ 
          color: 'white', 
          fontSize: '3em',
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 2
        }}
      >
        {display.title}
      </Typography>
      
      {/* Player's own stats */}
      {playerRole.stats.words > 0 && (
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography sx={{ color: 'white', fontSize: '1.2em' }}>
            Počet slov: <strong>{playerRole.stats.words}</strong>
          </Typography>
          <Typography sx={{ color: 'white', fontSize: '1.2em' }}>
            Celkem znaků: <strong>{playerRole.stats.letters}</strong>
          </Typography>
          <Typography sx={{ color: 'white', fontSize: '1.2em' }}>
            Průměrná delka slova: <strong>{playerRole.stats.avgLength}</strong>
          </Typography>
        </Box>
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

export default WordChainResult;