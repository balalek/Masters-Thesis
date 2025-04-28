"""
Socket.IO event handlers for Open Answer questions.

This module provides real-time event handling for Open Answer question types:

- Answer submission and validation against correct answers
- Similarity checking and feedback for incorrect answers
- Letter reveal functionality for hints
- Team and individual scoring modes
- Answer tracking and statistics collection

Open Answer questions allow players to input free-form text answers which are
compared against expected answers with flexible matching options.
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_CORRECT_ANSWER
from difflib import SequenceMatcher
import random
from .utils import emit_all_answers_received, get_scores_data

@socketio.on('submit_open_answer')
def submit_open_answer(data):
    """
    Handle submission of an open answer from a player.
    
    Validates the player's answer against the correct answer and awards points
    for correct answers based on speed. Handles different scoring for team mode
    and individual mode. Provides feedback for incorrect answers.
    
    Args:
        data (dict):

            - player_name: Name of the player submitting the answer
            - answer: The text answer submitted by the player
            - answer_time: Timestamp when the answer was submitted
    
    Emits:
        - 'error': If game is not started
        - 'open_answer_feedback': Feedback for incorrect answers
        - 'answer_correctness': Result notification with points for correct answers
        - 'open_answer_submitted': Updates for the main screen on player progress
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
        emit('open_answer_feedback', {"message": "Už jsi odpověděl/a správně"}, room=player_name)
        return
    
    current_question_data = game_state.questions[current_question]
    
    # Change 'answer' to 'open_answer' for open answer questions
    correct_answer = str(current_question_data.get('open_answer', current_question_data.get('answer', ''))).strip()
    
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
        speed_points = max(0, POINTS_FOR_CORRECT_ANSWER - int((time_taken / question_length) * POINTS_FOR_CORRECT_ANSWER))
        total_points_earned = POINTS_FOR_CORRECT_ANSWER + speed_points
        
        # Add player to correct players set
        game_state.correct_players.add(player_name)
        
        # Handle scoring based on game mode
        if game_state.is_team_mode:
            team = 'blue' if player_name in game_state.blue_team else 'red'
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
            # Free-for-all mode
            game_state.players[player_name]['score'] += total_points_earned
            
            emit('answer_correctness', {
                "correct": True,
                "points_earned": total_points_earned,
                "total_points": game_state.players[player_name]['score'],
                "is_team_score": False
            }, room=player_name)
        
        # Update tracking for correct answers
        game_state.open_answer_stats['correct_count'] += 1
        game_state.open_answer_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': True,
            'player_color': game_state.players[player_name]['color']
        })
        
        # Broadcast to update main screen
        socketio.emit('open_answer_submitted', {
            'player_count': len(game_state.players),
            'correct_count': game_state.open_answer_stats['correct_count']
        })
        
        # Check if everyone has answered correctly depending on game mode
        check_open_answer_completion()
    else:
        # Wrong answer - provide feedback
        feedback = analyze_answer(answer, correct_answer)
        
        # Log the attempt for future reference as funny answers
        game_state.open_answer_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': False,
            'player_color': game_state.players[player_name]['color']
        })
        
        # Send feedback to the player
        emit('open_answer_feedback', {"message": feedback}, room=player_name)

def analyze_answer(answer, correct_answer):
    """
    Analyze how close an answer is to the correct one and provide feedback.
    
    Compares the submitted answer with the correct one and provides
    contextual feedback based on length difference and text similarity.
    
    Args:
        answer: The player's submitted answer
        correct_answer: The correct answer to compare against
    
    Returns:
        str: Feedback message based on how close the answer is
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

def check_open_answer_completion():
    """
    Check if all players have answered correctly or if conditions are met to proceed.
    
    In team mode, proceeds when at least one player from each team has answered correctly.
    In individual mode, proceeds when all players have answered correctly.
    
    Calls show_open_answer_results() if completion conditions are met.
    """
    player_count = len(game_state.players)
    correct_count = game_state.open_answer_stats['correct_count']
    
    # In team mode, we need one correct answer from each team
    if game_state.is_team_mode:
        blue_team_correct = any(p in game_state.correct_players for p in game_state.blue_team)
        red_team_correct = any(p in game_state.correct_players for p in game_state.red_team)
        
        if blue_team_correct and red_team_correct:
            show_open_answer_results()
    # In individual mode, proceed when all players answer correctly
    elif correct_count == player_count:
        show_open_answer_results()

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

def show_open_answer_results():
    """
    Show results for open answer questions.
    
    Gathers the current scores and correct answer, then broadcasts
    results to all players, including all submitted answers.
    
    Emits:
        - Event via emit_all_answers_received with correct answer and player responses
    """
    current_question_data = game_state.questions[game_state.current_question]
    scores = get_scores_data()
    correct_answer = current_question_data.get('open_answer', current_question_data.get('answer', ''))
    
    # Sort player answers by dissimilarity for "most interesting attempts"
    sorted_player_answers = sort_player_answers_by_dissimilarity(
        game_state.open_answer_stats['player_answers'],
        correct_answer
    )
    
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer,
        additional_data={"player_answers": sorted_player_answers}
    )

@socketio.on('reveal_open_answer_letter')
def reveal_open_answer_letter():
    """
    Reveal a random letter in the open answer as a hint.
    
    Randomly reveals one previously hidden letter in the answer,
    up to a maximum of 50% of the total letters. Spaces are not
    counted as revealable letters and are always shown.
    
    Emits:
        - 'open_answer_letter_revealed': Event with masked answer and newly revealed position
    """
    if game_state.current_question is None:
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    
    # Get answer for open answer questions (compatible with both formats)
    correct_answer = current_question_data.get('open_answer', current_question_data.get('answer', ''))

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
    
    # Send the updated mask to main screen
    socketio.emit('open_answer_letter_revealed', {
        'mask': ''.join(mask),
        'position': position
    })

def handle_open_answer_time_up(scores):
    """
    Handle when time expires for an Open Answer question.
    
    Shows the correct answer to all players and displays all submitted answers.
    Called when the question timer runs out, regardless of how many
    players have answered correctly.
    
    Args:
        scores: Current game scores for inclusion in results
    
    Emits:
        - Event via emit_all_answers_received with correct answer and player responses
    """
    current_question = game_state.questions[game_state.current_question]
    correct_answer = current_question.get('open_answer', current_question.get('answer', ''))
    
    # Sort player answers by dissimilarity for "most interesting attempts"
    sorted_player_answers = sort_player_answers_by_dissimilarity(
        game_state.open_answer_stats['player_answers'],
        correct_answer
    )
    
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer,
        additional_data={"player_answers": sorted_player_answers}
    )