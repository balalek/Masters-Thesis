"""Socket.IO utility functions for quiz event handling.

This module provides helper functions that support Socket.IO event handlers:

- Score data formatting for both team and individual modes
- Standard event emission for transitions between questions
- Timing calculations for game flow control
- Data preparation for frontend display

These utilities ensure consistent behavior across different question types
and gameplay modes while reducing code duplication.
"""
from .. import socketio
from ..game_state import game_state
from ..constants import PREVIEW_TIME, WAITING_TIME, WAITING_TIME_DRAWING, PREVIEW_TIME_DRAWING
from time import time

def get_scores_data():
    """
    Get formatted scores data based on current game mode.
    
    Creates a standardized score data structure that adapts to the current game mode:
    
    - In team mode: Returns team scores, team member lists, and individual player data
    - In individual mode: Returns player data dictionary with scores and their colors
    
    Returns:
        dict: Score data structure appropriate for current game mode
    """
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
    """
    Send standardized 'all_answers_received' event with timing information.
    
    Broadcasts a standard message to all clients when all answers have been received 
    or time has expired for a question. Calculates timing for the next question based
    on question type (drawing questions get longer preparation time).
    
    Handles the transition between questions with appropriate timing delays
    and provides drawer information for upcoming drawing questions.
    
    Args:
        scores: Current player/team scores data structure
        correct_answer: The correct answer for the current question
        additional_data: Optional dictionary with extra data to include
    
    Returns:
        int: Timestamp (ms) when the next question will start on mobiles
    """
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
        "show_question_preview_at": show_buttons_at - previewConst, # Question Preview will be seen sooner
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote,
        "next_drawer": next_drawer # For drawing questions, prepare the drawer for the next question
    }
    
    # Add any additional data provided
    data.update(additional_data)

    socketio.emit('all_answers_received', data)
    
    return show_buttons_at