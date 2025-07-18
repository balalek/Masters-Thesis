"""
Socket.IO events for Drawing questions

This module provides real-time event handling for Drawing questions:

- Real-time drawing coordination between drawer and guessers
- Word selection and announcement to players
- Drawing transmission and broadcasting
- Answer submission and validation
- Points calculation for both drawer and successful guessers
- Letter reveal functionality for hints
- Team and individual play modes

Drawing is an interactive game where one player draws a word and others
try to guess it, with points awarded for both successful drawing and guessing.

Author: Bc. Martin Baláž
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_CORRECT_ANSWER
from difflib import SequenceMatcher
import random
from .utils import emit_all_answers_received, get_scores_data

@socketio.on('submit_drawing_answer')
def submit_drawing_answer(data):
    """
    Handle submission of a guess for the drawn word.
    
    Validates the submitted answer against the word being drawn, awards points 
    for correct answers based on speed, and manages team vs individual scoring.
    Provides feedback for incorrect guesses based on similarity.
    
    Args:
        data (dict):

            - player_name: Name of the player submitting the guess
            - answer: The word guess submitted
            - answer_time: Timestamp when answer was submitted
            
    Emits:
        - 'error': If game is not started
        - 'drawing_answer_feedback': Feedback for invalid or incorrect answers
        - 'answer_correctness': Result notification with points for correct answers
        - 'drawing_answer_submitted': Updates for the main screen on player progress
    """
    player_name = data['player_name']
    answer = data['answer'].strip()
    answer_time = data['answer_time']
    current_question = game_state.current_question
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
    
    # Skip processing if player already answered correctly
    if player_name in game_state.correct_players:
        emit('drawing_answer_feedback', {"message": "Už jsi odpověděl/a správně"}, room=player_name)
        return
    
    # Skip processing if player is the drawer for this question
    current_question_data = game_state.questions[current_question]
    if current_question_data.get('player') == player_name:
        emit('drawing_answer_feedback', {"message": "Nemůžeš hádat svůj vlastní obrázek"}, room=player_name)
        return
    
    # In team mode, verify that the player is on the same team as the drawer
    if game_state.is_team_mode:
        drawer_name = current_question_data.get('player')
        drawer_team = 'blue' if drawer_name in game_state.blue_team else 'red'
        player_team = 'blue' if player_name in game_state.blue_team else 'red'
        
        if player_team != drawer_team:
            emit('drawing_answer_feedback', {"message": "Pouze hráči ze stejného týmu mohou hádat"}, room=player_name)
            return
    
    # Get the word that was selected by the drawer
    selected_word = current_question_data.get('selected_word')
    if selected_word is None:
        emit('drawing_answer_feedback', {"message": "Kreslící hráč ještě nevybral slovo"}, room=player_name)
        return
        
    correct_answer = selected_word.strip()
    
    if not correct_answer:
        emit('drawing_answer_feedback', {"message": "Kreslící hráč ještě nevybral slovo"}, room=player_name)
        return
    
    # Normalize both answers for comparison
    normalized_answer = answer.lower()
    normalized_correct = correct_answer.lower()
    
    # Check if answer is correct
    is_correct = normalized_answer == normalized_correct
    
    # If answer is correct
    if is_correct:
        # Calculate speed points
        question_start_time = game_state.question_start_time
        question_length = current_question_data['length'] * 1000
        time_taken = answer_time - question_start_time
        speed_points = max(0, 100 - int((time_taken / question_length) * 100))
        total_points_earned = POINTS_FOR_CORRECT_ANSWER + speed_points
        
        # Add player to correct players set
        game_state.correct_players.add(player_name)
        
        # Handle scoring based on game mode
        if game_state.is_team_mode:
            team = 'blue' if player_name in game_state.blue_team else 'red'
            drawer_team = 'blue' if current_question_data.get('player') in game_state.blue_team else 'red'
            
            # Only award points if the guesser is on the same team as the drawer
            if team == drawer_team:
                game_state.team_scores[team] += total_points_earned
                
                # Notify all team members with the correct answer screen
                team_players = game_state.blue_team if team == 'blue' else game_state.red_team
                for team_player in team_players:
                    emit('answer_correctness', {
                        "correct": True,
                        "points_earned": total_points_earned,
                        "total_points": game_state.team_scores[team],
                        "is_team_score": True
                    }, room=team_player)
            else:
                # Player is not on the drawer's team, so no points
                emit('drawing_answer_feedback', {
                    "message": "Správně! Ale body dostává pouze tým kreslícího hráče."
                }, room=player_name)
        else:
            # Individual mode - award points to the guesser
            game_state.players[player_name]['score'] += total_points_earned
            
            # Also award points to the drawer based on how many players guessed correctly
            drawer_name = current_question_data.get('player')
            if drawer_name and drawer_name in game_state.players:
                # Calculate number of potential guessers (everyone except drawer)
                total_guessers = len(game_state.players) - 1
                
                # Calculate points per correct guess
                points_per_guess = POINTS_FOR_CORRECT_ANSWER / total_guessers if total_guessers > 0 else 0
                
                # Apply late selection penalty if applicable
                if current_question_data.get('is_late_selection', False):
                    points_per_guess = points_per_guess // 2
                
                # Award points to drawer
                game_state.players[drawer_name]['score'] += int(points_per_guess)
            
            # Notify guesser of points earned
            emit('answer_correctness', {
                "correct": True,
                "points_earned": total_points_earned,
                "total_points": game_state.players[player_name]['score'],
                "is_team_score": False
            }, room=player_name)
        
        # Update tracking for correct answers
        game_state.drawing_stats['correct_count'] += 1
        game_state.drawing_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': True,
            'player_color': game_state.players[player_name]['color']
        })
        
        # Broadcast to update main screen
        socketio.emit('drawing_answer_submitted', {
            'player_count': len(game_state.players) - 1,  # Exclude the drawer
            'correct_count': game_state.drawing_stats['correct_count'],
            'player_name': player_name,
            'player_color': game_state.players[player_name]['color']
        })
        
        # Check if everyone except the drawer has answered correctly
        check_drawing_completion()
    else:
        # Wrong answer - provide feedback
        feedback = analyze_drawing_answer(answer, correct_answer)
        
        # Log the attempt
        game_state.drawing_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': False,
            'player_color': game_state.players[player_name]['color']
        })
        
        # Broadcast feedback to the player
        emit('drawing_answer_feedback', {"message": feedback}, room=player_name)

def analyze_drawing_answer(answer, correct_answer):
    """
    Analyze how close a guess is to the correct drawing word.
    
    Provides contextual feedback based on length difference and text similarity,
    helping players adjust their guesses toward the correct answer.
    
    Args:
        answer (str): The player's submitted guess
        correct_answer (str): The actual word being drawn
        
    Returns:
        str: Feedback message based on how close the guess is
    """
    answer = answer.lower().strip()
    correct_answer = correct_answer.lower().strip()
    
    # If length differs significantly, give length hint
    if len(answer) < len(correct_answer) * 0.7:
        return "Tvoje odpověď je příliš krátká"
    
    if len(answer) > len(correct_answer) * 1.3:
        return "Tvoje odpověď je příliš dlouhá"
    
    # Calculate similarity ratio
    similarity = SequenceMatcher(None, answer, correct_answer).ratio()
    
    if similarity > 0.8:
        return "Už jsi skoro u cíle! Zkontroluj překlepy"
    elif similarity > 0.5:
        return "Blížíš se k správné odpovědi"
    else:
        return "To není správná odpověď"

def check_drawing_completion():
    """
    Check if drawing round completion criteria have been met.
    
    In team mode: At least one player from the drawer's team must answer correctly

    In free-for-all mode: All players except the drawer must answer correctly
    
    If completion criteria are met, awards bonus points to the drawer (in free-for-all)
    and triggers the results display.
    """
    # Get the current drawer's name
    current_question_data = game_state.questions[game_state.current_question]
    drawer_name = current_question_data.get('player')
    
    # Calculate total number of potential guessers (excluding the drawer)
    if game_state.is_team_mode:
        required_correct = 1  # At least one player from the drawer's team must answer correctly
    else:
        required_correct = len(game_state.players) - 1  # All players except drawer
    
    # Count correct answers
    correct_count = game_state.drawing_stats['correct_count']
    
    # If all potential guessers have answered correctly, show results and award bonus
    if correct_count >= required_correct:
        # Award bonus to drawer for full completion
        if not game_state.is_team_mode and drawer_name in game_state.players:
            # Calculate bonus (only if everyone guessed correctly)
            bonus_points = POINTS_FOR_CORRECT_ANSWER // 2
            
            # Apply late selection penalty if applicable
            if current_question_data.get('is_late_selection', False):
                bonus_points = bonus_points // 2
                
            # Award bonus points to drawer's actual score
            game_state.players[drawer_name]['score'] += bonus_points
            
        # Show results after awarding bonus
        show_drawing_results()

def calculate_drawer_stats(drawer_name):
    """
    Calculate points and statistics for the drawer.
    
    Computes points earned by the drawer based on how many players guessed correctly.
    Handles different scoring calculations for team mode vs individual mode,
    and applies late word selection penalties when applicable.
    
    Args:
        drawer_name (str): Name of the player who was drawing
        
    Returns:
        dict:

            - pointsEarned: Points earned in this drawing round
            - totalPoints: Drawer's current total score
            - correct_count: Number of players who guessed correctly
            - total_guessers: Total number of potential guessers
            - is_late_selection: Whether word was selected late
    """
    # Calculate how many players guessed correctly
    correct_count = game_state.drawing_stats['correct_count']
    total_guessers = len(game_state.players) - 1  # Everyone except drawer
    
    # Get the current question data to check for late selection
    current_question_data = game_state.questions[game_state.current_question]
    is_late_selection = current_question_data.get('is_late_selection', False)
    
    # Calculate drawer points using the new formula
    drawer_points_earned = 0
    
    if game_state.is_team_mode:
        # For team mode, we still use the original formula since teams are balanced
        for answer in game_state.drawing_stats['player_answers']:
            if answer['is_correct']:
                points = POINTS_FOR_CORRECT_ANSWER // 2
                # Don't apply penalty for late selection
                drawer_points_earned += points
    else:
        if total_guessers > 0:
            # Calculate base points per correct guess
            points_per_guess = POINTS_FOR_CORRECT_ANSWER / total_guessers
            
            # Calculate total earned from correct guesses
            drawer_points_earned = int(points_per_guess * correct_count)
            
            # Add bonus if everyone guessed correctly
            if correct_count == total_guessers and total_guessers > 0:
                drawer_points_earned += (POINTS_FOR_CORRECT_ANSWER // 2)
                
            # Apply late selection penalty
            if is_late_selection:
                drawer_points_earned = drawer_points_earned // 2
    
    # Get drawer's total points
    if game_state.is_team_mode:
        # For team mode, use the team's total score instead of individual score
        drawer_team = 'blue' if drawer_name in game_state.blue_team else 'red'
        drawer_total_points = game_state.team_scores[drawer_team]
    elif drawer_name in game_state.players:
        drawer_total_points = game_state.players[drawer_name]['score']
    else:
        drawer_total_points = 0
    
    # Return drawer stats as a dictionary
    return {
        'pointsEarned': drawer_points_earned,
        'totalPoints': drawer_total_points,
        'correct_count': correct_count,
        'total_guessers': total_guessers,
        'is_late_selection': is_late_selection
    }

def sort_player_answers_by_dissimilarity(player_answers, correct_answer):
    """
    Sort player answers by their dissimilarity to the correct answer.
    
    This puts the least similar (most interesting) answers first.
    Frontend will then use the top 3 answers for the "most interesting attempts" section.
    
    Args:
        player_answers: List of player answer objects
        correct_answer: The correct answer to compare against
        
    Returns:
        list: Sorted list with correct answers first, then sorted incorrect answers
    """
    # Create a copy of the answers list to avoid modifying the original
    player_answers = list(player_answers)
    
    # Separate correct and incorrect answers
    correct_answers = [answer for answer in player_answers if answer['is_correct']]
    incorrect_answers = [answer for answer in player_answers if not answer['is_correct']]
    
    # Calculate similarity for each incorrect answer
    for answer in incorrect_answers:
        answer_text = answer['answer'].lower().strip()
        correct_text = correct_answer.lower().strip()
        similarity = SequenceMatcher(None, answer_text, correct_text).ratio()
        answer['similarity'] = similarity
    
    # Sort incorrect answers by similarity (lowest first)
    sorted_incorrect = sorted(incorrect_answers, key=lambda x: x['similarity'])
    
    # Recombine the answers with correct answers first, then sorted incorrect answers
    return correct_answers + sorted_incorrect

def show_drawing_results():
    """
    Show results for the drawing round to all players.
    
    Gathers the current scores, correct answer, player answers, and drawer
    statistics, then broadcasts results to all players.
    
    Emits:
        - Event via emit_all_answers_received with drawing results
    """
    current_question_data = game_state.questions[game_state.current_question]
    scores = get_scores_data()
    drawer_name = current_question_data.get('player', '')
    correct_answer = current_question_data.get('selected_word', '')
    
    # Get drawer stats using the helper function
    drawer_stats = calculate_drawer_stats(drawer_name) if drawer_name else None
    
    # Sort player answers by dissimilarity for "most interesting attempts"
    sorted_player_answers = sort_player_answers_by_dissimilarity(
        game_state.drawing_stats['player_answers'],
        correct_answer
    )
    
    # Send standard results to everyone with drawer stats included
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer,
        additional_data={
            "player_answers": sorted_player_answers,
            "drawer": drawer_name,
            "drawer_stats": drawer_stats
        }
    )

def handle_drawing_time_up(scores):
    """
    Handle time expiration for drawing questions.
    
    Processes the end of a drawing round when time runs out,
    regardless of how many players have guessed correctly.
    Calculates final drawer statistics and broadcasts results.
    
    Args:
        scores: Current game scores for inclusion in results
    
    Emits:
        - Event via emit_all_answers_received with drawing results
    """
    current_question = game_state.questions[game_state.current_question]
    drawer_name = current_question.get('player', '')
    correct_answer = current_question.get('selected_word', '')
    
    # Get drawer stats using the helper function
    drawer_stats = calculate_drawer_stats(drawer_name) if drawer_name else None
    
    # Sort player answers by dissimilarity for "most interesting attempts"
    sorted_player_answers = sort_player_answers_by_dissimilarity(
        game_state.drawing_stats['player_answers'],
        correct_answer
    )
    
    # Send standard results to everyone with drawer stats included
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer,
        additional_data={
            "player_answers": sorted_player_answers,
            "drawer": drawer_name,
            "drawer_stats": drawer_stats
        }
    )

@socketio.on('drawing_update')
def drawing_update(data):
    """
    Broadcast drawing updates from the drawer to all clients (but only main screen listens).
    
    Receives drawing data from the current drawer and broadcasts it to all
    clients to display the drawing in real-time. Validates that updates
    only come from the designated drawer for the current question.
    
    Args:
        data (dict):

            - player_name: Name of the player sending drawing data
            - drawingData: Drawing data to broadcast (lines, colors, etc.)
            - action: Type of drawing action ('draw', 'clear', etc.)
    
    Emits:
        - 'drawing_update_broadcast': Drawing data to all clients
    """
    # Get the current drawer
    if game_state.current_question is None:
        print("drawing_update: No active question")
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    drawer_name = current_question_data.get('player')
    player_name = data.get('player_name')
    
    if player_name != drawer_name:
        # Prevent non-drawers from sending drawing updates
        print(f"drawing_update: Player {player_name} is not the drawer")
        return
    
    drawing_data = data.get('drawingData')
    
    # Broadcast drawing update to all clients
    socketio.emit('drawing_update_broadcast', {
        'drawingData': drawing_data,
        'action': data.get('action', 'draw'),
        'drawer': drawer_name
    })

@socketio.on('reveal_drawing_letter')
def reveal_drawing_letter():
    """
    Reveal a random letter in the drawing answer as a hint.
    
    Randomly reveals one previously hidden letter in the answer,
    up to a maximum of 50% of the total letters. Spaces are always
    shown and not counted toward the reveal limit.
    
    Emits:
        - 'drawing_letter_revealed': Updated mask with newly revealed letter
    """
    if game_state.current_question is None:
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    correct_answer = current_question_data.get('selected_word', '')

    # If no word is selected yet, do nothing
    if not correct_answer:
        return

    # Count actual letters (excluding spaces)
    actual_letters = sum(1 for char in correct_answer if char != ' ')
    
    # Calculate maximum number of letters to reveal (50% rounded down)
    max_reveals = actual_letters // 2
    
    # Check if we've already reached the maximum number of reveals
    if len(game_state.revealed_positions) >= max_reveals:
        return
    
    # Find valid positions (not spaces, not already revealed)
    valid_positions = [i for i in range(len(correct_answer)) 
                      if correct_answer[i] != ' ' and i not in game_state.revealed_positions]
    
    # If no valid positions, do nothing
    if not valid_positions:
        return
    
    # Choose a random position
    position = random.choice(valid_positions)
    game_state.revealed_positions.add(position)
    
    # Create mask with revealed letters
    mask = ['_' if i not in game_state.revealed_positions and char != ' ' else char 
            for i, char in enumerate(correct_answer)]
    
    # Send the updated mask
    socketio.emit('drawing_letter_revealed', {
        'mask': ''.join(mask),
        'position': position
    })

@socketio.on('select_drawing_word')
def select_drawing_word(data):
    """
    Handle word selection by the drawer for the current drawing round.
    
    Validates the selection, updates the game state with the chosen word,
    and notifies players - showing the full word to the drawer and a
    masked version to guessers (main screen).
    
    Args:
        data (dict):
        
            - player_name: Name of the player selecting the word
            - selected_word: The word chosen to be drawn
            - is_late_selection: Whether selection was made after time started
    
    Emits:
        - 'error': If selection is invalid
        - 'word_selected': Word info to drawer (full word) and guessers (masked)
    """
    player_name = data.get('player_name')
    selected_word = data.get('selected_word')
    is_late_selection = data.get('is_late_selection', False)
    
    if not all([player_name, selected_word]):
        emit('error', {"error": "Missing required data"})
        return
    
    # Use the server's current question index
    question_index = game_state.current_question
    
    if question_index is None:
        emit('error', {"error": "No active question"})
        return
    
    question = game_state.questions[question_index]
    
    # Verify this is a drawing question for this player
    if question.get("type") != "DRAWING" or question.get("player") != player_name:
        emit('error', {"error": "Not your drawing question"})
        return
    
    # Verify the selected word is one of the options
    if selected_word not in question.get("words", []):
        emit('error', {"error": "Invalid word selected"})
        return
    
    # Set the selected word
    game_state.questions[question_index]["selected_word"] = selected_word
    
    # Store late selection flag to apply penalty later
    game_state.questions[question_index]["is_late_selection"] = is_late_selection
    
    # Reset drawing-specific game state if this is the active question
    if game_state.current_question == question_index:
        game_state.correct_players = set()
        game_state.revealed_positions = set()
        game_state.drawing_stats = {
            'correct_count': 0,
            'player_answers': []
        }
    
    # Notify clients that the word has been selected
    # For the drawer, send the full word
    emit('word_selected', {
        "word": selected_word,
        "question_index": question_index,
        "is_drawer": True
    }, room=player_name)
    
    # For others, send masked version with underscores
    mask = ['_' if char != ' ' else ' ' for char in selected_word]
    socketio.emit('word_selected', {
        "word": ''.join(mask),
        "question_index": question_index,
        "is_drawer": False
    }, include_self=False)

@socketio.on('get_current_drawing_word')
def get_current_drawing_word():
    """
    Return the currently selected drawing word in masked format.
    
    Responds to client requests for the current drawing word,
    returning a masked version with only revealed letters shown.
    Used when players join mid-game or need to refresh their display.
    
    Emits:
        - 'drawing_word_response': Contains the masked word and availability flag
    """
    if game_state.current_question is None:
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    
    # Only for drawing questions
    if current_question_data.get('type') != 'DRAWING':
        return
    
    # Get the selected word
    selected_word = current_question_data.get('selected_word')
    if not selected_word:
        return  # No word selected yet
    
    # Create a masked version with already revealed letters
    mask = ['_' if i not in game_state.revealed_positions and char != ' ' else char 
            for i, char in enumerate(selected_word)]
    
    # Send the masked version of the word
    data = {
        "word": ''.join(mask),
        "mask_available": True
    }
    
    # Emit directly to the requesting client
    emit('drawing_word_response', data)