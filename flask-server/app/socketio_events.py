from flask import request, session
from flask_socketio import emit, join_room
from . import socketio
from .game_state import game_state
from .constants import PREVIEW_TIME, WAITING_TIME, POINTS_FOR_CORRECT_ANSWER
from time import time
import re
from difflib import SequenceMatcher
from .services.quiz_service import QuizService
import random

@socketio.on('join_room')
def handle_join_room(data):
    player_name = data['player_name']
    join_room(player_name)
    print(f'Player {player_name} joined room {player_name}')

@socketio.on('submit_answer')
def submit_answer(data):
    player_name = data['player_name']
    answer = data['answer']
    answer_time = data['answer_time']  # Get the answer time from the data
    current_question = game_state.current_question
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    current_question_data = game_state.questions[current_question]
    correct_answer = current_question_data['answer']
    points_earned = POINTS_FOR_CORRECT_ANSWER if answer == correct_answer else 0
    
    QuizService.update_question_metadata(
        str(current_question_data['_id']), 
        is_correct=(answer == correct_answer),
        increment_times_played=not game_state.current_question_metadata_updated
    )
    game_state.current_question_metadata_updated = True
    
    # Calculate speed points
    question_start_time = game_state.question_start_time
    question_length = game_state.questions[current_question]['length'] * 1000  # Convert to milliseconds
    time_taken = answer_time - question_start_time
    speed_points = max(0, 100 - int((time_taken / question_length) * 100)) if answer == correct_answer else 0
    total_points_earned = points_earned + speed_points
    
    if game_state.is_team_mode:
        team = 'blue' if player_name in game_state.blue_team else 'red'
        team_players = game_state.blue_team if team == 'blue' else game_state.red_team
        
        if answer == correct_answer:
            game_state.team_scores[team] += total_points_earned
            
        # Send result to all team members (blocks them from answering)
        for team_player in team_players:
            emit('answer_correctness', {
                "correct": answer == correct_answer,
                "points_earned": total_points_earned,
                "total_points": game_state.team_scores[team],
                "is_team_score": True
            }, room=team_player)
    else:
        # Original individual scoring logic
        if answer == correct_answer:
            game_state.players[player_name]['score'] += total_points_earned
        
        emit('answer_correctness', {
            "correct": answer == correct_answer,
            "points_earned": total_points_earned,
            "total_points": game_state.players[player_name]['score'],
            "is_team_score": False
        }, room=player_name)
    
    # Update counts for everyone
    game_state.answers_received += 1
    game_state.answer_counts[answer] += 1
    socketio.emit('answer_submitted')
    
    # Check if we should proceed to next stage
    answers_needed = 2 if game_state.is_team_mode else len(game_state.players)
    if game_state.answers_received == answers_needed:
        show_buttons_at = int((time() + WAITING_TIME) * 1000)
        game_state.question_start_time = show_buttons_at
        
        scores = (
            {
                'is_team_mode': True,
                'teams': game_state.team_scores,
                'blue_team': game_state.blue_team,
                'red_team': game_state.red_team,
                'individual': game_state.players
            }
            if game_state.is_team_mode
            else game_state.players
        )
        
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": correct_answer,
            "answer_counts": game_state.answer_counts,
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote  # Add this line
        })

@socketio.on('submit_open_answer')
def submit_open_answer(data):
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
    
    # Debug log to verify correctness
    print(f"Player: {player_name}, Answer: {answer}, Correct: {is_correct}")
    
    # If answer is correct
    if is_correct:
        # Calculate speed points
        question_start_time = game_state.question_start_time
        question_length = current_question_data['length'] * 1000  # Convert to milliseconds
        time_taken = answer_time - question_start_time
        speed_points = max(0, 100 - int((time_taken / question_length) * 100))
        total_points_earned = POINTS_FOR_CORRECT_ANSWER + speed_points
        
        # Add player to correct players set
        game_state.correct_players.add(player_name)
        
        # Update question metadata (only for correct answers)
        QuizService.update_question_metadata(
            str(current_question_data['_id']), 
            is_correct=True,
            increment_times_played=False  # Don't increment on each attempt
        )
        game_state.current_question_metadata_updated = True
        
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
            # Individual mode
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
        
        # Check if everyone has answered correctly or time is up
        check_open_answer_completion()
    else:
        # Wrong answer - provide feedback
        feedback = analyze_answer(answer, correct_answer)
        
        # Log the attempt
        game_state.open_answer_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': False,
            'player_color': game_state.players[player_name]['color']
        })
        
        emit('open_answer_feedback', {"message": feedback}, room=player_name)


def analyze_answer(answer, correct_answer):
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


