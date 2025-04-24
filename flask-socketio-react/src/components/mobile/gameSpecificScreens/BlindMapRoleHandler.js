import React, { useState, useEffect } from 'react';
import { getSocket, getServerTime } from '../../../utils/socket';
import BlindMapQuizMobile from './BlindMapQuizMobile';
import BlindMapLocationMobile from './BlindMapLocationMobile';
import TeamWaitingScreen from '../screensBetweenRounds/TeamWaitingScreen';
import BlindMapPhaseTransitionMobile from '../screensBetweenRounds/BlindMapPhaseTransitionMobile';

const BlindMapRoleHandler = ({ onAnswer, playerName, questionId, teamName }) => {
  const [phase, setPhase] = useState(1);
  const [cityName, setCityName] = useState('');
  const [mapType, setMapType] = useState('cz');
  const [showTransition, setShowTransition] = useState(false);
  const [activeTeam, setActiveTeam] = useState('');
  const [blueCaptain, setBlueCaptain] = useState(null); // Track blue team captain
  const [redCaptain, setRedCaptain] = useState(null);   // Track red team captain
  const socket = getSocket();

  useEffect(() => {
    // Listen for phase transitions
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

  const handleAnagramSubmit = (answer) => {
    socket.emit('submit_blind_map_anagram', {
      player_name: playerName,
      answer
    });
  };

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
