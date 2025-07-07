"""Socket.IO event handlers for multiple-choice questions.

This module manages real-time interactions for ABCD and True/False question types:

- Answer submission and validation
- Point calculation based on correctness and speed
- Team vs individual scoring modes
- Answer statistics and aggregation
- Automatic progression when all answers are received

The handlers support both team-based and individual gameplay, with appropriate
scoring and feedback mechanisms for each mode.

Author: Bc. Martin Baláž
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_CORRECT_ANSWER
from .utils import emit_all_answers_received, get_scores_data

@socketio.on('submit_answer')
def submit_answer(data):
    """
    Handle submission of answers for ABCD and True/False questions.
    
    Processes player answers, calculates points based on correctness and speed,
    updates question statistics, and manages team/individual scoring modes.
    Automatically advances to results when all required answers are received.
    
    Args:
        data (dict):
        
            - player_name: Name of the player submitting the answer
            - answer: Selected answer index/value 
            - answer_time: Timestamp when answer was submitted
    
    Emits:
        - 'error': If game is not started
        - 'answer_correctness': Result notification with points to the player/team
        - 'answer_submitted': Notification that an answer was received
    """
    player_name = data['player_name']
    answer = data['answer']
    answer_time = data['answer_time']
    current_question = game_state.current_question
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    current_question_data = game_state.questions[current_question]
    correct_answer = current_question_data['answer']
    points_earned = POINTS_FOR_CORRECT_ANSWER if answer == correct_answer else 0
    
    # Calculate speed points
    question_start_time = game_state.question_start_time
    question_length = game_state.questions[current_question]['length'] * 1000
    time_taken = answer_time - question_start_time
    speed_points = max(0, POINTS_FOR_CORRECT_ANSWER - int((time_taken / question_length) * POINTS_FOR_CORRECT_ANSWER)) if answer == correct_answer else 0
    total_points_earned = points_earned + speed_points
    
    if game_state.is_team_mode:
        team = 'blue' if player_name in game_state.blue_team else 'red'
        team_players = game_state.blue_team if team == 'blue' else game_state.red_team
        
        if answer == correct_answer:
            game_state.team_scores[team] += total_points_earned
            
        # Send result to all team members (blocks them from answering again to the same question)
        for team_player in team_players:
            emit('answer_correctness', {
                "correct": answer == correct_answer,
                "points_earned": total_points_earned,
                "total_points": game_state.team_scores[team],
                "is_team_score": True
            }, room=team_player)
    else:
        # Free-for-all scoring logic
        if answer == correct_answer:
            game_state.players[player_name]['score'] += total_points_earned
        
        # This is sent to the player who answered to show their answer screen
        emit('answer_correctness', {
            "correct": answer == correct_answer,
            "points_earned": total_points_earned,
            "total_points": game_state.players[player_name]['score'],
            "is_team_score": False
        }, room=player_name)
    
    # Update counts for main screen
    game_state.answers_received += 1
    game_state.answer_counts[answer] += 1
    socketio.emit('answer_submitted')
    
    # Check if we should proceed to next stage
    answers_needed = 2 if game_state.is_team_mode else len(game_state.players)
    # If all players have answered, emit the results, which indicates the end of the round
    if game_state.answers_received == answers_needed:
        scores = get_scores_data()
        emit_all_answers_received(
            scores=scores,
            correct_answer=correct_answer,
            additional_data={"answer_counts": game_state.answer_counts}
        )

def handle_abcd_time_up(scores):
    """
    Handle time expiration for ABCD and TRUE_FALSE questions.
    
    Sends the correct answer and final scores to all players
    when the question timer expires, regardless of how many
    players have answered.
    
    Args:
        scores: Current game scores data structure
    
    Emits:
        - Event via emit_all_answers_received with correct answer and statistics
    """
    current_question = game_state.questions[game_state.current_question]
    
    emit_all_answers_received(
        scores=scores,
        correct_answer=current_question.get('answer', ''),
        additional_data={"answer_counts": game_state.answer_counts}
    )
