"""Quiz management routes for the quiz application.
Handles CRUD operations for quizzes and questions, including
creation, retrieval, updating, deletion, and validation.
"""
from flask import Blueprint, jsonify, request
from ..services.quiz_service import QuizService
from ..constants import QUIZ_VALIDATION, QUIZ_CATEGORIES
from ..utils import get_device_id

quiz_management_routes = Blueprint('quiz_management_routes', __name__)

@quiz_management_routes.route('/check_question', methods=['POST'])
def check_question():
    """
    Validate an ABCD question before it's saved to the database.
    TODO: Implement validations for other question types. 
          Now it's being validated only in the frontend, which is good for now.
    
    Validates:

    - Question text length
    - Answer text lengths
    - Time limit range
    - Category validity
    
    Request body (JSON):

        questions: Array containing a single question object to validate
    
    Returns:
        200 JSON: Message confirming question validity
        400 JSON: Error with specific validation failure reason
    """
    data = request.json
    question = data.get('questions', [{}])[0]  # Get the first (and only) question
    
    # Question text validation
    if len(question['question']) > QUIZ_VALIDATION['QUESTION_MAX_LENGTH']:
        return jsonify({
            "error": f"Otázka nesmí být delší než {QUIZ_VALIDATION['QUESTION_MAX_LENGTH']} znaků"
        }), 400

    # Answers validation
    for answer in question['answers']:
        if len(answer) > QUIZ_VALIDATION['ANSWER_MAX_LENGTH']:
            return jsonify({
                "error": f"Odpověď nesmí být delší než {QUIZ_VALIDATION['ANSWER_MAX_LENGTH']} znaků"
            }), 400

    # Time limit validation
    if not (QUIZ_VALIDATION['TIME_LIMIT_MIN'] <= question['timeLimit'] <= QUIZ_VALIDATION['TIME_LIMIT_MAX']):
        return jsonify({
            "error": f"Časový limit musí být mezi {QUIZ_VALIDATION['TIME_LIMIT_MIN']}-{QUIZ_VALIDATION['TIME_LIMIT_MAX']} vteřinami"
        }), 400

    # Category validation
    if question['category'] not in QUIZ_CATEGORIES:
        return jsonify({
            "error": "Neplatná kategorie"
        }), 400
        
    return jsonify({"message": "Question is valid"}), 200

@quiz_management_routes.route('/create_quiz', methods=['POST'])
def create_quiz():
    """
    Create a new quiz with the specified name, questions, and type.
    
    The new quiz is associated with the device ID of the creator.
    
    Request body (JSON):

        name: Quiz name
        questions: Array of question objects
        type: Quiz type identifier
    
    Returns:
        201 JSON: Success message with the new quiz ID
        400 JSON: Error for invalid input (missing name, no questions, etc.)
        500 JSON: Error for server-side failures
    """
    data = request.json
    quiz_name = data.get('name')
    questions = data.get('questions', [])
    quiz_type = data.get('type')
    device_id = get_device_id()
    
    if not quiz_name:
        return jsonify({"error": "Zadejte název kvízu"}), 400
    
    if len(quiz_name) > QUIZ_VALIDATION['QUIZ_NAME_MAX_LENGTH']:
        return jsonify({"error": f"Název kvízu nesmí být delší než {QUIZ_VALIDATION['QUIZ_NAME_MAX_LENGTH']} znaků"}), 400
    
    if not questions:
        return jsonify({"error": "Vytvořte alespoň jednu otázku"}), 400

    try:
        quiz_id = QuizService.create_quiz(quiz_name, questions, quiz_type, device_id)
        return jsonify({
            "message": "Kvíz byl úspěšně vytvořen",
            "quizId": str(quiz_id)
        }), 201
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
    except Exception as e:
        return jsonify({"error": f"Došlo k chybě při vytváření kvízu: {str(e)}"}), 500

