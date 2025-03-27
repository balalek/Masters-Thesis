"""
Socket.IO events for ABCD and True/False questions
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_CORRECT_ANSWER
from ..services.quiz_service import QuizService
from time import time
from .utils import emit_all_answers_received, get_scores_data

@socketio.on('submit_answer')
def submit_answer(data):
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
    
    QuizService.update_question_metadata(
        str(current_question_data['_id']), 
        is_correct=(answer == correct_answer),
        increment_times_played=not game_state.current_question_metadata_updated
    )
    game_state.current_question_metadata_updated = True
    
    # Calculate speed points
    question_start_time = game_state.question_start_time
    question_length = game_state.questions[current_question]['length'] * 1000
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
        scores = get_scores_data()
        emit_all_answers_received(
            scores=scores,
            correct_answer=correct_answer,
            additional_data={"answer_counts": game_state.answer_counts}
        )

def handle_abcd_time_up(scores):
    """Handle time up for ABCD and TRUE_FALSE questions"""
    current_question = game_state.questions[game_state.current_question]
    
    emit_all_answers_received(
        scores=scores,
        correct_answer=current_question.get('answer', ''),
        additional_data={"answer_counts": game_state.answer_counts}
    )
