/**
 * @fileoverview Mobile Game Page component for player gameplay experience
 * 
 * This module provides:
 * - Dynamic rendering based on question types (ABCD, Open Answer, Drawing, etc.)
 * - Real-time game state synchronization via Socket.IO
 * - Role-specific interfaces (captain, drawer, guesser)
 * - Score tracking and result visualization
 * - Team coordination features for team-based gameplay
 * - Transitions between questions and game phases
 * 
 * @module Pages/Mobile/Game/MobileGamePage
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket, getServerTime } from '../../../utils/socket';
import { Box } from '@mui/material';
import CorrectAnswer from '../../../components/mobile/screensBetweenRounds/CorrectAnswer';
import IncorrectAnswer from '../../../components/mobile/screensBetweenRounds/IncorrectAnswer';
import Loading from '../../../components/mobile/screensBetweenRounds/Loading';
import MobileFinalScore from '../../../components/mobile/screensBetweenRounds/MobileFinalScore';
import ABCDQuizMobile from '../../../components/mobile/gameSpecificScreens/ABCDQuizMobile';
import TrueFalseQuizMobile from '../../../components/mobile/gameSpecificScreens/TrueFalseQuizMobile';
import TooLateAnswer from '../../../components/mobile/screensBetweenRounds/TooLateAnswer';
import OpenAnswerQuizMobile from '../../../components/mobile/gameSpecificScreens/OpenAnswerQuizMobile';
import GuessANumberQuizMobile from '../../../components/mobile/gameSpecificScreens/GuessANumberQuizMobile';
import TeamCaptainGuessNumberMobile from '../../../components/mobile/gameSpecificScreens/TeamCaptainGuessNumberMobile';
import MoreLessVoteMobile from '../../../components/mobile/gameSpecificScreens/MoreLessVoteMobile';
import GuessANumberPlacement from '../../../components/mobile/screensBetweenRounds/GuessANumberPlacement';
import TeamWaitingScreen from '../../../components/mobile/screensBetweenRounds/TeamWaitingScreen';
import PhaseTransitionMobile from '../../../components/mobile/screensBetweenRounds/PhaseTransitionMobile';
import WordSelectionMobile from '../../../components/mobile/gameSpecificScreens/WordSelectionMobile';
import DrawerQuizMobile from '../../../components/mobile/gameSpecificScreens/DrawerQuizMobile';
import DrawingAnswerQuizMobile from '../../../components/mobile/gameSpecificScreens/DrawingAnswerQuizMobile';
import DrawerResultScreen from '../../../components/mobile/screensBetweenRounds/DrawerResultScreen';
import DrawerWaitingScreen from '../../../components/mobile/gameSpecificScreens/DrawerWaitingScreen';
import WordChainQuizMobile from '../../../components/mobile/gameSpecificScreens/WordChainQuizMobile';
import WordChainResult from '../../../components/mobile/gameSpecificScreens/WordChainResult';
import MathQuizMobile from '../../../components/mobile/gameSpecificScreens/MathQuizMobile';
import MathQuizCorrectAnswer from '../../../components/mobile/screensBetweenRounds/MathQuizCorrectAnswer';
import MathQuizEliminatedAnswer from '../../../components/mobile/screensBetweenRounds/MathQuizEliminatedAnswer';
import { DRAWER_EXTRA_TIME } from '../../../constants/quizValidation';
import BlindMapRoleHandler from '../../../components/mobile/gameSpecificScreens/BlindMapRoleHandler';

/**
 * Mobile Game Page component for player interaction during quizzes
 * 
 * @component
 * @returns {JSX.Element} The rendered mobile game page component
 */
const MobileGamePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialGameData = location.state?.gameData; // Get initial game data from navigation state
  const [question, setQuestion] = useState(initialGameData?.question || {
    type: 'ABCD',
    options: ["Option 1", "Option 2", "Option 3", "Option 4"]
  });
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [finalScoreData, setFinalScoreData] = useState(null);
  const playerName = location.state?.playerName || 'Unknown Player';
  const [showButtons, setShowButtons] = useState(true);
  const playerRole = location.state?.gameData?.role || 'Unknown Role';
  // States for team mode and guess-a-number quiz
  const teamName = location.state?.teamName || 'Unknown Team';
  const [quizPhase, setQuizPhase] = useState(1);
  const [firstTeamAnswer, setFirstTeamAnswer] = useState(null);
  const [guessPlacementData, setGuessPlacementData] = useState(null);
  const [showGuessPlacement, setShowGuessPlacement] = useState(false);
  const [activeTeam, setActiveTeam] = useState(location.state?.activeTeam);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [exactGuess, setExactGuess] = useState(false);
  const [guessResult, setGuessResult] = useState(null);
  // States for drawing quiz
  const [selectedWord, setSelectedWord] = useState(null);
  const [drawerStats, setDrawerStats] = useState(null);
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [drawerLate, setDrawerLate] = useState(false);
  // State for word chain results
  const [wordChainResults, setWordChainResults] = useState(null); 
  // States for math quiz
  const [mathQuizResults, setMathQuizResults] = useState(null);
  const [wasEliminated, setWasEliminated] = useState(false);
  const [customTitle, setCustomTitle] = useState(null);

  /**
   * Process Math Quiz results to determine player performance
   * 
   * Calculates player/team performance in math quizzes, including:
   * - Number of correct sequences
   * - Points earned in the current question
   * - Elimination status and which sequence caused elimination
   * 
   * @function
   * @param {Object} data - Results data from server
   * @param {string} playerName - Current player's name
   * @param {string} teamName - Player's team (if in team mode)
   * @param {Object} question - Current question object
   * @returns {Object} Processed results with player/team performance metrics
   */
  const processMathQuizResults = (data, playerName, teamName) => {
    const isTeamMode = data.scores?.is_team_mode || false;
    // In team mode, we determine team elimination rather than individual elimination
    const eliminated = isTeamMode 
      ? (teamName === 'blue' 
          ? data.eliminated_players?.filter(p => data.scores?.blue_team?.includes(p))?.length === data.scores?.blue_team?.length
          : data.eliminated_players?.filter(p => data.scores?.red_team?.includes(p))?.length === data.scores?.red_team?.length)
      : data.eliminated_players?.includes(playerName) || false;
    
    const totalSequences = data.sequences?.length || 0;
    let correctCount = 0;
    let pointsEarnedThisQuestion = 0;
    let currentTotalPoints = 0;
    let eliminationSequence = totalSequences; // Default to total if not eliminated

    if (isTeamMode) {
      // Team mode calculations
      pointsEarnedThisQuestion = data.math_quiz_points?.team_points?.[teamName] || 0;
      currentTotalPoints = data.scores?.teams?.[teamName] || 0;
      
      // Count correct sequences for the team
      for (let i = 0; i < totalSequences; i++) {
        const teamAnswersForSeq = data.player_answers?.[i]?.filter(ans => ans.team === teamName && ans.correct);
        if (teamAnswersForSeq && teamAnswersForSeq.length > 0) {
          correctCount++;
        } else if (eliminated && eliminationSequence === totalSequences) {
          // If team was eliminated, find first sequence the team didn't answer correctly
          eliminationSequence = i + 1; 
        }
      }
    } else {
      // Free-for-all calculations
      pointsEarnedThisQuestion = data.math_quiz_points?.player_points?.[playerName] || 0;
      currentTotalPoints = data.scores?.[playerName]?.score || 0;

      // Count correct sequences for the player
      for (let i = 0; i < totalSequences; i++) {
        const playerAnswerForSeq = data.player_answers?.[i]?.find(ans => ans.player === playerName && ans.correct);
        if (playerAnswerForSeq) {
          correctCount++;
        } else if (eliminated && eliminationSequence === totalSequences) {
          // If player was eliminated, find first sequence they didn't answer correctly
          eliminationSequence = i + 1;
        }
      }
    }
    
    const results = {
      correctCount: correctCount,
      totalCount: totalSequences,
      currentSequence: Math.min(eliminationSequence, totalSequences), // Never exceed totalCount
      isTeamMode: isTeamMode,
      teamName: teamName
    };

    return {
      results,
      eliminated,
      pointsEarnedThisQuestion,
      currentTotalPoints
    };
  };

  /**
   * Listen for game events and handle state updates
   * 
   * Manages socket events for:
   * - Next question transitions
   * - Answer validation responses
   * - Final results and scoring
   * - Game resets
   */
  useEffect(() => {
    const socket = getSocket();

    socket.on('next_question', (data) => {
      // Reset important state variables for the next question
      setQuizPhase(1);
      setActiveTeam(data.active_team);
      setQuestion(data.question);
      setShowResult(false);
      setGuessPlacementData(null);
      setShowGuessPlacement(false);
      setIsCorrect(null);
      setCanvasVisible(false);
      setDrawerLate(false);
      setWordChainResults(null);
      setMathQuizResults(null);
      setWasEliminated(false);
      setCustomTitle(null);
      setPointsEarned(0);
      
      // Check if player is drawer for current question - don't hide buttons for drawer
      const isNextDrawer = data.drawer === playerName || data.question.player === playerName;
      if (!isNextDrawer) {
        setLoading(true);
        setShowButtons(false);
      }
      setSelectedWord(null);
    });

    socket.on('answer_correctness', (data) => {
      // Show result screen based on answer correctness
      setIsCorrect(data.correct);
      setPointsEarned(data.points_earned);
      setTotalPoints(data.total_points);
      setCustomTitle(data.custom_title || null);
      
      // Handle guess-a-number placement data for free for all mode
      if (data.guessResult && data.correct !== null && !data.exactGuess) {
        setGuessPlacementData(data.guessResult);
        setShowGuessPlacement(true);
        setLoading(true);
        return; // Early return to avoid showing regular result screens
      } else if (data.guessResult && data.correct === null && !data.exactGuess) {
        // Handle the case where the answer is too late
        setGuessPlacementData(null); // Clear previous data
        setShowGuessPlacement(false);
        setIsCorrect(null); // Null triggers the "too late" screen
        setShowResult(true);
        setLoading(true);
        return;
      }
      
      // Only set exactGuess and guessResult for team mode with exact guesses
      // This avoids interfering with the free-for-all mode logic
      if (data.exactGuess) {
        setExactGuess(true);
        setGuessResult(data.guessResult);
      } else {
        setExactGuess(false);
        // Only clear guessResult if not in placement mode
        if (!showGuessPlacement) {
          setGuessResult(null);
        }
      }
      
      // Always show result for correct answers, regardless of question type
      if (data.correct) {
        setShowResult(true);
        setLoading(true);
      } else if (question?.type !== 'OPEN_ANSWER') {
        // For incorrect answers in non-open questions, also show the result
        setShowResult(true);
        setLoading(true);
      }
    });

    socket.on('all_answers_received', (data) => {
      // Everyone has answered, or the time is up - show results
      // Process results based on question type
      if (question?.type === 'BLIND_MAP' && !data.scores.is_team_mode) {
        let playerScore = 0;
        let pointsFromAnagram = 0;

        // Free-for-all mode - get individual player score
        playerScore = data.scores[playerName]?.score || 0;
        
        // Extract anagram points from results if available
        if (data.anagram_points) {
          pointsFromAnagram = data.anagram_points[playerName] || 0;
        }
        
        // Check if this player submitted a location in phase 2
        let playerSubmittedLocation = undefined;
        if (data.player_locations) {
          // Find player in the locations array by checking playerName property
          Object.values(data.player_locations).forEach(location => {
            if (location.playerName === playerName) {
              playerSubmittedLocation = location;
            }
          });
        }

        // Only set total points for everyone (safe)
        setTotalPoints(playerScore);

        // ONLY set pointsEarned for players who didn't submit a location
        if (!playerSubmittedLocation) {
          setPointsEarned(pointsFromAnagram);
        }
      }

      // Process Math Quiz results specifically
      if (question?.type === 'MATH_QUIZ') {
        const { 
          results, 
          eliminated, 
          pointsEarnedThisQuestion, 
          currentTotalPoints 
        } = processMathQuizResults(data, playerName, teamName);
        
        setWasEliminated(eliminated);
        setPointsEarned(pointsEarnedThisQuestion);
        setTotalPoints(currentTotalPoints);
        setMathQuizResults(results);

        setShowResult(true);
        setLoading(true);
        // No return here, let the general logic below handle the rest if needed
      }
      
      // Skip setting showResult for GUESS_A_NUMBER questions in free-for-all mode only
      // In team mode or for other question types, show the result
      if (question?.type !== 'GUESS_A_NUMBER' || activeTeam) {
        setShowResult(true);
      }
      
      // Check for drawer stats in additional_data
      if (data.drawer_stats) {
        setDrawerStats(data.drawer_stats);
      }
      
      // Check for word chain results in additional_data
      if (data.word_chain) {
        // Free-for-all mode - get individual player score
        if (data.scores[playerName] && !data.scores.is_team_mode) {
          // Get points earned for this player from game_points
          const playerGamePoints = data.game_points && data.game_points[playerName] ? 
          Math.round(data.game_points[playerName]) : 0;
          setPointsEarned(playerGamePoints); // Set points earned from game-specific points
          setTotalPoints(data.scores[playerName].score);
        } else if (data.scores.teams && data.scores.is_team_mode) {
            // Team mode structure - correctly access the team score
            if (teamName === data.winning_team) {
              setPointsEarned(data.game_points);
            } else {
              setPointsEarned(0); // No points for losing team
            }
            setTotalPoints(data.scores.teams[teamName]);
        }
        
        setWordChainResults({
          wordChain: data.word_chain,
          winner: data.last_player,
          explodedTeam: data.exploded_team,
          winningTeam: data.winning_team,
          explodedPlayer: data.exploded_player,
          isTeamMode: question?.is_team_mode,
          gamePoints: data.game_points || {}
        });
      }
      
      // Calculate delay until buttons should show
      const now = getServerTime();
      const delay = data.show_buttons_at - now;
      
      // Check if this player is the drawer for the next question
      const isNextDrawer = data.next_drawer === playerName;

      // Schedule showing the buttons - apply shorter delay for drawer
      setTimeout(() => {
        setLoading(false);
        setShowButtons(true);
      }, isNextDrawer ? Math.max(0, delay - DRAWER_EXTRA_TIME) : delay);
      
      // For drawer, show canvas after the delay that is for everyone
      if (isNextDrawer) {
        // Important: Reset canvas visibility first to ensure proper sequencing
        setCanvasVisible(false);
        
        setTimeout(() => {
          setCanvasVisible(true); // Show the canvas for the drawer
        }, delay);
      }
    });

    socket.on('navigate_to_final_score', (data) => {
      setFinalScoreData(data);
      setShowFinalScore(true);
    });

    socket.on('game_reset', () => {
      navigate('/play', { 
        state: { 
          playerName: playerName,
          playerColor: finalScoreData?.color 
        } 
      });
    });

    // Listener for phase transition in team guess-a-number quiz
    socket.on('phase_transition', (data) => {
      setFirstTeamAnswer(data.firstTeamAnswer);
      setActiveTeam(data.activeTeam);
      setShowPhaseTransition(true);
      
      // Calculate delay by subtracting current server time from end time
      const now = getServerTime();
      const delay = Math.max(0, data.transitionEndTime - now);
      
      // Hide transition after calculated delay
      setTimeout(() => {
        setShowPhaseTransition(false);
        setLoading(false);
        setQuizPhase(2);
      }, delay);
    });

    // Listener for word selection confirmation in drawing quiz
    socket.on('word_selected', (data) => {
      if (data.is_drawer) {
        setSelectedWord(data.word);
        // Don't set canvasVisible here - wait for the timer to do it
      }
    });

    // Word chain feedback for user submissions
    socket.on('word_chain_feedback', (data) => {
      if (!data.success) {
        console.log('Word chain feedback error:', data.message);
        // Error feedback is handled in the WordChainQuizMobile component
      }
    });

    return () => {
      socket.off('next_question');
      socket.off('answer_correctness');
      socket.off('all_answers_received');
      socket.off('navigate_to_final_score');
      socket.off('game_reset');
      socket.off('phase_transition');
      socket.off('word_selected');
      socket.off('word_chain_feedback');
    };
  }, [navigate, playerName, finalScoreData, question, showGuessPlacement]);

  /**
   * Listen for player role updates during gameplay
   * 
   * Updates player-specific role information and phase transitions
   */
  useEffect(() => {
    const socket = getSocket();
    socket.on('player_role_update', (data) => {
      
      if (data.quizPhase) {
        setQuizPhase(data.quizPhase);
      }
      
      if (data.firstTeamAnswer !== undefined) {
        setFirstTeamAnswer(data.firstTeamAnswer);
      }
    });

    return () => {
      socket.off('player_role_update');
    };
  }, []);

  /**
   * Handle initial drawer canvas visibility
   * 
   * Shows the drawing canvas at the appropriate time for drawer players
   */
  useEffect(() => {
    // Check if this player is the drawer for the first question
    const isInitialDrawer = question?.type === 'DRAWING' && question?.player === playerName;
    
    if (isInitialDrawer && location.state?.gameData?.show_game_at) {
      const now = getServerTime();
      const showGameAt = location.state.gameData.show_game_at;
      
      // Calculate the delay until the game starts
      const delay = Math.max(0, showGameAt - now);
      
      // Set a timer to make the canvas visible for drawer after the preview time
      const timer = setTimeout(() => {
        setCanvasVisible(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, []);

  /**
   * Detect late word selection for drawing questions
   * 
   * Identifies when a drawer has delayed selecting a word to draw
   */
  useEffect(() => {
    if (canvasVisible && !selectedWord && question?.type === 'DRAWING' && question?.player === playerName) {
      setDrawerLate(true);
    }
  }, [canvasVisible, selectedWord, question, playerName]);

  /**
   * Handle multiple-choice answer submission
   * 
   * @function handleAnswer
   * @param {number} index - Selected answer index
   */
  const handleAnswer = (index) => {
    const socket = getSocket();
    const answerTime = getServerTime();
    socket.emit('submit_answer', { player_name: playerName, answer: index, answer_time: answerTime });
    setLoading(true);
  };

  /**
   * Handle open-ended answer submission
   * 
   * @function handleOpenAnswer
   * @param {string} answer - Player's text answer
   */
  const handleOpenAnswer = (answer) => {
    const socket = getSocket();
    const now = getServerTime();
    
    // Submit the open answer without setting loading state
    socket.emit('submit_open_answer', {
      player_name: playerName,
      answer: answer,
      answer_time: now
    });
  };

  /**
   * Handle number guess submission in guess-a-number quiz
   * 
   * @function handleNumberGuess
   * @param {number} value - Player's guessed number
   */
  const handleNumberGuess = (value) => {
    const socket = getSocket();
    const now = getServerTime();
    
    socket.emit('submit_number_guess', {
      player_name: playerName,
      value: value,
      answer_time: now
    });
    
    // Only set loading for regular players, not captains or voters
    if (playerRole === 'player') {
      setLoading(true);
    }
  };

  /**
   * Handle team captain's final answer choice in team guess-a-number quiz
   * 
   * @function handleCaptainChoice
   * @param {number} finalAnswer - Captain's final answer for the team
   */
  const handleCaptainChoice = (finalAnswer) => {
    const socket = getSocket();
    
    socket.emit('submit_captain_choice', {
      player_name: playerName,
      team: teamName,
      final_answer: finalAnswer
    });
    
    setLoading(true);
  };

  /**
   * Handle team member's higher/lower vote in team guess-a-number quiz
   * 
   * @function handleMoreLessVote
   * @param {string} vote - Player's vote ('higher' or 'lower')
   */
  const handleMoreLessVote = (vote) => {
    const socket = getSocket();
    
    socket.emit('submit_more_less_vote', {
      player_name: playerName,
      team: teamName,
      vote: vote
    });
  };

  /**
   * Handle drawing answer submission
   * 
   * @function handleDrawingSubmit
   * @param {string} answer - Guess for what is being drawn
   */
  const handleDrawingSubmit = (answer) => {
    const socket = getSocket();
    const now = getServerTime();
    
    // Submit the drawing answer similar to open answer
    socket.emit('submit_drawing_answer', {
      player_name: playerName,
      answer: answer,
      answer_time: now
    });
    
    // Don't set loading state to allow for multiple guesses
  };

  /**
   * Handle drawer's word selection
   * 
   * @function handleWordSelected
   * @param {string} word - Word chosen to draw
   */
  const handleWordSelected = (word) => {
    const socket = getSocket();
    setSelectedWord(word);
    
    // Send selected word with late selection flag
    socket.emit('select_drawing_word', {
      player_name: playerName,
      selected_word: word,
      is_late_selection: drawerLate
    });

  };

  /**
   * Handle word chain word submission
   * 
   * @function handleWordChainSubmit
   * @param {string} word - Submitted word in the chain
   */
  const handleWordChainSubmit = (word) => {
    const socket = getSocket();
    
    socket.emit('submit_word_chain_word', {
      player_name: playerName,
      word: word
    });
  };

  /**
   * Handle math quiz answer submission
   * 
   * @function handleMathAnswer
   * @param {number} answer - Player's mathematical answer
   */
  const handleMathAnswer = (answer) => {
    const socket = getSocket();
    
    socket.emit('submit_math_answer', {
      player_name: playerName,
      answer: answer,
      answer_time: getServerTime()
    });
  };

  /**
   * Handle blind map answer submission
   * 
   * @function handleBlindMapAnswer
   * @param {Object} answer - Player's map selection
   */
  const handleBlindMapAnswer = (answer) => {
    // This is a proxy function that will be passed to the BlindMapRoleHandler
    // The actual submission happens in the handler component
    console.log("Handling blind map answer");
  };

  if (showFinalScore && finalScoreData) {
    return (
      <MobileFinalScore
        {...finalScoreData}
        isTeamMode={finalScoreData.is_team_mode}
        teamName={finalScoreData.team_name}
        teamScores={finalScoreData.team_scores || { blue: 0, red: 0 }}
      />
    );
  }

  // If current question was guess-a-number and we have placement data, show placement screen
  if (showGuessPlacement && guessPlacementData) {
    return <GuessANumberPlacement 
      points_earned={pointsEarned}
      total_points={totalPoints}
      placement={guessPlacementData.placement}
      totalPlayers={guessPlacementData.totalPlayers}
      accuracy={guessPlacementData.accuracy}
      yourGuess={guessPlacementData.yourGuess}
      correctAnswer={guessPlacementData.correctAnswer}
    />;
  }

  // Show phase transition
  if (showPhaseTransition) {
    return <PhaseTransitionMobile 
      firstTeamAnswer={firstTeamAnswer}
      activeTeam={activeTeam}
      teamName={teamName}
    />;
  }

  // Check first if this is a team mode drawing question and player is not on the active team
  if (question?.type === 'DRAWING' && teamName && question.team) {
    const isDrawer = question.player === playerName;
    const drawerTeam = question.team;
    
    // If player is not on the drawer's team and not the drawer, show waiting screen
    if (teamName !== drawerTeam && !isDrawer) {
      return <TeamWaitingScreen 
        phase={2} // For the message 
        teamName={teamName}
      />;
    }
  }

  if (showResult) {
    // Specific types checks first, before the default one
    if (question?.type === "MATH_QUIZ" && mathQuizResults) {
      if (wasEliminated) {
        return <MathQuizEliminatedAnswer 
          points_earned={pointsEarned}
          total_points={totalPoints}
          currentSequence={mathQuizResults.currentSequence}
          totalSequences={mathQuizResults.totalCount}
          isTeamMode={mathQuizResults.isTeamMode}
          teamName={mathQuizResults.teamName}
        />;
      } else {
        return <MathQuizCorrectAnswer 
          points_earned={pointsEarned}
          total_points={totalPoints}
          correctCount={mathQuizResults.correctCount}
          totalCount={mathQuizResults.totalCount}
          isTeamMode={mathQuizResults.isTeamMode}
          teamName={mathQuizResults.teamName}
        />;
      }
    }
    
    // Check if this player is the drawer for a drawing question
    const isDrawer = question?.type === 'DRAWING' && question?.player === playerName;
    
    // Check for word chain results next
    if (question?.type === 'WORD_CHAIN' && wordChainResults) {
      // Special handling for team mode word chain results
      if (wordChainResults.isTeamMode && wordChainResults.winningTeam && teamName) {
        const isOnWinningTeam = teamName === wordChainResults.winningTeam;
        const isOnExplodedTeam = teamName === wordChainResults.explodedTeam;
        
        // We're in team mode and have a clear winning team
        if (isOnWinningTeam) {
          // Player is on the winning team - show green screen
          return (
            <CorrectAnswer
              points_earned={pointsEarned}
              total_points={totalPoints}
              exactGuess={false}
              guessResult={null}
              customTitle="Váš tým vyhrál!"
              customMessage="Gratulujeme k vítězství!"
            />
          );
        } else if (isOnExplodedTeam) {
          // Player is on the losing team - show red screen
          return (
            <IncorrectAnswer
              points_earned={pointsEarned}
              total_points={totalPoints}
              exactGuess={false}
              guessResult={null}
              customTitle="Bomba vybuchla!"
              customMessage="Příště to vyjde!"
            />
          );
        }
      }
      
      // Default word chain result for free-for-all mode
      return <WordChainResult 
        {...wordChainResults} 
        playerName={playerName}
        pointsEarned={pointsEarned}
        totalPoints={totalPoints}
      />;
    }
    
    if (isCorrect === null) {
      // For the drawer in a drawing question, show the drawer result screen instead of "too late"
      if (isDrawer && drawerStats) {
        return <DrawerResultScreen 
          pointsEarned={drawerStats.pointsEarned}
          totalPoints={drawerStats.totalPoints}
          correctGuessCount={drawerStats.correct_count}
          totalGuessers={drawerStats.total_guessers}
          isLateSelection={drawerLate}
        />;
      }
      // For everyone else, show the normal "too late" screen
      if (question?.type === 'BLIND_MAP') {
        return <TooLateAnswer total_points={totalPoints} points_earned={pointsEarned} />;
      } else {
        return <TooLateAnswer total_points={totalPoints} />;
      }
    }
    // Default case for correct/incorrect answers
    return isCorrect ? 
      <CorrectAnswer 
        points_earned={pointsEarned} 
        total_points={totalPoints} 
        exactGuess={exactGuess} 
        guessResult={guessResult}
        customTitle={customTitle}
      /> : 
      <IncorrectAnswer 
        points_earned={pointsEarned} 
        total_points={totalPoints} 
        exactGuess={exactGuess} 
        guessResult={guessResult} 
        customTitle={customTitle}
      />;
  }

  if (loading) return <Loading />;

  /**
   * Render the appropriate quiz interface based on question type
   * 
   * Dynamically creates UI for:
   * - Multiple choice questions
   * - Open answer and Number answer questions
   * - Drawing (for both drawer and guessers)
   * - Word chain
   * - Math quizzes
   * - Blind map challenges
   * 
   * Also handles role-specific displays for team captains vs. regular players
   * 
   * @function renderQuizType
   * @returns {JSX.Element} The question-specific UI component
   */
  const renderQuizType = () => {
    if (!showButtons) {
      return null;
    }
    
    // Get the current question's type
    const questionType = question?.type;
    
    switch (questionType) {
      case 'TRUE_FALSE':
        return <TrueFalseQuizMobile onAnswer={handleAnswer} />;
      case 'ABCD':
        return <ABCDQuizMobile onAnswer={handleAnswer} />;
      case 'OPEN_ANSWER':
        return <OpenAnswerQuizMobile onAnswer={handleOpenAnswer} />;
      case 'DRAWING':
        // Check if this player is the drawer
        const isDrawer = question.player === playerName;
        
        if (isDrawer) {
          if (!selectedWord && question.words && question.words.length > 0) {
            return (
              <WordSelectionMobile 
                words={question.words} 
                playerName={playerName}
                onWordSelected={handleWordSelected}
                isLate={drawerLate} // Pass the late flag to show a warning
              />
            );
          } else if (selectedWord && canvasVisible) {
            // If word is selected and canvas should be visible, show drawing interface for drawer
            return <DrawerQuizMobile 
              selectedWord={selectedWord}
              playerName={playerName}
            />;
          } else if (selectedWord) {
            // Word is selected but we're still waiting in preview time
            return <DrawerWaitingScreen selectedWord={selectedWord} />;
          }
        } else {
          // If player is not the drawer but on the same team, use this component for answering
          return <DrawingAnswerQuizMobile 
            onAnswer={handleDrawingSubmit}
          />;
        }
        break;
      case 'WORD_CHAIN':
        return <WordChainQuizMobile 
          onAnswer={handleWordChainSubmit}
          question={question}
          playerName={playerName}
        />;
      case 'MATH_QUIZ':
        return <MathQuizMobile 
          onAnswer={handleMathAnswer}
          question={question}
          playerName={playerName}
        />;
      case 'GUESS_A_NUMBER':
        // Check if we're in free-for-all mode (not team mode)
        if (teamName === 'Unknown Team' || teamName === null) {
          // In free-for-all mode, always show the guess number interface
          return <GuessANumberQuizMobile onAnswer={handleNumberGuess} />;
        }
        
        // Team mode logic - different components based on phase, team, and role
        if (playerRole === 'captain' && quizPhase === 1 && teamName === activeTeam) {
          return <TeamCaptainGuessNumberMobile 
            onAnswer={handleCaptainChoice} 
            teamName={teamName} 
          />;
        } else if (quizPhase === 2 && teamName === activeTeam) {
          // Any player in active team can vote in phase 2
          return <MoreLessVoteMobile 
            onAnswer={handleMoreLessVote}
            firstTeamAnswer={firstTeamAnswer}
          />;
        } else if (quizPhase === 1 && teamName === activeTeam) {
          // Regular player on active team in phase 1
          return <GuessANumberQuizMobile onAnswer={handleNumberGuess} />;
        } else {
          // Show the waiting screen for inactive teams
          return <TeamWaitingScreen 
            phase={quizPhase} 
            teamName={teamName}
            message={quizPhase === 1 
              ? "Čekej, až bude tvůj tým na řadě" 
              : "Čekej, nyní hraje druhý tým"}
          />;
        }
      case 'BLIND_MAP':
        return (
          <BlindMapRoleHandler 
            onAnswer={handleBlindMapAnswer}
            playerName={playerName}
            questionId={question._id}
            teamName={teamName != "Unknown Team" ? teamName : null}
          />
        );
      default:
        console.warn('Unknown question type:', questionType);
        return <ABCDQuizMobile onAnswer={handleAnswer} />;
    }
  };

  return (
    <Box sx={{ height: '100vh' }}>
      {renderQuizType()}
    </Box>
  );
};

export default MobileGamePage;