@quiz_management_routes.route('/quiz/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    """
    Retrieve a specific quiz by its ID.
    
    Used to get full quiz details including all questions.
    
    Path parameters:

        quiz_id: MongoDB ObjectId of the quiz to retrieve
    
    Returns:
        200 JSON: Complete quiz object with all fields
        404 JSON: Error if quiz not found
        500 JSON: Error for server-side failures
    """
    try:
        quiz = QuizService.get_quiz(quiz_id)

        if not quiz:
            return jsonify({"error": "Kvíz nebyl nalezen"}), 404
        
        return jsonify(quiz), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@quiz_management_routes.route('/quiz/<quiz_id>/toggle-share', methods=['POST'])
def toggle_share_quiz(quiz_id):
    """
    Toggle the public/private status of a quiz.

    Only the creator of a quiz (identified by device ID) can toggle its status.
    
    Path parameters:

        quiz_id: MongoDB ObjectId of the quiz to modify
    
    Returns:
        200 JSON: Updated publicity status
        403 JSON: Error if user doesn't have permission
        500 JSON: Error for server-side failures
    """
    try:
        device_id = get_device_id()
        result = QuizService.toggle_quiz_publicity(quiz_id, device_id)

        return jsonify(result), 200
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@quiz_management_routes.route('/quiz/<quiz_id>/update', methods=['PUT'])
def update_quiz(quiz_id):
    """
    Update an existing quiz with new name, questions, or type.
    
    Only the creator of a quiz (identified by device ID) can update it.
    Handles tracking of deleted questions to clean up associated media.
    
    Path parameters:

        quiz_id: MongoDB ObjectId of the quiz to update
    
    Request body (JSON):

        name: Updated quiz name
        questions: Updated array of question objects
        deletedQuestions: Array of question IDs that were removed
        type: Updated quiz type identifier
    
    Returns:
        200 JSON: Success message with updated quiz ID
        400 JSON: Error for invalid input or permission issues
        500 JSON: Error for server-side failures
    """
    try:
        data = request.json
        quiz_name = data.get('name')
        questions = data.get('questions', [])
        deleted_questions = data.get('deletedQuestions', [])
        quiz_type = data.get('type')
        device_id = get_device_id()
        
        if not quiz_name:
            return jsonify({"error": "Zadejte název kvízu"}), 400
        
        if len(quiz_name) > QUIZ_VALIDATION['QUIZ_NAME_MAX_LENGTH']:
            return jsonify({"error": f"Název kvízu nesmí být delší než {QUIZ_VALIDATION['QUIZ_NAME_MAX_LENGTH']} znaků"}), 400
        
        if not questions:
            return jsonify({"error": "Vytvořte alespoň jednu otázku"}), 400

        result = QuizService.update_quiz(
            quiz_id, 
            quiz_name, 
            questions, 
            device_id,
            deleted_questions,
            quiz_type
        )

        return jsonify({
            "message": "Kvíz byl úspěšně aktualizován",
            "quizId": str(result)
        }), 200
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
    except Exception as e:
        return jsonify({"error": f"Došlo k chybě při aktualizaci kvízu: {str(e)}"}), 500

@quiz_management_routes.route('/quiz/<quiz_id>', methods=['DELETE'])
def delete_quiz(quiz_id):
    """
    Delete a quiz and its associated questions.
    
    Only the creator of a quiz (identified by device ID) can delete it.
    
    Path parameters:

        quiz_id: MongoDB ObjectId of the quiz to delete
    
    Returns:
        200 JSON: Success message confirming deletion
        403 JSON: Error if user doesn't have permission
        500 JSON: Error for server-side failures
    """
    try:
        device_id = get_device_id()
        QuizService.delete_quiz(quiz_id, device_id)

        return jsonify({"message": "Kvíz byl úspěšně smazán"}), 200
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    
    except Exception as e:
        return jsonify({"error": f"Došlo k chybě při mazání kvízu: {str(e)}"}), 500

@quiz_management_routes.route('/quiz/<quiz_id>/copy', methods=['POST'])
def copy_quiz(quiz_id):
    """
    Create a copy of an existing quiz.
    
    The copy is associated with the current device ID.
    Used to duplicate public quizzes or to create variants of existing quizzes.
    
    Path parameters:

        quiz_id: MongoDB ObjectId of the quiz to copy
    
    Returns:
        200 JSON: Success message with new quiz ID
        400 JSON: Error if the quiz can't be copied
        500 JSON: Error for server-side failures
    """
    try:
        device_id = get_device_id()
        new_quiz_id = QuizService.copy_quiz(quiz_id, device_id)

        return jsonify({
            "message": "Kvíz byl úspěšně zkopírován",
            "quizId": str(new_quiz_id),
            "success": True
        }), 200
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
    except Exception as e:
        return jsonify({"error": f"Došlo k chybě při kopírování kvízu: {str(e)}"}), 500

@quiz_management_routes.route('/get_existing_questions', methods=['GET'])
def get_existing_questions():
    """
    Retrieve existing questions with filtering options.
    
    Used for question reuse across quizzes and searching the question library.
    
    Query parameters:

        type: Filter by source ('mine' or 'others')
        questionType: Filter by question type 
        search: Text search query
        page: Page number for pagination (starting from 1)
    
    Returns:
        200 JSON: Object with matching questions, hasMore flag, and total count
        500 JSON: Error for server-side failures
    """
    try:
        device_id = get_device_id()
        filter_type = request.args.get('type', 'others')
        question_type = request.args.get('questionType', 'all')
        search_query = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = 10 # Number of items per page
        
        result = QuizService.get_existing_questions(
            device_id=device_id,
            filter_type=filter_type,
            question_type=question_type,
            search_query=search_query,
            page=page,
            per_page=per_page
        )
        
        return jsonify({
            "questions": result["questions"],
            "hasMore": len(result["questions"]) == per_page,
            "totalCount": result["total_count"]
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e), "questions": []}), 500

@quiz_management_routes.route('/quizzes', methods=['GET'])
def get_quizzes():
    """
    Retrieve quizzes with filtering and pagination.
    
    Lists quizzes created by the user or public quizzes from other users.
    
    Query parameters:
    
        page: Page number for pagination (starting from 1)
        per_page: Number of items per page
        filter: Filter by ownership ('mine' or 'public')
        search: Text search query
        type: Filter by quiz type
    
    Returns:
        200 JSON: Object with matching quizzes, total count, and hasMore flag
        500 JSON: Error for server-side failures with empty result set
    """
    try:
        device_id = get_device_id()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        filter_type = request.args.get('filter', 'mine')  # 'mine' or 'public'
        search_query = request.args.get('search', '')
        quiz_type = request.args.get('type', 'all')
        
        result = QuizService.get_quizzes(
            device_id=device_id,
            filter_type=filter_type,
            quiz_type=quiz_type,
            search_query=search_query,
            page=page,
            per_page=per_page
        )
        
        return jsonify({
            "quizzes": result["quizzes"],
            "total": result["total"],
            "hasMore": result["has_more"] # This will be set to false if there are no more quizzes to paginate
        }), 200
    
    except Exception as e:
        return jsonify({
            "error": str(e),
            "quizzes": [],
            "total": 0,
            "hasMore": False 
        }), 500