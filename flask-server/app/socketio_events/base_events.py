"""Base Socket.IO event handlers for the quiz application.

This module provides core Socket.IO event handlers that apply across all question types:

- Room management for directing messages to specific clients
- Connection handling and remote display coordination
- Score calculation and display for both team and individual modes
- Time expiration handling with type-specific routing
- Game state transitions and flow control

These handlers form the foundation for real-time communication in the application.
"""
from flask import request, session
from flask_socketio import emit, join_room
from .. import socketio
from ..game_state import game_state
from .utils import get_scores_data

@socketio.on('join_room')
def handle_join_room(data):
    """
    Handle player joining a room for private messages.
    
    Creates a room with the player's name to enable direct communication
    with individual players' devices.
    
    Args:
        data: Dictionary containing player information with 'player_name' key
    """
    player_name = data['player_name']
    join_room(player_name)
    print(f'Player {player_name} joined room {player_name}')

@socketio.on('connect')
def handle_connect():
    """
    Handle new client connections. Automatically triggers when a client connects.
    
    Detects if the connection is from the server (localhost) and sets
    a session flag accordingly.
    """
    is_server = request.remote_addr == '127.0.0.1'
    if is_server:
        session['server'] = True
    print(f'Client connected from {request.remote_addr}. Is server: {is_server}')

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle client disconnection. Automatically triggers when a client disconnects.
    
    Cleans up session data when clients disconnect.
    """
    print('Client disconnected')
    if 'server' in session:
        del session['server']

@socketio.on('remote_display_connected')
def handle_remote_display_connected():
    """
    Send notification that a remote display has been connected.
    
    Broadcasts to main screen especially, that a remote display is now available.
    
    Emits:
        - 'remote_display_connected': Notification to all clients that remote display is available
    """
    socketio.emit('remote_display_connected')

@socketio.on('is_remote_connected')
def handle_is_remote_connected():
    """
    Ask if a remote display is connected on main screen.
    
    Triggers remote status check across all connected clients.
    
    Emits:
        - 'is_remote_connected': Query to check if a remote display is connected
    """
    socketio.emit('is_remote_connected')

@socketio.on('show_final_score')
def handle_show_final_score():
    """
    Display final game scores to all players.
    
    Handles both team mode and individual play:
    
    - In team mode: Shows team scores with winning team highlighted
    - In individual mode: Shows personal score and placement for each player
    
    Players receive personalized score information via their individual rooms.
    
    Emits:
        - 'navigate_to_final_score': Personalized final score data to each player
    """
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
        # Free-for-all scoring logic
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
    """
    Handle question time expiration.
    
    Dynamically routes to the appropriate handler based on the current question type.
    Each question type has specialized time-up logic:
    
    - ABCD/TRUE_FALSE: Show correct answer and statistics
    - OPEN_ANSWER: Reveal answer and update scores
    - GUESS_A_NUMBER: Show correct number and proximity scores
    - DRAWING: End drawing phase and show the answer
    - WORD_CHAIN: End the team-play mode (bomb explodes) round and show statistics
    - MATH_QUIZ: Time up is being handled in frontend
    - BLIND_MAP: End guessing phase and show correct location
    
    Gathers current scores before passing to the specialized handler.
    
    Emits:
        - Events via type-specific handler functions
    """
    current_question = game_state.questions[game_state.current_question]
    question_type = current_question.get('type', 'ABCD')
    
    # Get scores data in the appropriate format
    scores = get_scores_data()
    
    # Route to appropriate handler based on question type
    if question_type == 'OPEN_ANSWER':
        from .open_answer_events import handle_open_answer_time_up
        handle_open_answer_time_up(scores)
    elif question_type == 'GUESS_A_NUMBER':
        from .guess_number_events import handle_guess_number_time_up
        handle_guess_number_time_up(scores)
    elif question_type == 'DRAWING':
        from .drawing_events import handle_drawing_time_up
        handle_drawing_time_up(scores)
    elif question_type == 'WORD_CHAIN':
        from .word_chain_events import handle_word_chain_time_up
        handle_word_chain_time_up(scores)
    elif question_type == 'BLIND_MAP':
        from .blind_map_events import handle_blind_map_time_up
        handle_blind_map_time_up(scores)
    else:
        # ABCD and TRUE_FALSE questions
        from .abcd_events import handle_abcd_time_up
        handle_abcd_time_up(scores)