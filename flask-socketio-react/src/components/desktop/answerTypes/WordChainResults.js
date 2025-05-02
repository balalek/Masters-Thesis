/**
 * @fileoverview Word Chain Results component for displaying word chain game statistics
 * 
 * This module provides:
 * - Overall word chain game statistics visualization
 * - Display of the winning player or team
 * - Recognition of special player roles (Slovní stratég, Slovní pacifista)
 * - Statistics like total word count, longest word, and player contributions
 * 
 * @module Components/Desktop/AnswerTypes/WordChainResults
 */
import React, { useMemo } from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import PeaceIcon from '@mui/icons-material/EmojiFoodBeverage';

/**
 * Word Chain Results component for displaying word chain game statistics
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.wordChain - Array of words played in the game
 * @param {Array} props.eliminatedPlayers - Players who were eliminated
 * @param {boolean} props.isTeamMode - Whether the game was played in team mode
 * @param {string} props.winningTeam - Name of winning team if in team mode
 * @param {string} props.lastPlayer - Name of last player standing (winner in free-for-all)
 * @returns {JSX.Element} The rendered word chain results component
 */
const WordChainResults = ({ wordChain = [], eliminatedPlayers = [], isTeamMode = false, winningTeam, lastPlayer }) => {
  // Calculate some interesting statistics
  const stats = useMemo(() => {
    // Skip calculation if no word chain
    if (!wordChain || wordChain.length === 0) {
      return {
        totalWords: 0,
        longestWord: '',
        longestWordLength: 0,
        playerContributions: {},
        teamContributions: { blue: 0, red: 0 },
        mostActivePlayer: null,
        playerLetterCounts: {},
        smartestPlayer: null,
        highestAvgLength: 0,
        pacifistPlayer: null,
        fewestWords: 0
      };
    }
    
    // Count only words added by players (skip system-added first word)
    const playerWords = wordChain.filter(item => item.player !== 'system');
    const totalWords = playerWords.length;
    
    // Find longest word
    const longestWord = [...playerWords].sort((a, b) => 
      b.word.length - a.word.length
    )[0]?.word || '';
    
    // Count contributions by player and team
    const playerContributions = {};
    const teamContributions = { blue: 0, red: 0 };
    
    playerWords.forEach(item => {
      // Count by player
      if (!playerContributions[item.player]) {
        playerContributions[item.player] = 0;
      }
      playerContributions[item.player]++;
      
      // Count by team if applicable
      if (item.team) {
        teamContributions[item.team]++;
      }
    });
    
    // Find player with most letters contributed (most active player)
    let mostActivePlayer = null;
    let maxLetters = 0;
    const playerLetterCounts = {};
    
    playerWords.forEach(item => {
      if (!playerLetterCounts[item.player]) {
        playerLetterCounts[item.player] = 0;
      }
      playerLetterCounts[item.player] += item.word.length;
    });
    
    Object.entries(playerLetterCounts).forEach(([player, letterCount]) => {
      if (letterCount > maxLetters) {
        mostActivePlayer = player;
        maxLetters = letterCount;
      }
    });
    
    // Calculate player with highest average word length (Slovní stratég)
    let smartestPlayer = null;
    let highestAvgLength = 0;
    
    // Find pacifist player (fewest words contributed)
    let pacifistPlayer = null;
    let fewestWords = Infinity;
    
    // Get unique players who contributed words
    const activePlayers = Array.from(new Set(playerWords.map(item => item.player)));
    
    // Count words by player
    activePlayers.forEach(player => {
      const wordCount = playerContributions[player] || 0;
      if (wordCount > 0 && wordCount < fewestWords) {
        pacifistPlayer = player;
        fewestWords = wordCount;
      }
    });
    
    const playerWordLengths = {};
  
    playerWords.forEach(item => {
      if (!playerWordLengths[item.player]) {
        playerWordLengths[item.player] = { total: 0, count: 0 };
      }
      playerWordLengths[item.player].total += item.word.length;
      playerWordLengths[item.player].count += 1;
    });
    
    Object.entries(playerWordLengths).forEach(([player, data]) => {
      if (data.count > 0) {
        const avgLength = data.total / data.count;
        
        // Check for smartest player (highest avg length)
        if (avgLength > highestAvgLength) {
          smartestPlayer = player;
          highestAvgLength = avgLength;
        }
      }
    });
    
    return {
      totalWords,
      longestWord,
      longestWordLength: longestWord.length,
      playerContributions,
      teamContributions,
      mostActivePlayer,
      playerLetterCounts,
      smartestPlayer,
      highestAvgLength: highestAvgLength.toFixed(1),
      pacifistPlayer,
      fewestWords,
      maxLetters
    };
  }, [wordChain]);
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Combined stats and winner box */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3,
          bgcolor: 'background.paper',
          position: 'relative',
          mx: 'auto'
        }}
      >
        {/* Winner information at the top */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <EmojiEventsIcon sx={{ fontSize: 48, color: 'warning.main', mr: 2 }} />
          <Typography variant="h3" fontWeight="bold" color="primary">
            {isTeamMode && winningTeam ? (
              `${winningTeam === 'blue' ? 'Modrý' : 'Červený'} tým vyhrál!`
            ) : (
              lastPlayer && !eliminatedPlayers.includes(lastPlayer) ? `Vítěz: ${lastPlayer}` : 'Všichni hráči byli vyřazeni!'
            )}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Stats with larger fonts */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between',
          width: '100%',
          gap: 2
        }}>
          <Box sx={{ 
            flex: '1 1 0', 
            minWidth: { xs: '100%', sm: '45%', md: '22%' }, 
            textAlign: 'center',
            px: 2,
            mb: { xs: 2, md: 0 },
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between'
          }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              Počet zahraných slov
            </Typography>
            <Typography variant="h2" color="primary" fontWeight="bold">{stats.totalWords}</Typography>
            <Box sx={{ mt: 1 }}></Box>
          </Box>
          
          {stats.longestWord && (
            <Box sx={{ 
              flex: '1 1 0', 
              minWidth: { xs: '100%', sm: '45%', md: '22%' }, 
              textAlign: 'center',
              px: 2,
              mb: { xs: 2, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Nejdélší slovo
              </Typography>
              <Typography variant="h3" color="primary" fontWeight="bold">
                {stats.longestWord}
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
                ({stats.longestWordLength} znaků)
              </Typography>
            </Box>
          )}
          
          {stats.smartestPlayer && !isTeamMode && (
            <Box sx={{ 
              flex: '1 1 0', 
              minWidth: { xs: '100%', sm: '45%', md: '22%' }, 
              textAlign: 'center',
              px: 2,
              mb: { xs: 2, md: 0 }, 
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <EmojiObjectsIcon sx={{ color: 'warning.main', mr: 1, fontSize: '1.5rem' }} />
                <Typography variant="h6" color="text.secondary">
                  Slovní stratég
                </Typography>
              </Box>
              
              <Typography 
                variant="h3" 
                color="primary" 
                fontWeight="bold"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}
              >
                {stats.smartestPlayer}
              </Typography>
              
              <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
                (průměrně {stats.highestAvgLength} znaků)
              </Typography>
            </Box>
          )}
          
          {stats.pacifistPlayer && stats.pacifistPlayer !== stats.smartestPlayer && stats.fewestWords < Infinity && !isTeamMode && (
            <Box sx={{ 
              flex: '1 1 0', 
              minWidth: { xs: '100%', sm: '45%', md: '22%' }, 
              textAlign: 'center',
              px: 2,
              mb: { xs: 2, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <PeaceIcon sx={{ color: 'info.main', mr: 1, fontSize: '1.5rem' }} />
                <Typography variant="h6" color="text.secondary">
                  Slovní pacifista
                </Typography>
              </Box>
              
              <Typography 
                variant="h3" 
                color="primary" 
                fontWeight="bold"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}
              >
                {stats.pacifistPlayer}
              </Typography>
              
              <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
                (pouze {stats.fewestWords} {stats.fewestWords === 1 ? 'slovo' : stats.fewestWords < 5 ? 'slova' : 'slov'})
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default WordChainResults;