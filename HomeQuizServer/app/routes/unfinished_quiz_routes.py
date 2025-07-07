"""Routes for managing unfinished/autosaved quizzes.
Handles CRUD operations for draft quizzes that are saved
during creation, but not yet created (in case of disconnection or other issues).

Author: Bc. Martin Baláž
"""
from flask import Blueprint, jsonify, request
from ..services.unfinished_quiz_service import UnfinishedQuizService

unfinished_quiz_routes = Blueprint('unfinished_quiz_routes', __name__)

@unfinished_quiz_routes.route('/unfinished_quizzes', methods=['GET'])
def get_unfinished_quizzes():
    """
    Retrieve all unfinished quizzes for the current device.
    
    Used to display autosave history and allow users to resume
    editing previously unfinished quizzes.
    
    Returns:
        200 JSON: Object containing array of unfinished quiz drafts
            {
                "unfinished_quizzes": [...]
            }
    """
    quizzes = UnfinishedQuizService.get_unfinished_quizzes()

    return jsonify({"unfinished_quizzes": quizzes}), 200

@unfinished_quiz_routes.route('/unfinished_quizzes/<identifier>', methods=['GET'])
def get_unfinished_quiz(identifier):
    """
    Retrieve a specific unfinished quiz by its identifier.
    
    Used when resuming work on a previously saved draft.
    
    Path parameters:

        identifier: Unique identifier of the saved draft
    
    Returns:
        200 JSON: Complete unfinished quiz object
        404 JSON: Error if the draft wasn't found
    """
    quiz = UnfinishedQuizService.get_unfinished_quiz(identifier)

    if not quiz:
        return jsonify({"error": "Koncept nedokončeného kvízu nebyl nalezen"}), 404
    
    return jsonify(quiz), 200

@unfinished_quiz_routes.route('/unfinished_quizzes', methods=['POST'])
def save_unfinished_quiz():
    """
    Save or update an unfinished quiz draft.
    
    Handles both autosave during quiz creation and explicit 
    draft saving by the user.
    
    Request body (JSON):

        quiz_data: Quiz data to save
        is_editing: Whether this is an edit of an existing quiz
        quiz_id: ID of the original quiz if editing existing quiz
        autosave_id: Existing autosave ID if updating a draft
    
    Returns:
        200 JSON: Success confirmation with autosave identifier
            {
                "success": true,
                "autosave_id": "..."
            }
        500 JSON: Error if saving fails
    """
    data = request.json
    is_editing = data.get('is_editing', False)
    quiz_id = data.get('quiz_id')
    autosave_id = data.get('autosave_id')  # Get the autosave ID if provided
    
    success, identifier = UnfinishedQuizService.save_unfinished_quiz(
        data.get('quiz_data', {}), 
        is_editing, 
        quiz_id,
        autosave_id
    )
    
    if success:
        return jsonify({
            "success": True,
            "autosave_id": identifier  # Always return the identifier to the client
        }), 200
    
    return jsonify({
        "error": "Selhalo uložení nedokončeného kvízu",
        "success": False
    }), 500

@unfinished_quiz_routes.route('/unfinished_quizzes/<identifier>', methods=['DELETE'])
def delete_unfinished_quiz(identifier):
    """
    Delete an unfinished quiz draft.
    
    Optionally can preserve associated media files when
    deleting a draft (useful when publishing the quiz).
    
    Path parameters:

        identifier: Unique identifier of the draft to delete
    
    Query parameters:

        keep_files: Boolean flag ('true'/'false') determining whether 
                   to keep associated media files
    
    Returns:
        200 JSON: Success confirmation
        500 JSON: Error if deletion fails
    """
    keep_files = request.args.get('keep_files', 'false').lower() == 'true'
    result = UnfinishedQuizService.delete_unfinished_quiz(identifier, keep_files)

    if result:
        return jsonify({"success": True}), 200
    
    return jsonify({"error": "Smazání nedokončeného kvízu selhalo"}), 500