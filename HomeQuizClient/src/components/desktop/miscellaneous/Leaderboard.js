/**
 * @fileoverview Leaderboard component for displaying player and team scores
 * 
 * This component provides:
 * - Individual player score rankings with visual score bars
 * - Team comparison for team mode with animated bar charts
 * - Auto-scrolling functionality for long player lists
 * - Responsive layout with clean visual design
 * - Color-coded score visualization
 * @author Bc. Martin Baláž
 * @module Components/Desktop/Miscellaneous/Leaderboard
 */
import React, { useRef, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';

/**
 * Leaderboard component for displaying current game scores
 * 
 * Renders either team-based or individual score displays based on game mode.
 * Features automatic scrolling for long player lists and animated score bars.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.scores - Score data object containing player/team scores
 * @returns {JSX.Element} The rendered leaderboard component
 */
const Leaderboard = ({ scores }) => {
  const scrollableRef = useRef(null);

  // Automatically scroll the leaderboard when new scores are received
  useEffect(() => {
    const scrollContainer = scrollableRef.current;
    if (!scrollContainer || scores.is_team_mode) return;

    const duration = 3000;
    let animationFrameId;
    
    const scroll = () => {
      let startTime = null;
      
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        
        if (progress < duration) {
          // Smooth scroll down
          const currentScroll = (progress / duration) * maxScroll;
          scrollContainer.scrollTop = currentScroll;
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Smooth scroll back to top and stop
          const scrollToTop = () => {
            const startPosition = scrollContainer.scrollTop;
            const startTime = Date.now();
            const duration = 1000;

            const animateToTop = () => {
              const currentTime = Date.now();
              const progress = (currentTime - startTime) / duration;

              if (progress < 1) {
                scrollContainer.scrollTop = startPosition * (1 - progress);
                requestAnimationFrame(animateToTop);
              } else {
                scrollContainer.scrollTop = 0;
              }
            };

            requestAnimationFrame(animateToTop);
          };

          scrollToTop();
        }
      };
      
      animationFrameId = requestAnimationFrame(animate);
    };

    scroll();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [scores]);

  if (scores.is_team_mode) {
    // Team mode scores display as a bar chart
    const { teams } = scores;
    const maxScore = Math.max(1, teams.blue, teams.red);

    return (
      <Container sx={{ 
        border: '2px solid grey',
        borderRadius: 2,
        padding: 2,
        width: '100% !important',
        maxWidth: 'none !important',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          gap: 8,
          flex: 1,
          alignItems: 'center'
        }}>
          {/* Blue team column */}
          <Box sx={{ textAlign: 'center', width: '200px' }}>
            <Typography variant="h3" sx={{ color: '#186CF6' }}>
              {teams.blue}
            </Typography>
            <Box sx={{ position: 'relative', height: '200px', my: 2 }}>
              <Box sx={{ 
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${Math.max(5, (teams.blue / maxScore) * 100)}%`,
                backgroundColor: '#186CF6',
                borderRadius: '8px 8px 0 0',
                transition: 'height 0.5s ease-in-out'
              }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#186CF6' }}>
              Modrý tým
            </Typography>
          </Box>

          {/* Red team column */}
          <Box sx={{ textAlign: 'center', width: '200px' }}>
            <Typography variant="h3" sx={{ color: '#EF4444' }}>
              {teams.red}
            </Typography>
            <Box sx={{ position: 'relative', height: '200px', my: 2 }}>
              <Box sx={{ 
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${Math.max(5, (teams.red / maxScore) * 100)}%`,
                backgroundColor: '#EF4444',
                borderRadius: '8px 8px 0 0',
                transition: 'height 0.5s ease-in-out'
              }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#EF4444' }}>
              Červený tým
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  const sortedPlayers = Object.entries(scores)
    .sort(([,a], [,b]) => b.score - a.score);
  
  const maxScore = Math.max(1, ...sortedPlayers.map(([,data]) => data.score));

  /**
   * Render a single player row in the leaderboard
   * 
   * Creates a grid layout row with placement number, player name,
   * score bar visualization, and numeric score.
   * 
   * @function renderPlayer
   * @param {string} playerName - Player's name
   * @param {Object} data - Player's score data with color
   * @param {number} index - Player's position in rankings
   * @returns {JSX.Element} The rendered player row
   */
  const renderPlayer = (playerName, data, index) => (
    <Box 
      key={playerName} 
      sx={{ 
        display: 'grid',
        gridTemplateColumns: '40px 250px 1fr 80px',
        gap: 2,
        alignItems: 'center',
        padding: '4px 0'
      }}
    >
      {/* Placement number */}
      <Typography sx={{ 
        fontSize: '1.5em',
        fontWeight: 'bold',
        color: 'grey.500',
        textAlign: 'right'
      }}>
        {index + 1}.
      </Typography>

      {/* Player name */}
      <Typography sx={{ 
        fontWeight: 'bold', 
        fontSize: '1.5em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: 2,
        textAlign: 'left',
        width: '100%'
      }}>
        {playerName}
      </Typography>

      {/* Score bar */}
      <Box sx={{ position: 'relative', height: '30px' }}>
        <Box 
          sx={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            backgroundColor: data.color,
            borderRadius: 1,
            width: `${Math.max(5, (data.score / maxScore) * 100)}%`
          }} 
        />
      </Box>

      {/* Score number */}
      <Typography sx={{ 
        textAlign: 'right',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        fontSize: '1.5em'
      }}>
        {data.score}
      </Typography>
    </Box>
  );

  return (
    <Container sx={{ 
      border: '2px solid grey',
      borderRadius: 2,
      padding: 2,
      width: '100% !important',
      maxWidth: 'none !important',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box 
        ref={scrollableRef}
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1.5,
          overflowY: 'auto',
          flex: 1,
          pr: 3,
          mr: -1,
          ml: -2,
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          }
        }}
      >
        {sortedPlayers.map(([playerName, data], index) => 
          renderPlayer(playerName, data, index)
        )}
      </Box>
    </Container>
  );
};

export default Leaderboard;