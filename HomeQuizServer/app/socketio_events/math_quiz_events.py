"""Socket.IO event handlers for Math Quiz gameplay.

This module provides real-time handling for Math Quiz questions:

- Sequential math problems with elimination mechanics
- Team vs individual scoring with time-based point calculation
- Player/team elimination for incorrect answers or timeouts
- Progressive difficulty with multiple sequences per question
- Answer validation for both numerical and text responses
- Game state tracking and synchronization across clients

Math Quiz is an elimination-style game where players must correctly answer
sequential math problems, with players eliminated for wrong answers or timeouts.

Author: Bc. Martin Baláž
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_MATH_CORRECT_ANSWER, PREVIEW_TIME, START_GAME_TIME
from .utils import emit_all_answers_received, get_scores_data
from time import time

@socketio.on('submit_math_answer')
def handle_math_answer(data):
    """
    Handle submission of a math answer from a player.
    
    Validates the submitted answer against the correct answer for the current sequence.
    Awards points based on speed for correct answers, eliminates players for incorrect answers.
    Handles both team mode and individual scoring models.
    
    Args:
        data (dict):

            - player_name: Name of the player submitting the answer
            - answer: The submitted answer (string, will be normalized)
            - answer_time: Timestamp when answer was submitted
    
    Emits:
        - 'math_feedback': Feedback to the player about their answer
        - Updates via broadcast_math_quiz_update() to all clients
    """
    player_name = data['player_name']
    raw_answer = data.get('answer', '')
    answer_time = data.get('answer_time', int(time()))
    
    # Skip if player is already eliminated
    if player_name in game_state.math_quiz_state['eliminated_players']:
        emit('math_feedback', {
            'message': 'Byl jsi vyřazen z kvízu',
            'correct': False
        }, room=player_name)
        return
        
    current_index = game_state.math_quiz_state['current_sequence']
    sequence = game_state.questions[game_state.current_question]['sequences'][current_index]

    # Skip if player already answered this sequence
    sequence_answers = game_state.math_quiz_state['player_answers'].get(current_index, [])
    if any(ans['player'] == player_name for ans in sequence_answers):
        emit('math_feedback', {
            'message': 'Už jsi na tuto rovnici odpověděl',
            'correct': True
        }, room=player_name)
        return
    
    # Process and validate the answer
    # Normalize submitted answer (replace comma with dot, convert to float if numeric)
    submitted_answer = raw_answer.strip().replace(',', '.')
    correct_answer = str(sequence['answer']).strip().replace(',', '.')
    
    # Check if the answer format matches (handles numeric value)
    try:
        # Try to convert both to float for numeric comparison
        submitted_float = float(submitted_answer)
        correct_float = float(correct_answer)
        is_correct = abs(submitted_float - correct_float) < 0.001  # Small epsilon for float comparison

    except (ValueError, TypeError):
        # False if conversion fails, probably a string was submitted
        is_correct = False
    
    # Record the answer for this sequence
    if current_index not in game_state.math_quiz_state['player_answers']:
        game_state.math_quiz_state['player_answers'][current_index] = []
    
    # Add player's answer to the list
    game_state.math_quiz_state['player_answers'][current_index].append({
        'player': player_name,
        'answer': submitted_answer,
        'time': answer_time,
        'correct': is_correct,
        'team': 'blue' if player_name in game_state.blue_team else ('red' if player_name in game_state.red_team else None)
    })
    
    # Determine player's team
    team = None
    if game_state.is_team_mode:
        if player_name in game_state.blue_team:
            team = 'blue'
        elif player_name in game_state.red_team:
            team = 'red'
    
    # Process team answers if in team mode
    if game_state.is_team_mode and team:
        # Initialize team answers structure if needed
        if team not in game_state.math_quiz_state['team_answers']:
            game_state.math_quiz_state['team_answers'][team] = {}
        
        if current_index not in game_state.math_quiz_state['team_answers'][team]:
            game_state.math_quiz_state['team_answers'][team][current_index] = []
            
        # Add this answer to the team's answers for this sequence
        game_state.math_quiz_state['team_answers'][team][current_index].append({
            'player': player_name,
            'answer': submitted_answer,
            'time': answer_time,
            'correct': is_correct
        })
    
    if is_correct:
        # Award points - more points for faster answers
        # Calculate how much time was used as percentage of total time
        total_time_ms = sequence['length'] * 1000  # Convert to milliseconds
        start_time = game_state.math_quiz_state['sequence_start_times'][current_index]
        time_used = answer_time - start_time
        time_percent = max(0, min(1, time_used / total_time_ms))
        
        # Award more points for faster answers
        base_points = POINTS_FOR_MATH_CORRECT_ANSWER
        multiplier = 1 - 0.5 * time_percent  # Should be between 0.5 and 1.0, I don't to penalize too much for slow answers
        points = int(base_points * multiplier)
        
        # Award points based on game mode
        if game_state.is_team_mode and team:
            # TEAM MODE SCORING:
            # We need to track which teams have already scored for each sequence
            # For this, we'll create a new key in math_quiz_state if it doesn't exist
            
            if 'teams_scored' not in game_state.math_quiz_state:
                game_state.math_quiz_state['teams_scored'] = {}
                
            if current_index not in game_state.math_quiz_state['teams_scored']:
                game_state.math_quiz_state['teams_scored'][current_index] = set()
                
            # Check if this team has already scored for this sequence
            if team not in game_state.math_quiz_state['teams_scored'][current_index]:
                # This is the first correct answer from this team for this sequence
                game_state.team_scores[team] += points
                # Update math_quiz_points for teams
                game_state.math_quiz_points['team_points'][team] += points
                # Mark that this team has scored for this sequence
                game_state.math_quiz_state['teams_scored'][current_index].add(team)
            else:
                print(f"Team {team} already scored for sequence {current_index}, no points awarded")
        else:
            # INDIVIDUAL SCORING (Free-for-all mode)
            game_state.players[player_name]['score'] += points
            # Track points in math_quiz_points
            if player_name not in game_state.math_quiz_points['player_points']:
                game_state.math_quiz_points['player_points'][player_name] = 0
            game_state.math_quiz_points['player_points'][player_name] += points
        
        # Send feedback to the player
        emit('math_feedback', {
            'message': f'Správně! +{points} bodů',
            'correct': True,
            'points': points
        }, room=player_name)
        
        # Set sequence as completed when at least one player gets it right
        if current_index < len(game_state.questions[game_state.current_question]['sequences']):
            game_state.questions[game_state.current_question]['sequences'][current_index]['completed'] = True
    else:
        # Incorrect answer - player is eliminated
        game_state.math_quiz_state['eliminated_players'].add(player_name)
        
        # Send feedback to the player
        emit('math_feedback', {
            'message': 'Špatná odpověď! Jsi vyřazen.',
            'correct': False
        }, room=player_name)
    
    # Broadcast updated state to all
    broadcast_math_quiz_update()

@socketio.on('math_sequence_completed')
def handle_sequence_completed(data):
    """
    Handle completion of a math sequence when time expires.
    
    Processes sequence completion by:

    - Eliminating players/teams that failed to answer correctly
    - Advancing to the next sequence or ending the quiz
    - Recording sequence start times for scoring
    
    In free-for-all mode, players who didn't answer are eliminated.
    In team mode, entire teams without correct answers are eliminated.
    
    Args:
        data (dict):

            - current_index: Index of the completed sequence
            - next_index: Index of the next sequence to start
    
    Emits:
        - 'math_feedback': Elimination notifications to affected players
        - 'math_sequence_change': Notification of sequence change to all clients
        - Updates via broadcast_math_quiz_update() to all clients
    """
    current_index = data.get('current_index', 0)
    next_index = data.get('next_index', current_index + 1)
    
    # Get answers for the current sequence
    sequence_answers = game_state.math_quiz_state['player_answers'].get(current_index, [])
    answered_players = {ans['player'] for ans in sequence_answers}
    
    # Find teams that have answered correctly
    teams_with_correct_answers = set()
    if game_state.is_team_mode:
        for answer in sequence_answers:
            if answer.get('correct', True) and answer.get('team'):
                teams_with_correct_answers.add(answer.get('team'))
    
    # Process sequence completion differently based on game mode
    if not game_state.is_team_mode:
        # In free-for-all mode, players who didn't answer this sequence get eliminated
        for player_name in game_state.players.keys():
            if player_name not in answered_players and player_name not in game_state.math_quiz_state['eliminated_players']:
                game_state.math_quiz_state['eliminated_players'].add(player_name)
                # Send feedback to the player
                socketio.emit('math_feedback', {
                    'message': 'Nestihl jsi odpovědět! Jsi vyřazen.',
                    'correct': False
                }, room=player_name)
    else:
        # In team mode, teams that didn't answer correctly get eliminated
        if 'blue' not in teams_with_correct_answers:
            # Blue team didn't answer correctly - eliminate all blue team members
            for player_name in game_state.blue_team:
                if player_name not in game_state.math_quiz_state['eliminated_players']:
                    game_state.math_quiz_state['eliminated_players'].add(player_name)
                    # Send feedback to each player
                    socketio.emit('math_feedback', {
                        'message': 'Váš tým nestihl odpovědět správně! Celý tým je vyřazen.',
                        'correct': False
                    }, room=player_name)
        
        if 'red' not in teams_with_correct_answers:
            # Red team didn't answer correctly - eliminate all red team members
            for player_name in game_state.red_team:
                if player_name not in game_state.math_quiz_state['eliminated_players']:
                    game_state.math_quiz_state['eliminated_players'].add(player_name)
                    # Send feedback to each player
                    socketio.emit('math_feedback', {
                        'message': 'Váš tým nestihl odpovědět správně! Celý tým je vyřazen.',
                        'correct': False
                    }, room=player_name)
    
    # Validate indices
    if next_index >= len(game_state.questions[game_state.current_question]['sequences']):
        # This was the last sequence, end the quiz
        handle_math_quiz_completed()
        return
    
    # Update current sequence index
    game_state.math_quiz_state['current_sequence'] = next_index
    
    # Record the start time of this sequence
    game_state.math_quiz_state['sequence_start_times'][next_index] = int(time() * 1000)
    
    # Broadcast sequence change to all clients
    socketio.emit('math_sequence_change', {
        'sequence_index': next_index
    })
    
    # Broadcast updated state
    broadcast_math_quiz_update()

def handle_math_quiz_completed():
    """
    Handle completion of the entire math quiz.
    
    Aggregates final results and statistics when all sequences are completed
    or when completion conditions are met (all players/teams eliminated).
    
    Collects and formats player answers, sequence details, and elimination data
    before sending final results to all clients.
    
    Emits:
        - Event via emit_all_answers_received with quiz results and statistics
    """
    # Get scores data
    scores = get_scores_data()
    
    sequences = game_state.questions[game_state.current_question]['sequences']
    player_answers = game_state.math_quiz_state['player_answers']
    eliminated_players = list(game_state.math_quiz_state['eliminated_players'])
    
    # Format player answers - include only correct answers for display
    formatted_player_answers = {}
    for seq_index, answers in player_answers.items():
        # Filter to only include correct answers
        correct_answers = [ans for ans in answers if ans.get('correct', False)]
        # Sort by time if needed
        formatted_player_answers[seq_index] = correct_answers
    
    # Send results to all clients
    emit_all_answers_received(
        scores=scores,
        correct_answer="",  # No single correct answer for math quiz
        additional_data={
            'sequences': sequences,
            'player_answers': formatted_player_answers,
            'eliminated_players': eliminated_players,
            'math_quiz_points': game_state.math_quiz_points  # Include math quiz points
        }
    )

def broadcast_math_quiz_update():
    """
    Broadcast current math quiz state to all clients.
    
    Compiles and sends the current game state, including:

    - Current sequence information
    - Player status (answered, eliminated)
    - Team status in team mode
    - Current scores and points earned
    
    Also handles game flow control by checking for automatic completion conditions:

    - All players eliminated in free-for-all mode
    - Both teams eliminated in team mode
    - One team answered correctly while the other is fully eliminated
    
    Emits:
        - 'math_quiz_update': Current game state to all clients
        - 'fast_forward_timer': Signal to speed up timer when appropriate
    """
    current_question = game_state.questions[game_state.current_question]
    current_idx = game_state.math_quiz_state['current_sequence']
    eliminated_players = list(game_state.math_quiz_state['eliminated_players'])
    player_answers = game_state.math_quiz_state['player_answers']
    
    # Determine which players have answered the current sequence
    answered_players = set()
    if current_idx in player_answers:
        for answer in player_answers[current_idx]:
            answered_players.add(answer['player'])
    
    # Find teams with correct answers for the current sequence
    teams_with_correct_answers = set()
    if game_state.is_team_mode and current_idx in player_answers:
        for answer in player_answers[current_idx]:
            if answer.get('correct', False) and answer.get('team'):
                teams_with_correct_answers.add(answer.get('team'))
    
    # Create player statuses
    player_statuses = {}
    for player_name in game_state.players:
        # Check if player's team already has a correct answer
        team = None
        if game_state.is_team_mode:
            if player_name in game_state.blue_team:
                team = 'blue'
            elif player_name in game_state.red_team:
                team = 'red'
        
        # Player should be marked as having answered if:
        # 1. They personally answered, OR
        # 2. Someone from their team answered correctly (in team mode)
        team_already_answered = team in teams_with_correct_answers
        
        player_statuses[player_name] = {
            'hasAnswered': player_name in answered_players or team_already_answered,
            'isEliminated': player_name in eliminated_players
        }
    
    # Get scores data
    scores = get_scores_data()
    
    # Check for scenarios where we should skip to results or fast-forward timer
    
    # 1. Check if all players are eliminated in free-for-all mode
    if not game_state.is_team_mode and len(eliminated_players) == len(game_state.players):
        print("All players eliminated in free-for-all mode - ending the quiz")
        handle_math_quiz_completed()
        return
    
    # 2. For team mode, check team elimination scenarios
    if game_state.is_team_mode:
        # Check if all players in a team are eliminated
        blue_team_all_eliminated = all(player in eliminated_players for player in game_state.blue_team)
        red_team_all_eliminated = all(player in eliminated_players for player in game_state.red_team)
        
        # If both teams are eliminated, end the quiz
        if blue_team_all_eliminated and red_team_all_eliminated:
            print("All teams eliminated - ending the quiz")
            handle_math_quiz_completed()
            return
        
        # If one team has answered correctly and the other team is fully eliminated,
        # end the current sequence
        if (('blue' in teams_with_correct_answers and red_team_all_eliminated) or 
            ('red' in teams_with_correct_answers and blue_team_all_eliminated)):
            print("One team answered correctly and the other team is fully eliminated - fast-forwarding")
            
            # Check if this is the last sequence
            if current_idx >= len(current_question['sequences']) - 1:
                # This was the last sequence, end the quiz
                handle_math_quiz_completed()
                return
            else:
                # Move to next sequence with a short delay
                socketio.emit('fast_forward_timer', {
                    'remaining_seconds': 3
                })
    
    # Emit updated state with players data included
    socketio.emit('math_quiz_update', {
        'current_sequence': current_idx,
        'eliminated_players': eliminated_players,
        'player_answers': player_answers,
        'player_statuses': player_statuses,
        'scores': scores,
        'is_team_mode': game_state.is_team_mode,
        'team_answers': game_state.math_quiz_state['team_answers'],
        'players': current_question.get('players', {}),
        'math_quiz_points': game_state.math_quiz_points
    })

def initialize_math_quiz(isFirstQuestion):
    """
    Initialize math quiz state for a new question.
    
    Sets up the initial state for a math quiz, including:

    - Resetting eliminated players set
    - Clearing player/team answer tracking
    - Marking all sequences as not completed
    - Setting up sequence start times with appropriate delays
    
    Args:
        isFirstQuestion (bool): Whether this is the first question of the game,
                               which requires additional preview time
    
    Emits:
        - Updates via broadcast_math_quiz_update() to all clients
    """
    # Reset math quiz state
    game_state.math_quiz_state = {
        'current_sequence': 0,
        'eliminated_players': set(),
        'player_answers': {},  # Map of sequence index -> array of player answers
        'team_answers': {},    # Map of team -> sequence index -> array of player answers
        'sequence_start_times': {}  # Map of sequence index -> start time
    }
    
    # Mark all sequences as not completed initially
    current_question = game_state.questions[game_state.current_question]
    for sequence in current_question.get('sequences', []):
        sequence['completed'] = False
    
    # Record the start time of the first sequence
    if isFirstQuestion:
        # For the first question, we want to delay the start time for the preview
        game_state.math_quiz_state['sequence_start_times'][0] = int(time() * 1000) + PREVIEW_TIME + START_GAME_TIME
    else:
        game_state.math_quiz_state['sequence_start_times'][0] = int(time() * 1000) + PREVIEW_TIME
    
    # Broadcast initial state
    broadcast_math_quiz_update()