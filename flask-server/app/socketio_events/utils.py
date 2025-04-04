"""
Utility functions for Socket.IO events
"""
from .. import socketio
from ..game_state import game_state
from ..constants import PREVIEW_TIME, WAITING_TIME, WAITING_TIME_DRAWING, PREVIEW_TIME_DRAWING
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
        
    # Calculate when to show buttons based on the current time and waiting time based on next question type
    question_type = game_state.questions[(game_state.current_question + 1) if game_state.current_question + 1 < len(game_state.questions) else game_state.current_question].get('type', '')
    timeConst = None
    previewConst = None
    if question_type == 'DRAWING':
        timeConst = WAITING_TIME_DRAWING
        previewConst = PREVIEW_TIME_DRAWING
    else:
        timeConst = WAITING_TIME
        previewConst = PREVIEW_TIME
    
    show_buttons_at = int((time() + timeConst) * 1000)
    game_state.question_start_time = show_buttons_at
    
    # Check if next question exists and is a drawing question, and find the drawer
    next_drawer = None
    if game_state.current_question + 1 < len(game_state.questions):
        next_question = game_state.questions[game_state.current_question + 1]
        if next_question.get('type') == 'DRAWING':
            next_drawer = next_question.get('player')
    
    data = {
        "scores": scores,
        "correct_answer": correct_answer,
        "show_question_preview_at": show_buttons_at - previewConst,
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote,
        "next_drawer": next_drawer  # Add next drawer information
    }
    
    # Add any additional data provided
    data.update(additional_data)
    
    # Emit the event
    socketio.emit('all_answers_received', data)
    
    return show_buttons_at
