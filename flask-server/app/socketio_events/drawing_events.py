"""
Socket.IO events for Drawing questions
"""
from flask_socketio import emit
from flask import request
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_CORRECT_ANSWER
from time import time
from difflib import SequenceMatcher
import random
from ..services.quiz_service import QuizService
from .utils import emit_all_answers_received, get_scores_data

@socketio.on('submit_drawing_answer')
def submit_drawing_answer(data):
    """Handle submissions for drawing quiz answers"""
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
    
    # Debug log
    print(f"Drawing Quiz - Player: {player_name}, Answer: {answer}, Correct: {is_correct}, Expected: {correct_answer}")
    
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
        
        # Update question metadata if this is from a saved quiz (not quick play)
        if '_id' in current_question_data:
            QuizService.update_question_metadata(
                str(current_question_data['_id']), 
                is_correct=True,
                increment_times_played=False
            )
            game_state.current_question_metadata_updated = True
        
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
                
                # Calculate points per correct guess using the new formula
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
        
        emit('drawing_answer_feedback', {"message": feedback}, room=player_name)

def analyze_drawing_answer(answer, correct_answer):
    """Analyze how close an answer is to the correct one and provide feedback."""
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
    """Check if conditions are met to proceed to the next stage."""
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
    """Calculate stats for the drawer including points and correct guesses."""
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
        'is_late_selection': is_late_selection  # Include this in the response
    }

def show_drawing_results():
    """Show results for drawing questions."""
    current_question_data = game_state.questions[game_state.current_question]
    scores = get_scores_data()
    drawer_name = current_question_data.get('player', '')
    
    # Get drawer stats using the helper function
    drawer_stats = calculate_drawer_stats(drawer_name) if drawer_name else None
    
    # Send standard results to everyone with drawer stats included
    emit_all_answers_received(
        scores=scores,
        correct_answer=current_question_data.get('selected_word', ''),
        additional_data={
            "player_answers": game_state.drawing_stats['player_answers'],
            "drawer": drawer_name,
            "drawer_stats": drawer_stats
        }
    )

def handle_drawing_time_up(scores):
    """Handle time up for drawing questions"""
    current_question = game_state.questions[game_state.current_question]
    drawer_name = current_question.get('player', '')
    
    # Get drawer stats using the helper function
    drawer_stats = calculate_drawer_stats(drawer_name) if drawer_name else None
    
    # Send standard results to everyone with drawer stats included
    emit_all_answers_received(
        scores=scores,
        correct_answer=current_question.get('selected_word', ''),
        additional_data={
            "player_answers": game_state.drawing_stats['player_answers'],
            "drawer": drawer_name,
            "drawer_stats": drawer_stats
        }
    )
    print("Drawing time up, results have been send")

@socketio.on('drawing_update')
def drawing_update(data):
    """Broadcast drawing updates to all clients.
    
    Note: While this event broadcasts to all connected clients,
    only the main screen (game view) will be listening to the 
    'drawing_update_broadcast' event and rendering the drawing data.
    Mobile clients won't be processing this data even if they receive it.
    """
    # Get the current drawer
    if game_state.current_question is None:
        print("drawing_update: No active question")
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    drawer_name = current_question_data.get('player')
    player_name = data.get('player_name')
    
    # Debug logging
    #print(f"Received drawing_update from {player_name}, drawer is {drawer_name}")
    
    if player_name != drawer_name:
        # Prevent non-drawers from sending drawing updates
        print(f"drawing_update: Player {player_name} is not the drawer")
        return
    
    # Debug log the data size
    drawing_data = data.get('drawingData')
    data_length = len(drawing_data) if drawing_data else 0
    #print(f"Broadcasting drawing update, data length: {data_length}")
    
    # Broadcast drawing update to all clients
    socketio.emit('drawing_update_broadcast', {
        'drawingData': drawing_data,
        'action': data.get('action', 'draw'),
        'drawer': drawer_name
    })

@socketio.on('reveal_drawing_letter')
def reveal_drawing_letter():
    """Reveal a random letter in the drawing answer, similar to open answer questions."""
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
    """Handler when drawer selects a word to draw."""
    player_name = data.get('player_name')
    selected_word = data.get('selected_word')
    is_late_selection = data.get('is_late_selection', False)  # Default to False if not provided
    
    if not all([player_name, selected_word]):
        emit('error', {"error": "Missing required data"})
        return
    
    # Use the server's current question index instead of client-provided one
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
    """Return the currently selected word for drawing questions when requested."""
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