def check_open_answer_completion():
    """Check if all players have answered correctly or if conditions are met to proceed."""
    player_count = len(game_state.players)
    correct_count = game_state.open_answer_stats['correct_count']
    
    # In team mode, we need one correct answer from each team
    if game_state.is_team_mode:
        blue_team_correct = any(p in game_state.correct_players for p in game_state.blue_team)
        red_team_correct = any(p in game_state.correct_players for p in game_state.red_team)
        
        if blue_team_correct and red_team_correct:
            show_open_answer_results()
    # In individual mode, proceed when all players answer correctly or half the time has passed and at least one answered
    elif correct_count == player_count:
        show_open_answer_results()


def show_open_answer_results():
    """Show results for open answer questions."""
    current_question_data = game_state.questions[game_state.current_question]
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    game_state.question_start_time = show_buttons_at
    
    if game_state.is_team_mode:
        scores = {
            'is_team_mode': True,
            'teams': game_state.team_scores,
            'blue_team': game_state.blue_team,
            'red_team': game_state.red_team,
            'individual': game_state.players
        }
    else:
        scores = game_state.players
    
    socketio.emit('all_answers_received', {
        "scores": scores,
        "correct_answer": current_question_data.get('open_answer', current_question_data.get('answer', '')),
        "player_answers": game_state.open_answer_stats['player_answers'],
        "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote
    })


@socketio.on('reveal_open_answer_letter')
def reveal_open_answer_letter():
    """Reveal a random letter in the open answer, up to maximum 50% of letters."""
    if game_state.current_question is None:
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    
    # Change 'answer' to 'open_answer' for open answer questions
    correct_answer = current_question_data.get('open_answer', current_question_data.get('answer', ''))

    # Count actual letters (excluding spaces)
    actual_letters = sum(1 for char in correct_answer if char != ' ')
    
    # Calculate maximum number of letters to reveal (50% rounded down)
    max_reveals = actual_letters // 2  # Integer division automatically rounds down
    
    # Check if we've already reached the maximum number of reveals
    if len(game_state.revealed_positions) >= max_reveals:
        # Already reached maximum reveals, don't reveal more
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
    socketio.emit('open_answer_letter_revealed', {
        'mask': ''.join(mask),
        'position': position
    })

@socketio.on('time_up')
def handle_time_up():
    """Handle when time is up for any question type."""
    current_question = game_state.questions[game_state.current_question]
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    game_state.question_start_time = show_buttons_at
    
    # Detect question type to provide appropriate response
    question_type = current_question.get('type', 'ABCD')

    # check question type
    print(f"Question type: {question_type}")
    
    # Handle team/individual scoring the same for all question types
    if game_state.is_team_mode:
        scores = {
            'is_team_mode': True,
            'teams': game_state.team_scores,
            'blue_team': game_state.blue_team,
            'red_team': game_state.red_team,
            'individual': game_state.players
        }
    else:
        scores = game_state.players
    
    # Special handling for open answer questions
    if question_type == 'OPEN_ANSWER':
        # Emit open answer results
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": current_question.get('open_answer', current_question.get('answer', '')),
            "player_answers": game_state.open_answer_stats['player_answers'],
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote
        })
    else:
        # For ABCD and TRUE_FALSE questions, use the original logic
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": current_question.get('answer', ''),
            "answer_counts": game_state.answer_counts,
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote
        })

@socketio.on('show_final_score')
def handle_show_final_score():
    if game_state.is_team_mode:
        # For team mode, find winning team and send team results
        for player_name in game_state.players:
            team_name = 'blue' if player_name in game_state.blue_team else 'red'
            emit('navigate_to_final_score', {
                'playerName': player_name,
                'score': game_state.team_scores[team_name],
                'team_name': team_name,
                'is_team_mode': True,
                'team_scores': game_state.team_scores,
                'color': game_state.players[player_name]['color']
            }, room=player_name)
    else:
        # Original individual scoring logic
        sorted_players = sorted(
            game_state.players.items(),
            key=lambda x: x[1]['score'],
            reverse=True
        )
        
        for index, (player_name, data) in enumerate(sorted_players):
            emit('navigate_to_final_score', {
                'playerName': player_name,
                'score': data['score'],
                'placement': index + 1,
                'color': data['color'],
                'is_team_mode': False
            }, room=player_name)

@socketio.on('connect')
def handle_connect():
    is_server = request.remote_addr == '127.0.0.1'
    if is_server:
        session['server'] = True
    print(f'Client connected from {request.remote_addr}. Is server: {is_server}')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    if 'server' in session:
        del session['server']

@socketio.on('send_message')
def handle_message(data):
    print('Received message: ' + data)
    socketio.emit('receive_message', data)

@socketio.on('remote_display_connected')
def handle_remote_display_connected():
    socketio.emit('remote_display_connected')

@socketio.on('is_remote_connected')
def handle_is_remote_connected():
    socketio.emit('is_remote_connected')