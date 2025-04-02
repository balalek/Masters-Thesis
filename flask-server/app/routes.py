from flask import jsonify, send_from_directory, request
from pathlib import Path
from . import app, socketio
from .game_state import game_state
from .constants import AVAILABLE_COLORS, MAX_PLAYERS, PREVIEW_TIME, PREVIEW_TIME_DRAWING, START_GAME_TIME, QUIZ_VALIDATION, QUIZ_CATEGORIES, is_online
from time import time
import requests  # Add this import for HTTP requests
from .services.quiz_service import QuizService
from .services.local_storage_service import LocalStorageService
from .utils import convert_mongo_doc, get_device_id, check_internet_connection
from .services.cloudinary_service import CloudinaryService
from .services.unfinished_quiz_service import UnfinishedQuizService  # Add this import

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
    quick_play_type = request.json.get('quick_play_type')  # Get the quick play type
    quiz_id = request.json.get('quizId')  # Get quiz ID from request
    
    # Handle quick play modes
    if quick_play_type:
        # Handle based on the type of quick play
        if quick_play_type == "DRAWING":
            try:
                # Get drawing specific parameters
                num_rounds = request.json.get('numRounds', 3)
                round_length = request.json.get('roundLength', 60)  # seconds
                num_players = len(game_state.players)
                
                # Calculate how many words we need: rounds * players * 3 options per player
                num_words_needed = num_rounds * num_players * 3
                
                # Get random words from the external API
                response = requests.get(f"http://slova.cetba.eu/generate.php?number={num_words_needed}")
                if response.status_code != 200:
                    return jsonify({"error": "Nepodařilo se získat slova pro kreslení"}), 500
                    
                # Fix encoding issues with Czech characters - ensure proper UTF-8 decoding
                response_text = response.content.decode('utf-8')
                
                # Split by pipe character
                words = response_text.split(" | ")
                
                # Debug output to verify encoding
                print(f"First few words: {words[:5]}")
                
                # Make sure we have enough words
                if len(words) < num_words_needed:
                    print(f"Warning: Got only {len(words)} words, needed {num_words_needed}")
                
                # Create questions for drawing game
                drawing_questions = []
                word_index = 0
                
                for round_num in range(num_rounds):
                    for player_name in game_state.players:
                        # Get 3 words for this player to choose from
                        player_words = words[word_index:word_index+3]
                        word_index += 3
                        
                        # Create a question for this player
                        question = {
                            "type": "DRAWING",
                            "question": f"{round_num + 1}. kolo: Kreslí {player_name}",
                            "player": player_name,
                            "words": player_words,  # 3 words to choose from
                            "selected_word": None,  # This will be set when the player selects a word
                            "length": round_length,
                            "category": "Kreslení"
                        }
                        drawing_questions.append(question)
                
                # Set the questions in the game state
                game_state.questions = drawing_questions
                print(f"Created {len(drawing_questions)} drawing questions")
            except Exception as e:
                print(f"Error setting up drawing game: {str(e)}")
                return jsonify({"error": f"Chyba při přípravě hry: {str(e)}"}), 500
                
        elif quick_play_type == "WORD_CHAIN":
            # TODO: Implement Word Chain quick play
            return jsonify({"error": "Word Chain quick play není zatím implementováno"}), 501
        else:
            # For unsupported quick play types
            return jsonify({"error": f"Nepodporovaný typ rychlé hry: {quick_play_type}"}), 400
    
    elif not quiz_id:
        # For regular games, make sure quiz_id is provided
        return jsonify({"error": "Nebyl vybrán žádný kvíz"}), 400
    else:
        # Get the selected quiz from MongoDB (only for non-quick-play mode)
        quiz = QuizService.get_quiz(quiz_id)
        if not quiz:
            return jsonify({"error": "Kvíz nebyl nalezen"}), 404
            
        # The questions are already JSON-serializable
        game_state.questions = quiz["questions"]

    # Team mode setup
    if game_state.is_team_mode:
        team_assignments = request.json.get('teamAssignments', {})
        game_state.blue_team = team_assignments.get('blue', [])
        game_state.red_team = team_assignments.get('red', [])
        
        # Get captain indices from the request
        captain_indices = request.json.get('captainIndices', {})
        blue_captain_index = captain_indices.get('blue', 0)  # Default to 0 if not provided
        red_captain_index = captain_indices.get('red', 0)    # Default to 0 if not provided
        
        # Store the captain indices in game state
        game_state.blue_captain_index = blue_captain_index
        game_state.red_captain_index = red_captain_index
        
        # Get the actual captain names using the indices
        blue_captain = game_state.blue_team[blue_captain_index] if game_state.blue_team and len(game_state.blue_team) > blue_captain_index else None
        red_captain = game_state.red_team[red_captain_index] if game_state.red_team and len(game_state.red_team) > red_captain_index else None
        
        game_state.team_scores = {'blue': 0, 'red': 0}

        if len(game_state.blue_team) == 0 or len(game_state.red_team) == 0:
            return jsonify({"error": "V každém týmu musí být alespoň jeden hráč"}), 400
        
        print("\n=== Team Mode Debug ===")
        print(f"Blue Team: {game_state.blue_team}")
        print(f"Blue Captain: {blue_captain} (index {blue_captain_index})")
        print(f"Red Team: {game_state.red_team}")
        print(f"Red Captain: {red_captain} (index {red_captain_index})")
        print("=====================\n")
    
    game_state.current_question = 0
    # Reset state for the next question
    game_state.reset_question_state()
    
    # Make sure active_team is properly set for team mode
    if game_state.is_team_mode:
        # Re-set active team to blue for the first question
        game_state.active_team = 'blue'
    
    current_time = int(time() * 1000)
    game_start_time = current_time + START_GAME_TIME  # 5 seconds from now
    
    first_question = game_state.questions[game_state.current_question]

    # Set the question start time for the first question for drawing question
    if first_question.get('type') == 'DRAWING':
        # For drawing questions, set the start time to be 10 seconds from now
        game_start_at = game_start_time + PREVIEW_TIME_DRAWING
    else :
        game_start_at = game_start_time + PREVIEW_TIME # Set the start time for the first question

    game_state.question_start_time = game_start_at
    # Check if first question is a drawing question and identify drawer
    first_drawer = None
    if first_question.get('type') == 'DRAWING':
        first_drawer = first_question.get('player')

    # Create standard game data for the main display
    standard_game_data = {
        "question": first_question,
        "show_first_question_preview": game_start_time,
        "show_game_at": game_start_at,
        "active_team": game_state.active_team
    }

    # First send the standard event to all (especially for the main display)
    if game_state.is_remote:
        socketio.emit('game_started_remote', standard_game_data)
    else:
        socketio.emit('game_started', standard_game_data)

    # Then send personalized game started events to each player
    for player_name in game_state.players:
        # Determine the player's team and role
        player_team = None
        player_role = 'player'  # Default role
        
        if game_state.is_team_mode:
            if player_name in game_state.blue_team:
                player_team = 'blue'
                # Player is captain if at the captain index
                if game_state.blue_team.index(player_name) == game_state.blue_captain_index:
                    player_role = 'captain'
            elif player_name in game_state.red_team:
                player_team = 'red'
                # Player is captain if at the captain index
                if game_state.red_team.index(player_name) == game_state.red_captain_index:
                    player_role = 'captain'
        
        # Create player-specific game data
        player_game_data = {
            "question": first_question,
            "show_first_question_preview": game_start_time,
            "show_game_at": game_start_at,
            "team": player_team,
            "active_team": game_state.active_team,
            "role": player_role,  # Include the player's role
            "quizPhase": 1,  # Start with phase 1
            "is_drawer": first_drawer == player_name  # Let player know if they're the drawer
        }
        
        print(f"Player: {player_name}, Team: {player_team}, Role: {player_role}, Active Team: {game_state.active_team}")

        # Send to the specific player's room
        socketio.emit('game_started_mobile', player_game_data, room=player_name)
    
    return jsonify({"message": "Game started"}), 200

