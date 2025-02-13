from flask import request, session
from flask_socketio import emit, join_room
from . import socketio
from .game_state import game_state
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
    current_question = game_state.current_question
    points_for_correct = 50
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    correct_answer = game_state.questions[current_question]['answer']
    points_earned = points_for_correct if answer == correct_answer else 0
    
    if answer == correct_answer:
        game_state.players[player_name]['score'] += points_for_correct
    
    game_state.answers_received += 1
    game_state.answer_counts[answer] += 1
    
    socketio.emit('answer_submitted')
    emit('answer_correctness', {
        "correct": answer == correct_answer,
        "points_earned": points_earned,
        "total_points": game_state.players[player_name]['score']
    }, room=player_name)
    
    if game_state.answers_received == len(game_state.players):
        show_buttons_at = int((time() + 10) * 1000)  # 10 seconds from now, in milliseconds
        socketio.emit('all_answers_received', {
            "scores": game_state.players,
            "correct_answer": correct_answer,
            "answer_counts": game_state.answer_counts,
            "show_question_preview_at": show_buttons_at - 5000,  # 5 seconds before showing buttons
            "show_buttons_at": show_buttons_at
        })

@socketio.on('show_final_score')
def handle_show_final_score():
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
            'color': data['color']
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