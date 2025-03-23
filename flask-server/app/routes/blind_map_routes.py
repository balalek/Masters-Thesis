from flask import jsonify, request
from .. import app
from ..services.blind_map_service import BlindMapService
from ..services.quiz_service import QuizService

@app.route('/check_blind_map', methods=['POST'])
def check_blind_map():
    """Check a blind map question answer."""
    data = request.json
    question_id = data.get('questionId')
    user_x = data.get('x')
    user_y = data.get('y')
    
    if not question_id or user_x is None or user_y is None:
        return jsonify({
            "error": "Chybí povinné parametry"
        }), 400
    
    # Calculate score
    result = BlindMapService.calculate_score(question_id, user_x, user_y)
    
    # Update question metadata
    QuizService.update_question_metadata(
        question_id, 
        is_correct=result["correct"],
        increment_times_played=True
    )
    
    return jsonify(result), 200
