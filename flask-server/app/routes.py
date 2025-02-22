from flask import jsonify, send_from_directory, request
from pathlib import Path
from . import app, socketio
from .game_state import game_state
from .constants import AVAILABLE_COLORS, MAX_PLAYERS, PREVIEW_TIME, START_GAME_TIME
from time import time
from .constants import QUIZ_VALIDATION, QUIZ_CATEGORIES

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

        # Check if there is at least one player in each team
        if len(game_state.blue_team) == 0 or len(game_state.red_team) == 0:
            return jsonify({"error": "V každém týmu musí být alespoň jeden hráč"}), 400
        
        print("\n=== Team Mode Debug ===")
        print(f"Blue Team: {game_state.blue_team}")
        print(f"Red Team: {game_state.red_team}")
        print("=====================\n")

    game_state.questions = [
        {
            "type": "ABCD",
            "question": "Kolik je 2 + 2?", 
            "options": ["3", "4", "5", "8"],
            "length": 8,  # 8 seconds to answer
            "answer": 1
        },
        {
            "type": "TRUE_FALSE",
            "question": "Praha je hlavním městem České republiky", 
            "options": ["Pravda", "Lež"],
            "length": 5,
            "answer": 0  # true = 0, false = 1
        },
        {
            "type": "ABCD",
            "question": "Kolik je odmocnina ze 16?", 
            "options": ["3", "4", "5", "6"], 
            "length": 8,
            "answer": 1
        }
    ]
    
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