@app.route('/next_question', methods=['POST'])
def next_question():
    if game_state.current_question is None or game_state.current_question + 1 >= len(game_state.questions):
        return jsonify({"error": "No more questions"}), 400
    
    # Reset state for the next question
    game_state.reset_question_state()
    
    # Move to the next question
    game_state.current_question += 1
    
    next_question = game_state.questions[game_state.current_question]
    is_last_question = game_state.current_question + 1 == len(game_state.questions)

    # Check if the next question is a drawing question
    next_drawer = None
    if next_question.get('type') == 'DRAWING':
        next_drawer = next_question.get('player')

    # For Guess a Number in team mode, initialize the phase
    if game_state.is_team_mode and next_question.get('type') == 'GUESS_A_NUMBER':
        game_state.number_guess_phase = 1
        
        # Make sure active_team is set before switching
        if game_state.active_team is None:
            print("WARNING: active_team was None in next_question, defaulting to 'blue'")
            game_state.active_team = 'blue'
        else:
            # Switch active team from the previous question
            game_state.active_team = 'red' if game_state.active_team == 'red' else 'blue'

    socketio.emit('next_question', {
        "question": next_question,
        "is_last_question": is_last_question,
        "active_team": game_state.active_team,
        "quizPhase": 1,  # Start with phase 1 for the new question
        "drawer": next_drawer  # Include drawer information
    })
    return jsonify({
        "question": next_question,
        "is_last_question": is_last_question,
        "preview_time": PREVIEW_TIME_DRAWING if next_question.get('type') == 'DRAWING' else PREVIEW_TIME,
        "active_team": game_state.active_team,
        "quizPhase": 1,  # Start with phase 1 for the new question
        "drawer": next_drawer  # Include drawer information
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

@app.route('/quiz/<quiz_id>/toggle-share', methods=['POST'])
def toggle_share_quiz(quiz_id):
    try:
        device_id = get_device_id()
        result = QuizService.toggle_quiz_publicity(quiz_id, device_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/quiz/<quiz_id>/update', methods=['PUT'])
def update_quiz(quiz_id):
    try:
        data = request.json
        quiz_name = data.get('name')
        questions = data.get('questions', [])
        deleted_questions = data.get('deletedQuestions', [])  # Get deleted questions
        quiz_type = data.get('type')  # Get the quiz type
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
            deleted_questions,  # Pass deleted questions to service
            quiz_type  # Pass the quiz type to the service
        )
        return jsonify({
            "message": "Kvíz byl úspěšně aktualizován",
            "quizId": str(result)
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Došlo k chybě při aktualizaci kvízu: {str(e)}"}), 500

@app.route('/quiz/<quiz_id>', methods=['DELETE'])
def delete_quiz(quiz_id):
    try:
        device_id = get_device_id()
        QuizService.delete_quiz(quiz_id, device_id)
        return jsonify({
            "message": "Kvíz byl úspěšně smazán"
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": f"Došlo k chybě při mazání kvízu: {str(e)}"}), 500

@app.route('/quiz/<quiz_id>/copy', methods=['POST'])
def copy_quiz(quiz_id):
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

@app.route('/quizzes', methods=['GET'])
def get_quizzes():
    try:
        device_id = get_device_id()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))  # Changed default to 10
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
            "hasMore": result["has_more"]
        }), 200
    except Exception as e:
        print(f"Error in get_quizzes route: {str(e)}")
        return jsonify({
            "error": str(e),
            "quizzes": [],
            "total": 0,
            "hasMore": False
        }), 500

@app.route('/upload_media', methods=['POST'])
def upload_media():
    """Upload media files to Cloudinary and return the URL"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    try:
        # Determine if it's image or audio based on mimetype
        mimetype = file.mimetype
        resource_type = "auto"
        folder = "quiz_media"
        transformation = None
        
        # Prepare optimized transformations based on file type
        if mimetype.startswith('image/'):
            resource_type = "image"
            transformation = {"quality": "auto", "fetch_format": "auto"}
        elif mimetype.startswith('audio/'):
            resource_type = "video"  # Cloudinary uses "video" type for audio too
            folder = "quiz_audio"
        
        # Upload to Cloudinary
        result = CloudinaryService.upload_file(
            file,
            folder=folder,
            resource_type=resource_type,
            transformation=transformation
        )
        
        # Return the secure URL and other needed metadata
        return jsonify({
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": resource_type,
            "format": result["format"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete_media', methods=['POST'])
def delete_media():
    """Delete a media file from Cloudinary"""
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "No URL provided"}), 400
        
    try:
        success = CloudinaryService.delete_file(url)
        if success:
            return jsonify({"message": "File deleted successfully"}), 200
        return jsonify({"error": "Failed to delete file"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/unfinished_quizzes', methods=['GET'])
def get_unfinished_quizzes():
    """Get all unfinished quizzes for the current device"""
    quizzes = UnfinishedQuizService.get_unfinished_quizzes()
    return jsonify({"unfinished_quizzes": quizzes}), 200

@app.route('/unfinished_quizzes/<identifier>', methods=['GET'])
def get_unfinished_quiz(identifier):
    """Get a specific unfinished quiz"""
    quiz = UnfinishedQuizService.get_unfinished_quiz(identifier)
    if not quiz:
        return jsonify({"error": "Unfinished quiz not found"}), 404
    return jsonify(quiz), 200

@app.route('/unfinished_quizzes', methods=['POST'])
def save_unfinished_quiz():
    """Save or update an unfinished quiz"""
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
        "error": "Failed to save unfinished quiz",
        "success": False
    }), 500

@app.route('/unfinished_quizzes/<identifier>', methods=['DELETE'])
def delete_unfinished_quiz(identifier):
    """Delete an unfinished quiz and associated media files"""
    keep_files = request.args.get('keep_files', 'false').lower() == 'true'
    result = UnfinishedQuizService.delete_unfinished_quiz(identifier, keep_files)
    if result:
        return jsonify({"success": True}), 200
    return jsonify({"error": "Failed to delete unfinished quiz"}), 500