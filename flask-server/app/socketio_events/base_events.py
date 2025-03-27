"""
Base Socket.IO events that are common to all question types
"""
from flask import request, session
from flask_socketio import emit, join_room
from .. import socketio
from ..game_state import game_state
from .utils import get_scores_data
from time import time

@socketio.on('join_room')
def handle_join_room(data):
    player_name = data['player_name']
    join_room(player_name)
    print(f'Player {player_name} joined room {player_name}')

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

@socketio.on('time_up')
def handle_time_up():
    """Handle when time is up for any question type."""
    current_question = game_state.questions[game_state.current_question]
    question_type = current_question.get('type', 'ABCD')

    print(f"Question type: {question_type}")
    
    # Get scores data in the appropriate format
    scores = get_scores_data()
    
    # Route to appropriate handler based on question type
    if question_type == 'OPEN_ANSWER':
        from .open_answer_events import handle_open_answer_time_up
        handle_open_answer_time_up(scores)
    elif question_type == 'GUESS_A_NUMBER':
        from .guess_number_events import handle_guess_number_time_up
        handle_guess_number_time_up(scores)
    else:
        # ABCD and TRUE_FALSE questions
        from .abcd_events import handle_abcd_time_up
        handle_abcd_time_up(scores)
