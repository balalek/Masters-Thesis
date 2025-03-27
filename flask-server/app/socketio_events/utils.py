"""
Utility functions for Socket.IO events
"""
from .. import socketio
from ..game_state import game_state
from ..constants import PREVIEW_TIME, WAITING_TIME
from time import time

def get_scores_data():
    """Get formatted scores data based on game mode"""
    if game_state.is_team_mode:
        return {
            'is_team_mode': True,
            'teams': game_state.team_scores,
            'blue_team': game_state.blue_team,
            'red_team': game_state.red_team,
            'individual': game_state.players
        }
    else:
        return game_state.players

def emit_all_answers_received(scores, correct_answer, additional_data=None):
    """Send all_answers_received event with standard data"""
    if additional_data is None:
        additional_data = {}
        
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    game_state.question_start_time = show_buttons_at
    
    data = {
        "scores": scores,
        "correct_answer": correct_answer,
        "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote
    }
    
    # Add any additional data provided
    data.update(additional_data)
    
    # Emit the event
    socketio.emit('all_answers_received', data)
    
    return show_buttons_at
