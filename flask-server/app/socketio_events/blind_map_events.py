"""Socket.IO event handlers for Blind Map gameplay.

This module provides real-time event handling for Blind Map questions:

- Two-phase gameplay: anagram solving followed by map location guessing
- Team mode with captain-based final answers and team alternation
- Free-for-all mode with individual scoring and placement
- Progressive clue reveals and location validation
- Map coordinate validation against correct locations
- Point distribution based on answer accuracy and speed
- Real-time captain position preview for team collaboration

Blind Map is a geography-based game where players first solve an anagram
of a city name, then try to locate that city on a map, with different
mechanics for team vs individual play modes.
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import PHASE_TRANSITION_TIME, ANAGRAM_PHASE_POINTS, MAP_PHASE_POINTS, BLIND_MAP_TEAM_MODE_POINTS, QUIZ_VALIDATION
from time import time
from .utils import emit_all_answers_received, get_scores_data
from bson import ObjectId
from ..db import db
from typing import Dict, Any

def calculate_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """
    Calculate the Euclidean distance between two points on the map.
    
    Uses the standard Euclidean distance formula to determine how far
    a player's guess is from the correct location.
    
    Args:
        x1: X-coordinate of first point
        y1: Y-coordinate of first point
        x2: X-coordinate of second point
        y2: Y-coordinate of second point
        
    Returns:
        float: The distance between the two points
    """
    # Simple Euclidean distance in map coordinates
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5

def check_location_guess(question_id: str, user_x: float, user_y: float) -> Dict[str, Any]:
    """
    Check if a location guess is within the correct radius.
    
    Validates a player's location guess against the correct answer,
    using different radius settings based on the question's difficulty.
    Supports exact matches inside a radius and provides feedback on the guess.
    
    Args:
        question_id: MongoDB ID of the question
        user_x: X-coordinate of player's guess
        user_y: Y-coordinate of player's guess
        
    Returns:
        dict:

            - correct: Whether the guess was correct
            - message: Feedback message about the guess
            - correctLocation: Coordinates of the correct answer
            - score: (For partial matches) Calculated score
    """
    # Get the question
    question = db.questions.find_one({"_id": ObjectId(question_id)})
    if not question:
        return {"correct": False, "message": "Otázka nenalezena", "correctLocation": {"x": 0, "y": 0}}
    
    # Get the correct location
    correct_x = question.get("location_x", 0)
    correct_y = question.get("location_y", 0)
    
    # Get the radius preset
    radius_preset = question.get("radius_preset", "HARD")
    
    # Calculate distance
    distance = calculate_distance(user_x, user_y, correct_x, correct_y)
    
    # Get the presets
    presets = QUIZ_VALIDATION["BLIND_MAP_RADIUS_PRESETS"]
    
    # Check if within radius
    exact_radius = presets[radius_preset]["exact"]
    if distance <= exact_radius:
        return {
            "correct": True,
            "message": "Přesné umístění!",
            "correctLocation": {"x": correct_x, "y": correct_y}
        }
    
    # No score
    return {
        "correct": False,
        "message": "Špatné umístění",
        "correctLocation": {"x": correct_x, "y": correct_y}
    }

def initialize_blind_map():
    """
    Initialize blind map state for a new question.
    
    Resets all the tracking properties needed for blind map questions:

    - Phase tracking (anagram vs location placement)
    - Correct player tracking and ordering
    - Point accumulation
    - Team and captain guesses
    - Results preparation
    """
    game_state.blind_map_state = {
        'phase': 1,
        'correct_players': set(),
        'correct_order': [],
        'anagram_points': {},
        'player_locations': {},
        'location_results': {},
        'winning_team': None,
        'team_guesses': {'blue': [], 'red': []},
        'captain_guesses': {},
        'clue_index': 0,
        'results': {}
    }

@socketio.on('submit_blind_map_anagram')
def submit_blind_map_anagram(data):
    """
    Handle player submission of city name anagram solution.
    
    Processes the first phase of the Blind Map question where players
    must identify the city name from an anagram before proceeding
    to locate it on the map.
    
    Args:
        data (dict):

            - player_name: Name of the player submitting the answer
            - answer: The player's solution to the anagram
            
    Emits:
        - 'blind_map_feedback': Success/error feedback to the player
    """
    player_name = data['player_name']
    answer = data.get('answer', '').strip().lower()
    current_question = game_state.questions[game_state.current_question]
    
    # Get the correct city name, normalized for comparison
    correct_answer = current_question.get('city_name', '').strip().lower()
    
    if not correct_answer:
        emit('blind_map_feedback', {
            "message": "Chyba: Nebyl nalezen název města",
            "severity": "error"
        }, room=player_name)
        return
    
    # Check if the answer is correct
    is_correct = answer == correct_answer
    
    if game_state.is_team_mode:
        # Team mode logic
        handle_team_anagram_submission(player_name, is_correct, current_question)
    else:
        # Free-for-all mode logic
        handle_ffa_anagram_submission(player_name, is_correct, current_question)

def handle_team_anagram_submission(player_name, is_correct, question):
    """
    Process anagram submission in team mode.
    
    In team mode, the first team to correctly solve the anagram
    gets to place their guess on the map first. Handles phase
    transition when a team successfully solves the anagram.
    
    Args:
        player_name: Name of the player submitting the answer
        is_correct: Whether the answer is correct
        question: The current blind map question object
        
    Emits:
        - 'blind_map_feedback': Feedback to the player about their submission
        - 'blind_map_phase_transition': Phase change notification if correct
    """
    team = 'blue' if player_name in game_state.blue_team else 'red'
    
    # If player is not in a team or already submitted correct answer
    if team not in ['blue', 'red'] or player_name in game_state.blind_map_state['correct_players']:
        return
    
    if is_correct:
        # Record first correct team if not already set
        if not game_state.blind_map_state['winning_team']:
            game_state.blind_map_state['winning_team'] = team
            game_state.blind_map_state['correct_players'].add(player_name)
            
            # Keep track of active team for the next phase
            game_state.active_team = team
            
            # Prepare for phase transition
            current_time = int(time() * 1000)
            transition_end_time = current_time + PHASE_TRANSITION_TIME
            
            # Set the phase to 2
            game_state.blind_map_state['phase'] = 2
            
            # Get captain names for both teams
            blue_captain = None
            red_captain = None
            
            if game_state.blue_team and len(game_state.blue_team) > game_state.blue_captain_index:
                blue_captain = game_state.blue_team[game_state.blue_captain_index]
                
            if game_state.red_team and len(game_state.red_team) > game_state.red_captain_index:
                red_captain = game_state.red_team[game_state.red_captain_index]
            
            # Notify the UI about the phase transition
            socketio.emit('blind_map_phase_transition', {
                'correctAnswer': question.get('city_name', ''),
                'activeTeam': game_state.active_team,
                'transitionEndTime': transition_end_time,
                'mapType': question.get('map_type', 'cz'),
                'phase': 2,
                'blue_captain': blue_captain,
                'red_captain': red_captain
            })
            
            # Send feedback to the player
            emit('blind_map_feedback', {
                "message": "Správná odpověď! Nyní určete polohu města na mapě.",
                "severity": "success",
                "isCorrect": True,
                "correctAnswer": question.get('city_name', '')
            }, room=player_name)
        else:
            # Another player from the same team or opposing team got the answer correct later, but should't happen
            game_state.blind_map_state['correct_players'].add(player_name)
            
            # Send feedback to the player
            emit('blind_map_feedback', {
                "message": "Správně! Ale někdo byl rychlejší.",
                "severity": "info",
                "isCorrect": True,
                "correctAnswer": question.get('city_name', '')
            }, room=player_name)
    else:
        # Incorrect answer
        emit('blind_map_feedback', {
            "message": "Nesprávná odpověď, zkus to znovu.",
            "severity": "error",
            "isCorrect": False
        }, room=player_name)

def handle_ffa_anagram_submission(player_name, is_correct, question):
    """
    Process anagram submission in free-for-all mode.
    
    In free-for-all mode, each player can solve the anagram individually
    to proceed to the map guessing phase. Points are awarded based on solving
    order, with faster solutions earning more points.
    
    Args:
        player_name: Name of the player submitting the answer
        is_correct: Whether the answer is correct
        question: The current blind map question object
        
    Emits:
        - 'blind_map_feedback': Feedback to the player about their submission
        - 'blind_map_anagram_solved': Notification that a player solved the anagram
    """
    if is_correct:
        # Check if player already solved the anagram
        if player_name not in game_state.blind_map_state['correct_players']:
            # Add to correct players list and record the order
            game_state.blind_map_state['correct_players'].add(player_name)
            game_state.blind_map_state['correct_order'].append(player_name)
            
            # Calculate points based on order
            calculate_anagram_points(player_name)
            
            # Increment the answers received counter for UI
            game_state.answers_received += 1
            socketio.emit('blind_map_anagram_solved')
            
            # Send feedback to the player
            emit('blind_map_feedback', {
                "message": "Správná odpověď! Nyní určete polohu města na mapě.",
                "severity": "success",
                "isCorrect": True,
                "correctAnswer": question.get('city_name', ''),
                "phase": 2
            }, room=player_name)
            
            # Check if all players have solved the anagram
            if len(game_state.blind_map_state['correct_players']) >= len(game_state.players):
                # All players have solved it, transition to phase 2
                transition_to_phase2_ffa(question)
            
        else:
            # Player already submitted a correct answer
            emit('blind_map_feedback', {
                "message": "Správně! Již jste odpověděli.",
                "severity": "info",
                "isCorrect": True,
                "correctAnswer": question.get('city_name', '')
            }, room=player_name)
    else:
        # Incorrect answer
        emit('blind_map_feedback', {
            "message": "Nesprávná odpověď, zkus to znovu.",
            "severity": "error",
            "isCorrect": False
        }, room=player_name)

def transition_to_phase2_ffa(question):
    """
    Transition from anagram phase to map guessing phase in free-for-all mode.
    
    Notifies all clients that the anagram phase is complete and the map
    guessing phase is beginning. Adjusts game timers for the new phase.
    
    Args:
        question: The current blind map question object
        
    Emits:
        - 'blind_map_phase_transition': Phase change notification with timing info
    """
    current_time = int(time() * 1000)
    transition_end_time = current_time + PHASE_TRANSITION_TIME
    
    # Set the phase to 2
    game_state.blind_map_state['phase'] = 2
    
    # Notify all about the phase transition
    socketio.emit('blind_map_phase_transition', {
        'correctAnswer': question.get('city_name', ''),
        'transitionEndTime': transition_end_time,
        'mapType': question.get('map_type', 'cz'),
        'phase': 2
    })

def calculate_anagram_points(player_name):
    """
    Calculate points earned for solving the anagram based on solving order.
    
    Points decrease as more players solve the anagram, rewarding speed.
    These points are stored but not awarded until after the map phase.
    
    Args:
        player_name: Name of the player who solved the anagram
    """
    order = len(game_state.blind_map_state['correct_order'])
    total_players = len(game_state.players)
    
    # Calculate points based on position (first player gets full points, decreasing for later players)
    if total_players <= 1:
        points = ANAGRAM_PHASE_POINTS  # Full points if only one player
    else:
        decrement = ANAGRAM_PHASE_POINTS / total_players
        points = ANAGRAM_PHASE_POINTS - ((order - 1) * decrement)
    
    # Ensure minimum points and round
    points = max(10, round(points))
    
    # Store the points for later calculation
    game_state.blind_map_state['anagram_points'][player_name] = points
    
    # Note: Don't add points to player score yet; that happens after phase 2

@socketio.on('submit_blind_map_location')
def submit_blind_map_location(data):
    """
    Handle player submission of a location guess on the map.
    
    Routes the guess to the appropriate handler based on game mode.
    This is the second phase of the Blind Map question after solving
    the anagram.
    
    Args:
        data (dict):

            - player_name: Name of the player submitting the guess
            - x: X-coordinate of the guess
            - y: Y-coordinate of the guess
            - questionId: MongoDB ID of the question
            
    Emits:
        - 'blind_map_feedback': Error feedback if coordinates are invalid
    """
    player_name = data['player_name']
    x = data.get('x')
    y = data.get('y')
    question_id = data.get('questionId')
    
    if x is None or y is None:
        emit('blind_map_feedback', {
            "message": "Chyba: Neplatné souřadnice",
            "severity": "error"
        }, room=player_name)
        return
    
    current_question = game_state.questions[game_state.current_question]
    
    # Create player_guess regardless of mode
    team = 'blue' if player_name in game_state.blue_team else 'red' if player_name in game_state.red_team else None
    player_guess = {
        'playerName': player_name,
        'x': x,
        'y': y,
        'team': team,
        'color': game_state.players[player_name]['color']
    }
    
    # Continue with normal processing based on mode
    if game_state.is_team_mode:
        # Team mode logic
        handle_team_location_submission(player_name, player_guess, current_question)
    else:
        # Free-for-all mode logic
        handle_ffa_location_submission(player_name, player_guess, question_id)

def handle_team_location_submission(player_name, player_guess, question):
    """
    Process location submission in team mode.
    
    Team captains' guesses are considered final for their team.
    For the active team, validates the guess against the correct location
    and determines if they win points. If incorrect, transitions to the
    other team's turn.
    
    Args:
        player_name: Name of the player submitting the guess
        player_guess: Object containing the guess coordinates and metadata
        question: The current blind map question object
        
    Emits:
        - 'blind_map_feedback': Feedback to the player
        - 'blind_map_location_submitted': Broadcasts the guess to all clients
        - 'answer_correctness': Results notification to team members
        - 'blind_map_phase_transition': Phase change if first team was incorrect
    """
    team = 'blue' if player_name in game_state.blue_team else 'red'
    phase = game_state.blind_map_state['phase']
    
    # If not in phase 2 or 3, ignore the submission
    if phase not in [2, 3]:
        return
        
    # If not the active team's turn, ignore the submission
    if team != game_state.active_team:
        emit('blind_map_feedback', {
            "message": "Nyní je na řadě druhý tým",
            "severity": "warning"
        }, room=player_name)
        return
    
    # Add the guess to the team's guesses
    if team not in game_state.blind_map_state['team_guesses']:
        game_state.blind_map_state['team_guesses'][team] = []
    game_state.blind_map_state['team_guesses'][team].append(player_guess)
    
    # Check if this player is the captain
    is_captain = False
    if team == 'blue' and game_state.blue_team:
        captain_index = game_state.blue_captain_index
        if len(game_state.blue_team) > captain_index and game_state.blue_team[captain_index] == player_name:
            is_captain = True
    elif team == 'red' and game_state.red_team:
        captain_index = game_state.red_captain_index
        if len(game_state.red_team) > captain_index and game_state.red_team[captain_index] == player_name:
            is_captain = True
    
    # Update the captain's final guess if this is the captain
    if is_captain:
        game_state.blind_map_state['captain_guesses'][team] = player_guess
    
    # Broadcast the guess to all clients to show on the map
    socketio.emit('blind_map_location_submitted', {
        'guess': player_guess,
        'team': team,
        'isCaptain': is_captain
    })
    
    # Provide feedback to the player
    emit('blind_map_feedback', {
        "message": "Vaše finální odpověď byla zaznamenána" if is_captain else "Vaše odpověď byla zaznamenána",
        "severity": "success"
    }, room=player_name)

    
    # If this is the captain, process the guess immediately to check if it's correct
    if is_captain:
        # Check if the location is correct
        result = check_location_guess(
            str(question['_id']), 
            player_guess['x'], 
            player_guess['y']
        )
        
        # If the location is correct, award points and end the phase
        if result['correct']:
            # Award points to the team
            game_state.team_scores[team] += BLIND_MAP_TEAM_MODE_POINTS
            
            # Get the members of both teams
            if team == 'blue':
                winning_team_members = game_state.blue_team
                losing_team_members = game_state.red_team
            else:
                winning_team_members = game_state.red_team
                losing_team_members = game_state.blue_team
            
            # Notify all winning team members about the success
            for team_member in winning_team_members:
                emit('answer_correctness', {
                    "correct": True,
                    "points_earned": BLIND_MAP_TEAM_MODE_POINTS,
                    "total_points": game_state.team_scores[team],
                    "message": f"Váš kapitán {player_name} správně určil polohu města!",
                    "custom_title": "Váš tým uhodl lokaci",
                    "is_team_score": True
                }, room=team_member)
            
            # Notify all losing team members that they were beaten
            for team_member in losing_team_members:
                emit('answer_correctness', {
                    "correct": False,
                    "points_earned": 0,
                    "total_points": game_state.team_scores['blue' if team == 'red' else 'red'],
                    "message": f"Kapitán protihráčů {player_name} správně určil polohu města!",
                    "custom_title": "Druhý tým uhodl lokaci",
                    "is_team_score": True
                }, room=team_member)
            
            # Prepare question data for results page
            prepare_blind_map_results(question, result)
            
            # End the question and show scores
            scores = get_scores_data()
            emit_all_answers_received(
                scores=scores,
                correct_answer=question.get('city_name', ''),
                additional_data=game_state.blind_map_state['results']
            )
        else:
            # If in phase 2 and first team was incorrect, transition to phase 3 for other team
            if phase == 2:
                # Switch to the other team
                next_team = 'red' if team == 'blue' else 'blue'
                game_state.active_team = next_team
                game_state.blind_map_state['phase'] = 3
                
                # Prepare for phase transition
                current_time = int(time() * 1000)
                transition_end_time = current_time + PHASE_TRANSITION_TIME
                
                # Get captain names for both teams
                blue_captain = None
                red_captain = None
                
                if game_state.blue_team and len(game_state.blue_team) > game_state.blue_captain_index:
                    blue_captain = game_state.blue_team[game_state.blue_captain_index]
                    
                if game_state.red_team and len(game_state.red_team) > game_state.red_captain_index:
                    red_captain = game_state.red_team[game_state.red_captain_index]
                
                # Notify the UI about the phase transition to third phase
                socketio.emit('blind_map_phase_transition', {
                    'correctAnswer': question.get('city_name', ''),
                    'activeTeam': game_state.active_team,
                    'transitionEndTime': transition_end_time,
                    'mapType': question.get('map_type', 'cz'),
                    'phase': 3,
                    'previousGuesses': game_state.blind_map_state['team_guesses'][team],
                    'blue_captain': blue_captain,
                    'red_captain': red_captain
                })
                
            else:
                # Both teams were incorrect, end the question
                prepare_blind_map_results(question, result)
                
                # Check if both captains submitted guesses for comparison
                blue_captain_guess = game_state.blind_map_state['captain_guesses'].get('blue')
                red_captain_guess = game_state.blind_map_state['captain_guesses'].get('red')
                
                if blue_captain_guess and red_captain_guess:
                    # Create a reference point for the correct location
                    correct_x = question.get('location_x', 0)
                    correct_y = question.get('location_y', 0)
                    
                    # Calculate distances using the existing service function
                    blue_distance = calculate_distance(
                        blue_captain_guess['x'], 
                        blue_captain_guess['y'], 
                        correct_x, 
                        correct_y
                    )
                    red_distance = calculate_distance(
                        red_captain_guess['x'], 
                        red_captain_guess['y'], 
                        correct_x, 
                        correct_y
                    )
                    
                    # Determine which team was closer
                    closer_team = 'blue' if blue_distance < red_distance else 'red'
                    farther_team = 'red' if closer_team == 'blue' else 'blue'
                    
                    # Award points to the closer team
                    game_state.team_scores[closer_team] += MAP_PHASE_POINTS
                    
                    # Get team members
                    closer_team_members = game_state.blue_team if closer_team == 'blue' else game_state.red_team
                    farther_team_members = game_state.red_team if closer_team == 'blue' else game_state.blue_team
                    
                    # Notify closer team members
                    for team_member in closer_team_members:
                        emit('answer_correctness', {
                            "correct": True,
                            "points_earned": MAP_PHASE_POINTS,
                            "total_points": game_state.team_scores[closer_team],
                            "message": "Váš tým byl blíže ke správné poloze!",
                            "custom_title": "Bližší odhad",
                            "is_team_score": True
                        }, room=team_member)
                    
                    # Notify farther team members
                    for team_member in farther_team_members:
                        emit('answer_correctness', {
                            "correct": False,
                            "points_earned": 0,
                            "total_points": game_state.team_scores[farther_team],
                            "message": "Soupeřův tým byl blíže ke správné poloze.",
                            "custom_title": "Vzdálenější odhad",
                            "is_team_score": True
                        }, room=team_member)
                else:
                    # If at least one captain didn't submit, standard "no one guessed" message
                    for player in game_state.players:
                        emit('answer_correctness', {
                            "correct": False,
                            "points_earned": 0,
                            "total_points": game_state.team_scores['blue' if player in game_state.blue_team else 'red'],
                            "message": "Žádný tým neuhodl správnou polohu města.",
                            "custom_title": "Nikdo neuhodl lokaci",
                            "is_team_score": True
                        }, room=player)
                
                # End the question and show scores
                scores = get_scores_data()
                emit_all_answers_received(
                    scores=scores,
                    correct_answer=question.get('city_name', ''),
                    additional_data=game_state.blind_map_state['results']
                )

def handle_ffa_location_submission(player_name, player_guess, question_id):
    """
    Process location submission in free-for-all mode.
    
    Each player's guess is evaluated individually against the correct location.
    Total points combine anagram points and location accuracy points.
    
    Args:
        player_name: Name of the player submitting the guess
        player_guess: Object containing the guess coordinates and metadata
        question_id: MongoDB ID of the question
        
    Emits:
        - 'blind_map_feedback': Feedback if player already submitted
        - 'blind_map_location_submitted': Broadcasts the guess to all clients
        - 'answer_correctness': Results notification to the player
    """
    # Check if the player already submitted a location
    if player_name in game_state.blind_map_state['player_locations']:
        emit('blind_map_feedback', {
            "message": "Již jste odeslali svou odpověď",
            "severity": "warning"
        }, room=player_name)
        return
    
    # Store the player's guess
    game_state.blind_map_state['player_locations'][player_name] = player_guess
    
    # Check the accuracy
    result = check_location_guess(
        question_id, 
        player_guess['x'], 
        player_guess['y']
    )
    
    # Calculate final score based on anagram points and location accuracy
    anagram_points = game_state.blind_map_state['anagram_points'].get(player_name, 0)
    location_points = MAP_PHASE_POINTS if result['correct'] else 0
    total_points = anagram_points + location_points
    
    # Store the result for this player
    game_state.blind_map_state['location_results'][player_name] = {
        'correct': result['correct'],
        'score': location_points,
        'total_points': total_points,
        'message': result['message'],
        'correctLocation': result['correctLocation']
    }
    
    # Add the points to the player's score
    game_state.players[player_name]['score'] += total_points
    
    # Increment answers received and notify UI
    game_state.answers_received += 1
    # Emit the event for FFA mode too, with a different structure than team mode
    socketio.emit('blind_map_location_submitted', {
        'guess': player_guess
    })
    
    # Send feedback to the player
    emit('answer_correctness', {
        "correct": result['correct'],
        "points_earned": total_points,
        "total_points": game_state.players[player_name]['score'],
        "message": result['message'],
        "is_team_score": False
    }, room=player_name)
    
    # Check if all players have submitted their locations
    if len(game_state.blind_map_state['player_locations']) >= len(game_state.players):
        # All players have submitted, show results
        current_question = game_state.questions[game_state.current_question]
        prepare_blind_map_results(current_question, None, free_for_all=True)
        
        # End the question and show scores
        scores = get_scores_data()
        emit_all_answers_received(
            scores=scores,
            correct_answer=current_question.get('city_name', ''),
            additional_data=game_state.blind_map_state['results']
        )

def prepare_blind_map_results(question, last_result=None, free_for_all=False):
    """
    Prepare final result data for the blind map question.
    
    Collects all relevant data about the question outcome for display
    on the results screen, with different data structures for team
    and free-for-all modes.
    
    Args:
        question: The current blind map question object
        last_result: Result from the last location check (team mode)
        free_for_all: Whether this is free-for-all mode
        
    Returns:
        Nothing, but The prepared results are stored in game_state.blind_map_state['results']
    """
    results = {
        'city_name': question.get('city_name', ''),
        'map_type': question.get('map_type', 'cz'),
        'correct_location': {
            'x': question.get('location_x', 0),
            'y': question.get('location_y', 0)
        },
        'radius_preset': question.get('radius_preset', 'HARD'),
        'is_team_mode': game_state.is_team_mode
    }
    
    if free_for_all:
        # Add all player locations
        results['player_locations'] = list(game_state.blind_map_state['player_locations'].values())
        results['location_results'] = game_state.blind_map_state['location_results']
        results['anagram_points'] = game_state.blind_map_state['anagram_points']
    else:
        # Add team specific data
        results['team_guesses'] = game_state.blind_map_state['team_guesses']
        results['captain_guesses'] = game_state.blind_map_state['captain_guesses']
        results['winning_team'] = determine_winning_team(last_result)
    
    # Store the results in the game state for the score page
    game_state.blind_map_state['results'] = results

def determine_winning_team(last_result):
    """
    Determine which team won the blind map question based on their guess.
    
    Args:
        last_result: Result from the location check for the team's guess
        
    Returns:
        str: Team name ('red' or 'blue') if a team won, None otherwise
    """
    if not last_result:
        return None
    
    if last_result['correct']:
        return game_state.active_team
    
    return None

def handle_blind_map_time_up(scores):
    """
    Handle time expiration for Blind Map questions.
    
    Processes different behaviors based on the current phase and game mode:
    
    - In team mode phase 1: End the question if no team solved the anagram
    - In team mode phase 2: Switch to the other team if the first team didn't submit
    - In team mode phase 3: End the question and determine a winner by proximity
    - In free-for-all: Ensure all players who solved the anagram get points
    
    Args:
        scores: Current game scores for inclusion in results
        
    Emits:
        - Multiple possible events depending on phase and mode
    """
    current_question = game_state.questions[game_state.current_question]
    phase = game_state.blind_map_state['phase']
    
    if game_state.is_team_mode:
        if phase == 1:
            # No team solved the anagram, end the question
            prepare_blind_map_results(current_question)
            emit_all_answers_received(
                scores=scores,
                correct_answer=current_question.get('city_name', ''),
                additional_data=game_state.blind_map_state['results']
            )
        elif phase == 2:
            # First team didn't submit a location, switch to second team
            next_team = 'red' if game_state.active_team == 'blue' else 'blue'
            game_state.active_team = next_team
            game_state.blind_map_state['phase'] = 3
            
            # Prepare for phase transition
            current_time = int(time() * 1000)
            transition_end_time = current_time + PHASE_TRANSITION_TIME
            
            # Get captain names for both teams
            blue_captain = None
            red_captain = None
            
            if game_state.blue_team and len(game_state.blue_team) > game_state.blue_captain_index:
                blue_captain = game_state.blue_team[game_state.blue_captain_index]
                
            if game_state.red_team and len(game_state.red_team) > game_state.red_captain_index:
                red_captain = game_state.red_team[game_state.red_captain_index]
            
            # Notify the UI about the phase transition
            socketio.emit('blind_map_phase_transition', {
                'correctAnswer': current_question.get('city_name', ''),
                'activeTeam': game_state.active_team,
                'transitionEndTime': transition_end_time,
                'mapType': current_question.get('map_type', 'cz'),
                'phase': 3,
                'blue_captain': blue_captain,
                'red_captain': red_captain
            })
            
        else:
            # Second team didn't submit a location or both teams failed, end the question
            prepare_blind_map_results(current_question)
            
            # Notify ALL players that no team guessed correctly
            for player in game_state.players:
                emit('answer_correctness', {
                    "correct": False,
                    "points_earned": 0,
                    "total_points": game_state.team_scores['blue' if player in game_state.blue_team else 'red'],
                    "message": "Čas vypršel. Žádný tým neuhodl správnou polohu města.",
                    "custom_title": "Nikdo neuhodl lokaci",
                    "is_team_score": True
                }, room=player)
            
            emit_all_answers_received(
                scores=scores,
                correct_answer=current_question.get('city_name', ''),
                additional_data=game_state.blind_map_state['results']
            )
    else:
        # Free-for-all mode
        if phase == 1:
            # Some players didn't solve the anagram, transition to phase 2 anyway
            transition_to_phase2_ffa(current_question)
        else:
            # Phase 2 timed out, prepare results with available data
            prepare_blind_map_results(current_question, None, free_for_all=True)
            
            # Update scores to include the anagram points for players who didn't submit location
            for player_name, anagram_points in game_state.blind_map_state['anagram_points'].items():
                # If player didn't submit location, they should still get anagram points
                if player_name not in game_state.blind_map_state['player_locations'] and player_name in game_state.players:
                    # Add just the anagram points to their score
                    game_state.players[player_name]['score'] += anagram_points
            
            emit_all_answers_received(
                scores=scores,
                correct_answer=current_question.get('city_name', ''),
                additional_data=game_state.blind_map_state['results']
            )

@socketio.on('request_next_clue')
def request_next_clue(data):
    """
    Handle manual request for revealing the next clue in Blind Map questions.
    
    Manages the progressive reveal of location clues to help players identify
    the location on the map. Ensures clues are revealed in order and only if
    they actually contain content.
    
    Args:
        data (dict):
        
            - clueIndex: Current clue index (0-2)
    
    Emits:
        - 'blind_map_clue_revealed': New clue content with index to all clients
    """
    current_clue_index = data.get('clueIndex', 0)
    next_clue_index = current_clue_index
    
    # Make sure we don't go beyond the available clues
    if next_clue_index >= 3:
        return
        
    # Get the current question
    if game_state.current_question is not None and 0 <= game_state.current_question < len(game_state.questions):
        current_question = game_state.questions[game_state.current_question]
        
        if current_question and current_question.get('type') == 'BLIND_MAP':
            # Get the clue content for the next clue
            clue_key = f'clue{next_clue_index + 1}'
            clue_content = current_question.get(clue_key, '')
            
            if clue_content and clue_content.strip():
                # Update the clue index in game state
                game_state.blind_map_state['clue_index'] = next_clue_index + 1
                
                # Emit the clue to all clients (only main screen listens)
                socketio.emit('blind_map_clue_revealed', {
                    'clue_index': next_clue_index,
                    'clue': clue_content
                })

@socketio.on('captain_location_preview')
def handle_captain_preview(data):
    """
    Handle real-time preview of captain's selected location for team mode.
    
    Provides live feedback to team members about where their captain is considering
    placing their guess on the map. Useful for team collaboration during the
    location-guessing phase.
    
    Args:
        data (dict):

            - team: Team identifier ('blue' or 'red')
            - x: X-coordinate of captain's cursor position
            - y: Y-coordinate of captain's cursor position
    
    Emits:
        - 'captain_preview_update': Captain's cursor position to all clients
          for real-time visualization on the map
    """
    team = data.get('team')
    x = data.get('x')
    y = data.get('y')
    
    if team in ['blue', 'red'] and x is not None and y is not None:
        socketio.emit('captain_preview_update', {
            'team': team,
            'x': x,
            'y': y
        })