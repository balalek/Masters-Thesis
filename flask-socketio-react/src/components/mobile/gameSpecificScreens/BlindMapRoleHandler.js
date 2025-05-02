/**
 * @fileoverview Blind Map Role Handler for managing game phases
 * 
 * This component provides:
 * - Phase-based content switching between anagram solving and location guessing
 * - Team-specific role management including captain designation
 * - Transition screens between game phases
 * - Socket.IO event handling for phase coordination
 * - Component routing based on game state
 * 
 * @module Components/Mobile/GameSpecificScreens/BlindMapRoleHandler
 */
import React, { useState, useEffect } from 'react';
import { getSocket, getServerTime } from '../../../utils/socket';
import BlindMapQuizMobile from './BlindMapQuizMobile';
import BlindMapLocationMobile from './BlindMapLocationMobile';
import TeamWaitingScreen from '../screensBetweenRounds/TeamWaitingScreen';
import BlindMapPhaseTransitionMobile from '../screensBetweenRounds/BlindMapPhaseTransitionMobile';

/**
 * Blind Map Role Handler component for coordinating game phases
 * 
 * Manages the different phases of the Blind Map game, transitioning between
 * anagram solving and map location guessing with appropriate role-based
 * content for each player.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onAnswer - Callback for submitting answers
 * @param {string} props.playerName - Current player's name
 * @param {string} props.questionId - ID of the current question
 * @param {string} props.teamName - Player's team name ('red' or 'blue')
 * @returns {JSX.Element} The appropriate phase-specific component
 */
const BlindMapRoleHandler = ({ onAnswer, playerName, questionId, teamName }) => {
  const [phase, setPhase] = useState(1);
  const [cityName, setCityName] = useState('');
  const [mapType, setMapType] = useState('cz');
  const [showTransition, setShowTransition] = useState(false);
  const [activeTeam, setActiveTeam] = useState('');
  const [blueCaptain, setBlueCaptain] = useState(null);
  const [redCaptain, setRedCaptain] = useState(null);
  const socket = getSocket();

  /**
   * Set up phase transition event listener
   * 
   * Handles transitions between game phases by updating state
   * and showing transition screens at appropriate times.
   */
  useEffect(() => {
    
    socket.on('blind_map_phase_transition', (data) => {
      setCityName(data.correctAnswer);
      setMapType(data.mapType || 'cz');
      setActiveTeam(data.activeTeam);
      setPhase(data.phase || 2);
      
      // Store captain information
      if (data.blue_captain) setBlueCaptain(data.blue_captain);
      if (data.red_captain) setRedCaptain(data.red_captain);
      
      // Show transition screen
      setShowTransition(true);
      
      // Auto-update phase after transition completes
      setTimeout(() => {
        setShowTransition(false)
      }, data.transitionEndTime - getServerTime());
    });
    
    return () => {
      socket.off('blind_map_phase_transition');
    };
  }, [socket]);

  /**
   * Handle anagram answer submission
   * 
   * Emits the submitted anagram answer to the server.
   * 
   * @function handleAnagramSubmit
   * @param {string} answer - The submitted anagram answer
   */
  const handleAnagramSubmit = (answer) => {
    socket.emit('submit_blind_map_anagram', {
      player_name: playerName,
      answer
    });
  };

  /**
   * Handle location submission
   * 
   * Emits the selected map coordinates to the server.
   * 
   * @function handleLocationSubmit
   * @param {Object} locationData - The selected location data with x,y coordinates
   */
  const handleLocationSubmit = (locationData) => {
    socket.emit('submit_blind_map_location', {
      player_name: playerName,
      x: locationData.x,
      y: locationData.y,
      questionId
    });
  };

  // Show phase transition screen when transitioning
  if (showTransition) {
    return (
      <BlindMapPhaseTransitionMobile
        cityName={cityName}
        mapType={mapType}
        teamName={teamName}
        activeTeam={activeTeam}
        phase={phase}
      />
    );
  }

  // If team mode and not active, show waiting screen
  if (phase !== 1 && activeTeam !== teamName && teamName) {
    return (
      <TeamWaitingScreen 
        phase={phase} 
        message="Čekej, nyní hraje druhý tým"
      />
    );
  }

  // Render appropriate component based on phase
  if (phase === 1) {
    return <BlindMapQuizMobile onAnswer={handleAnagramSubmit} />;
  } else {
    // Determine if the player is a captain
    let isCaptain = false;
    if (teamName === 'blue' && playerName === blueCaptain) {
      isCaptain = true;
    } else if (teamName === 'red' && playerName === redCaptain) {
      isCaptain = true;
    }
    
    return (
      <BlindMapLocationMobile 
        onAnswer={handleLocationSubmit} 
        cityName={cityName} 
        mapType={mapType}
        questionId={questionId}
        isCaptain={isCaptain}
        teamName={teamName}
      />
    );
  }
};

export default BlindMapRoleHandler;