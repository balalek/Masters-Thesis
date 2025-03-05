from flask import jsonify, send_from_directory, request
from pathlib import Path
from . import app, socketio
from .game_state import game_state
from .constants import AVAILABLE_COLORS, MAX_PLAYERS, PREVIEW_TIME, START_GAME_TIME, QUIZ_VALIDATION, QUIZ_CATEGORIES, is_online
from time import time
from .services.quiz_service import QuizService
from .services.local_storage_service import LocalStorageService
from .utils import convert_mongo_doc, get_device_id, check_internet_connection

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    file_path = Path(app.static_folder) / path
    if path != "" and file_path.exists():
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/available_colors', methods=['GET'])
def get_available_colors():
    used_colors = [player['color'] for player in game_state.players.values()]
    available_colors = [color for color in AVAILABLE_COLORS if color not in used_colors]
    return jsonify({"colors": available_colors})

@app.route('/join', methods=['POST'])
def join():
    if not game_state.is_quiz_active:
        return jsonify({"error": "Žádný kvíz není momentálně připraven"}), 400
    
    if len(game_state.players) >= MAX_PLAYERS:
        return jsonify({"error": f"Kvíz již dosáhl maximálního počtu hráčů ({MAX_PLAYERS})"}), 400

    player_name = request.json['player_name']
    player_color = request.json['color']

    if player_name in game_state.players:
        return jsonify({"error": "Tato přezdívka je již zabraná"}), 400
        
    used_colors = [player['color'] for player in game_state.players.values()]
    if player_color not in AVAILABLE_COLORS or player_color in used_colors:
        return jsonify({"error": "Color not available"}), 400
        
    game_state.players[player_name] = {
        "score": 0,
        "color": player_color
    }
    
    new_used_colors = [player['color'] for player in game_state.players.values()]
    new_available_colors = [c for c in AVAILABLE_COLORS if c not in new_used_colors]
    
    socketio.emit('colors_updated', {"colors": new_available_colors})
    socketio.emit('player_joined', {"player_name": player_name, "color": player_color})
    
    return jsonify({"message": "Player joined", "colors": new_available_colors}), 200

@app.route('/activate_quiz', methods=['POST'])
def activate_quiz():
    game_state.is_quiz_active = True
    return jsonify({"message": "Quiz activated"}), 200

@app.route('/start_game', methods=['POST'])
def start_game():
    if len(game_state.players) < 2:
        return jsonify({"error": "Hra nemůže začít, dokud nejsou připojeni alespoň 2 hráči"}), 400

    # Add team mode handling
    game_state.is_team_mode = request.json.get('isTeamMode', False)
    game_state.is_remote = request.json.get('isRemote', False)
    if game_state.is_team_mode:
        team_assignments = request.json.get('teamAssignments', {})
        game_state.blue_team = team_assignments.get('blue', [])
        game_state.red_team = team_assignments.get('red', [])
        game_state.team_scores = {'blue': 0, 'red': 0}

        if len(game_state.blue_team) == 0 or len(game_state.red_team) == 0:
            return jsonify({"error": "V každém týmu musí být alespoň jeden hráč"}), 400
        
        print("\n=== Team Mode Debug ===")
        print(f"Blue Team: {game_state.blue_team}")
        print(f"Red Team: {game_state.red_team}")
        print("=====================\n")

    # Get quiz from SQLite DB or MongoDB using the service
    quiz = QuizService.get_quiz("67bae9e6d37bd4d827944e72")
    if not quiz:
        return jsonify({"error": "Kvíz nebyl nalezen"}), 404
        
    # The questions are already JSON-serializable
    game_state.questions = quiz["questions"]
    game_state.current_question = 0
    game_state.answers_received = 0
    game_state.answer_counts = [0, 0, 0, 0]
    
    current_time = int(time() * 1000)
    game_start_time = current_time + START_GAME_TIME  # 5 seconds from now
    
    first_question = game_state.questions[game_state.current_question]
    game_state.question_start_time = game_start_time  + PREVIEW_TIME # Set the start time for the first question

    if game_state.is_remote:
        socketio.emit('game_started_remote', {
            "question": first_question,
            "show_first_question_preview": game_start_time,  # When countdown ends and preview starts
            "show_game_at": game_start_time + PREVIEW_TIME     # When preview ends and game starts
        })
    else:    
        socketio.emit('game_started', {
            "question": first_question,
            "show_first_question_preview": game_start_time,  # When countdown ends and preview starts
            "show_game_at": game_start_time + PREVIEW_TIME     # When preview ends and game starts
        })
    return jsonify({"message": "Game started"}), 200

@app.route('/next_question', methods=['POST'])
def next_question():
    if game_state.current_question is None or game_state.current_question + 1 >= len(game_state.questions):
        return jsonify({"error": "No more questions"}), 400
    
    game_state.current_question += 1
    game_state.answers_received = 0
    game_state.answer_counts = [0, 0, 0, 0]

    next_question = game_state.questions[game_state.current_question]
    is_last_question = game_state.current_question + 1 == len(game_state.questions)

    socketio.emit('next_question', {
        "question": next_question,
        "is_last_question": is_last_question
    })
    return jsonify({
        "question": next_question,
        "is_last_question": is_last_question,
        "preview_time": PREVIEW_TIME
    }), 200

@app.route('/reset_game', methods=['POST'])
def reset_game():
    was_remote = game_state.is_remote  # Store the state before reset
    game_state.reset()
    # After reset, emit the full color list since no players exist
    socketio.emit('colors_updated', {"colors": AVAILABLE_COLORS})
    socketio.emit('game_reset', {"was_remote": was_remote})
    return jsonify({"message": "Game state reset", "was_remote": was_remote}), 200

@app.route('/server_time', methods=['GET'])
def get_server_time():
    return jsonify({"server_time": int(time() * 1000)})  # Return time in milliseconds

@app.route('/check_question', methods=['POST'])
def check_question():
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

@app.route('/create_quiz', methods=['POST'])
def create_quiz():
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

@app.route('/quiz/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    try:
        quiz = QuizService.get_quiz(quiz_id)
        if not quiz:
            return jsonify({"error": "Kvíz nebyl nalezen"}), 404
        return jsonify(quiz), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/online_status', methods=['GET'])
def get_online_status():
    """
    Check and return the current online status.
    Forces a check of the internet connection.
    """
    is_connected = check_internet_connection()
    return jsonify({"is_online": is_connected}), 200

@app.route('/get_existing_questions', methods=['GET'])
def get_existing_questions():
    try:
        device_id = get_device_id()
        filter_type = request.args.get('type', 'others')
        question_type = request.args.get('questionType', 'all')
        search_query = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = 10
        
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
        print(f"Error in get_existing_questions: {str(e)}")
        return jsonify({"error": str(e), "questions": []}), 500