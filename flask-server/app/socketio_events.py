from flask import request, session
from flask_socketio import emit, join_room
from . import socketio
from .game_state import game_state
from .constants import PREVIEW_TIME, WAITING_TIME
from time import time

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
    points_for_correct = 50
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    correct_answer = game_state.questions[current_question]['answer']
    points_earned = points_for_correct if answer == correct_answer else 0
    
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
            "show_buttons_at": show_buttons_at
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

@socketio.on('time_up')
def handle_time_up():
    current_question = game_state.questions[game_state.current_question]
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
        "correct_answer": current_question['answer'],
        "answer_counts": game_state.answer_counts,
        "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
        "show_buttons_at": show_buttons_at
    })