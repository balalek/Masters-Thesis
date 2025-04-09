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
from app.socketio_events.word_chain_events import initialize_team_order
from random import randint
from app.socketio_events.word_chain_events import start_word_chain

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

def generate_drawing_questions(players, num_rounds, round_length, blue_team=None, red_team=None):
    """
    Generate drawing questions with random words for the specified teams or players.
    
    Args:
        players (dict): Dictionary of players when not in team mode
        num_rounds (int): Number of rounds to play
        round_length (int): Length of each round in seconds
        blue_team (list, optional): List of players in blue team
        red_team (list, optional): List of players in red team
    
    Returns:
        list: List of drawing questions
    """
    is_team_mode = blue_team is not None and red_team is not None
    
    try:
        # Calculate number of turns and words needed
        if is_team_mode:
            # Each player gets at least one turn
            num_turns = max(len(blue_team), len(red_team)) * 2
        else:
            num_turns = len(players)
            
        # Calculate how many words we need: rounds * players * 3 options per player
        num_words_needed = num_rounds * num_turns * 3
        
        # Get random words from the external API
        response = requests.get(f"http://slova.cetba.eu/generate.php?number={num_words_needed}")
        if response.status_code != 200:
            raise Exception("Nepodařilo se získat slova pro kreslení")
            
        # Fix encoding issues with Czech characters - ensure proper UTF-8 decoding
        response_text = response.content.decode('utf-8')
        
        # Split by pipe character
        words = response_text.split(" | ")
        
        # Make sure we have enough words
        if len(words) < num_words_needed:
            print(f"Warning: Got only {len(words)} words, needed {num_words_needed}")
        
        # Create questions for drawing game
        drawing_questions = []
        word_index = 0
        
        # For team mode, alternate between teams
        if is_team_mode:
            # Teams are already set up
            red_players = red_team.copy()
            blue_players = blue_team.copy()
            
            # Determine which team has fewer players
            smaller_team = "red" if len(red_players) < len(blue_players) else "blue"
            red_count = len(red_players)
            blue_count = len(blue_players)
            
            # Store starting indices for the smaller team in each round
            smaller_team_start_indices = []
            for i in range(num_rounds):
                smaller_team_start_indices.append((i * 2) % (red_count if smaller_team == "red" else blue_count))
            
            # Create questions for all rounds
            for round_num in range(num_rounds):
                # Get the starting index for the smaller team in this round
                start_idx = smaller_team_start_indices[round_num]
                # Determine which team has more players for determining total turns
                larger_team_size = max(red_count, blue_count)
                total_turns = larger_team_size * 2  # Always double the larger team size

                # Create the player order for this round
                team_order = []
                red_idx = start_idx if smaller_team == "red" else 0
                blue_idx = start_idx if smaller_team == "blue" else 0

                # Continue alternating until we've hit our target turn count
                while len(team_order) < total_turns:
                    # Add red player
                    team_order.append((red_players[red_idx % red_count], 'red'))
                    red_idx += 1
                    
                    # Add blue player if we haven't exceeded the total target
                    if len(team_order) < total_turns:
                        team_order.append((blue_players[blue_idx % blue_count], 'blue'))
                        blue_idx += 1
                
                # Create questions in this alternating order
                for player_name, team in team_order:
                    player_words = words[word_index:word_index+3]
                    word_index += 3
                    
                    # Translate team name for display
                    team_display = "modrý tým" if team == "blue" else "červený tým"
                    
                    question = {
                        "type": "DRAWING",
                        "question": f"{round_num + 1}. kolo: Kreslí {player_name} ({team_display})",
                        "player": player_name,
                        "team": team,  # Keep original English team name for logic
                        "words": player_words,
                        "selected_word": None,
                        "length": round_length,
                        "category": "Kreslení"
                    }
                    drawing_questions.append(question)
        else:
            # Non-team mode
            for round_num in range(num_rounds):
                for player_name in players:
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
        
        return drawing_questions
        
    except Exception as e:
        print(f"Error generating drawing questions: {str(e)}")
        raise e

def generate_word_chain_questions(num_rounds, round_length, is_team_mode=False):
    """
    Generate word chain questions for the specified number of rounds
        
        Args:
            num_rounds (int): Number of rounds to play
            round_length (int): Length in seconds for each player's turn
            is_team_mode (bool): Whether we're in team mode
        
        Returns:
            list: List of word chain questions
    """
    try:
        # Get enough words for all rounds
        # We're requesting more than needed to ensure we have enough valid words
        response = requests.get(f"http://slova.cetba.eu/generate.php?number={num_rounds*2}")
        if response.status_code != 200:
            raise Exception("Nepodařilo se získat slova pro slovní řetěz")
            
        # Fix encoding issues with Czech characters - ensure proper UTF-8 decoding
        response_text = response.content.decode('utf-8')
        
        # Split by pipe character
        words = response_text.split(" | ")
        
        # Define default words once
        default_words = ["kočka", "pes", "slovo", "strom", "hrad", "auto", "míč", "voda", "dům", "kniha"]

        # Filter out words that end with q, w, x, y or ů
        valid_words = [word for word in words if word and word[-1].lower() not in ['q', 'w', 'x', 'y']]
        
        # If no valid words, use default words
        if not valid_words:
            valid_words = default_words.copy()
        
        # Ensure we have enough valid words for all rounds
        if len(valid_words) < num_rounds:
            # Pad with default words if needed
            valid_words.extend(default_words[:num_rounds - len(valid_words)])
        
        # Initialize player order based on game mode
        if game_state.is_team_mode:
            initialize_team_order()
            # Team mode: start with first player in team order
            first_player = game_state.word_chain_state['team_order'][0][0]

            # Calculate the immediate next player first
            blue_players = game_state.blue_team
            red_players = game_state.red_team
            next_team = 'red' if first_player in blue_players else 'blue'
            team_indexes = {'blue': 0 if first_player in blue_players else -1, 
                            'red': 0 if first_player in red_players else -1}
            
            # Calculate the immediate next player first
            next_team_players = blue_players if next_team == 'blue' else red_players
            next_idx = (team_indexes[next_team] + 1) % len(next_team_players)
            immediate_next_player = next_team_players[next_idx]
            
            # Calculate future players for display - start with the immediate next player
            next_players = [immediate_next_player]  # Include the immediate next player
            temp_team = next_team
            temp_indexes = team_indexes.copy()
            temp_indexes[next_team] = next_idx  # Start after the current player
            
            # Get one more player after the immediate next (for a total of 2 next players)
            for i in range(1):  # Changed from 2 to 1 since we already added the immediate next
                temp_team = 'blue' if temp_team == 'red' else 'red'
                players = blue_players if temp_team == 'blue' else red_players
                temp_idx = (temp_indexes[temp_team] + 1) % len(players)
                next_players.append(players[temp_idx])
                temp_indexes[temp_team] = temp_idx

            game_state.word_chain_state['next_players'] = next_players

            # Initialize bomb timer (random between 2-4 mins)
            #round_length = randint(120, 240) * 1000  # Convert to milliseconds TODO uncomment
            round_length = 30  # For testing, set to 10 seconds TODO comment

            
            # In team mode, we don't need player_order
            if 'player_order' not in game_state.word_chain_state:
                game_state.word_chain_state['player_order'] = []
        else:
            from app.socketio_events.word_chain_events import initialize_player_order
            initialize_player_order(round_length)
            # Free-for-all: start with first player in player order
            first_player = game_state.word_chain_state['player_order'][0]

        # Set first player
        game_state.word_chain_state['current_player'] = first_player

        word_chain_questions = []
        # Create questions with a different starting word for each round
        for round_num in range(num_rounds):
            # Use a different word for each round
            first_word = valid_words[round_num]
            
            # Extract the last letter of the first word
            # repair last letter using remove_diacritics
            from app.socketio_events.word_chain_events import remove_diacritics
            last_letter = remove_diacritics(first_word[-1].upper())
            
            question = {
                "type": "WORD_CHAIN",
                "question": f"{round_num + 1}. kolo: Slovní řetěz\nZačíná hráč {first_player} na písmeno {last_letter}",
                "first_word": first_word,
                "first_letter": last_letter,
                "length": round_length,
                "category": "Slovní řetěz",
                "is_team_mode": is_team_mode,
                "current_player": first_player,
                "players": game_state.players,
                "player_order": game_state.word_chain_state['player_order'],
                "next_players": game_state.word_chain_state.get('next_players', [])  # Include next players in question
            }
            word_chain_questions.append(question)
        
        return word_chain_questions
        
    except Exception as e:
        print(f"Error generating word chain questions: {str(e)}")
        raise e

@app.route('/start_game', methods=['POST'])
def start_game():
    if len(game_state.players) < 2:
        return jsonify({"error": "Hra nemůže začít, dokud nejsou připojeni alespoň 2 hráči"}), 400

    game_state.reset_word_chain_state()  # Reset word chain state

    # Add team mode handling first
    game_state.is_team_mode = request.json.get('isTeamMode', False)
    game_state.is_remote = request.json.get('isRemote', False)
    quick_play_type = request.json.get('quick_play_type')  # Get the quick play type
    quiz_id = request.json.get('quizId')  # Get quiz ID from request
    
    # Set up team assignments early - BEFORE trying to generate drawing questions
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
    
    # Handle quick play modes - now we can use team information
    if quick_play_type:
        # Handle based on the type of quick play
        if quick_play_type == "DRAWING":
            try:
                # Get drawing specific parameters
                num_rounds = request.json.get('numRounds', QUIZ_VALIDATION['DRAWING_DEFAULT_ROUNDS'])
                round_length = request.json.get('roundLength', QUIZ_VALIDATION['DRAWING_DEFAULT_TIME'])  # seconds
                
                # Generate drawing questions using our helper function
                if game_state.is_team_mode:
                    drawing_questions = generate_drawing_questions(
                        game_state.players,
                        num_rounds,
                        round_length,
                        blue_team=game_state.blue_team,
                        red_team=game_state.red_team
                    )
                else:
                    drawing_questions = generate_drawing_questions(
                        game_state.players,
                        num_rounds,
                        round_length
                    )
                
                # Set the questions in the game state
                game_state.questions = drawing_questions
                print(f"Created {len(drawing_questions)} drawing questions")
                
            except Exception as e:
                print(f"Error setting up drawing game: {str(e)}")
                return jsonify({"error": f"Chyba při přípravě hry: {str(e)}"}), 500
                
        elif quick_play_type == "WORD_CHAIN":
            try:
                # Get word chain specific parameters
                num_rounds = request.json.get('numRounds', QUIZ_VALIDATION['WORD_CHAIN_DEFAULT_ROUNDS'])  # rounds
                round_length = request.json.get('roundLength', QUIZ_VALIDATION['WORD_CHAIN_DEFAULT_TIME'])  # seconds per player turn
                
                # Generate word chain questions
                word_chain_questions = generate_word_chain_questions(
                    num_rounds,
                    round_length,
                    is_team_mode=game_state.is_team_mode
                )
                
                # Set the questions in the game state
                game_state.questions = word_chain_questions
                print(f"Created {len(word_chain_questions)} word chain questions")
                
            except Exception as e:
                print(f"Error setting up word chain game: {str(e)}")
                return jsonify({"error": f"Chyba při přípravě hry: {str(e)}"}), 500
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
            
        # Process quiz questions
        questions = quiz["questions"]
        
        # Look for drawing questions and expand them
        final_questions = []
        for question in questions:
            if question.get('type') == 'DRAWING':
                # Get drawing parameters from the question or use defaults
                num_rounds = question.get('rounds', 3)
                round_length = question.get('length', 60)
                
                # Generate drawing questions using our helper function
                if game_state.is_team_mode:
                    drawing_questions = generate_drawing_questions(
                        game_state.players,
                        num_rounds,
                        round_length,
                        blue_team=game_state.blue_team,
                        red_team=game_state.red_team
                    )
                else:
                    drawing_questions = generate_drawing_questions(
                        game_state.players,
                        num_rounds,
                        round_length
                    )
                
                final_questions.extend(drawing_questions)
            elif question.get('type') == 'WORD_CHAIN':
                # Get word chain parameters
                num_rounds = question.get('rounds', QUIZ_VALIDATION['WORD_CHAIN_DEFAULT_ROUNDS'])
                round_length = question.get('length', QUIZ_VALIDATION['WORD_CHAIN_DEFAULT_TIME'])
                
                # Generate word chain questions
                word_chain_questions = generate_word_chain_questions(
                    num_rounds,
                    round_length,
                    is_team_mode=game_state.is_team_mode
                )
                
                final_questions.extend(word_chain_questions)
            else:
                final_questions.append(question)
                
        # Update game state with processed questions
        game_state.questions = final_questions

    game_state.current_question = 0
    game_state.reset_question_state()
    
    first_question = game_state.questions[game_state.current_question]
    
    # Calculate if this is the last question
    is_last_question = game_state.current_question + 1 >= len(game_state.questions)

    # Team mode setup
    if game_state.is_team_mode:
        # Make sure active_team is properly set for team mode
        game_state.active_team = 'blue'
        
        # If first question is a drawing question, set its active team
        first_question = game_state.questions[game_state.current_question]
        if first_question.get('type') == 'DRAWING':
            first_drawer = first_question.get('player')
            if first_drawer:
                drawer_team = first_question.get('team', 
                             'blue' if first_drawer in game_state.blue_team else 'red')
                game_state.active_team = drawer_team
                # Store the team explicitly in the question for easier access
                first_question['active_team'] = drawer_team

    current_time = int(time() * 1000)
    game_start_time = current_time + START_GAME_TIME  # 5 seconds from now
    
    first_question = game_state.questions[game_state.current_question]

    # Set the question start time for the first question depending on type
    if first_question.get('type') == 'DRAWING':
        # For drawing questions, set the start time to be 10 seconds from now
        game_start_at = game_start_time + PREVIEW_TIME_DRAWING
    elif first_question.get('type') == 'WORD_CHAIN':
        # For word chain, use regular preview time
        game_start_at = game_start_time + PREVIEW_TIME
        start_word_chain()  # Direct call - no threading or background task
    else:
        game_start_at = game_start_time + PREVIEW_TIME # Standard preview time

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
        "active_team": game_state.active_team,
        "is_last_question": is_last_question  # Add is_last_question flag
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
            "is_drawer": first_drawer == player_name,  # Let player know if they're the drawer
            "is_last_question": is_last_question  # Add is_last_question flag
        }
        
        print(f"Player: {player_name}, Team: {player_team}, Role: {player_role}, Active Team: {game_state.active_team}")

        # Send to the specific player's room
        socketio.emit('game_started_mobile', player_game_data, room=player_name)
    
    return jsonify({"message": "Game started"}), 200

@app.route('/next_question', methods=['POST'])
def next_question():
    if game_state.current_question is None or game_state.current_question + 1 >= len(game_state.questions):
        return jsonify({"error": "No more questions"}), 400
    
    # Get current and next question
    current_question_index = game_state.current_question
    next_question_index = current_question_index + 1
    next_question = game_state.questions[next_question_index]
    
    # For Word Chain questions, we need to preserve certain state while resetting others
    current_question_type = game_state.questions[current_question_index].get('type')
    next_question_type = next_question.get('type')
    
    if current_question_type == 'WORD_CHAIN' and next_question_type == 'WORD_CHAIN':
        # Reset specific elements of word chain state without losing player order
        game_state.word_chain_state['used_words'] = set()
        game_state.word_chain_state['word_chain'] = []
        game_state.word_chain_state['word_chain'].append({
            'word': next_question.get('first_word', ''),
            'player': 'system',
            'team': None
        })
        game_state.word_chain_state['eliminated_players'] = set()
        
        # Determine which team the current player belongs to and set indexes accordingly
        if next_question.get('current_player') in game_state.red_team:
            game_state.word_chain_state['team_indexes'] = {'red': 0, 'blue': -1}
        else:
            game_state.word_chain_state['team_indexes'] = {'red': -1, 'blue': 0}
        
        # Set current player from the next question data
        game_state.word_chain_state['current_player'] = next_question.get('current_player')
        
        # Set current letter from the next question's first_letter
        if next_question.get('first_letter'):
            game_state.word_chain_state['current_letter'] = next_question.get('first_letter')

    elif next_question_type == 'WORD_CHAIN':
        # Initialize word chain state for the first word chain question
        start_word_chain()  # Initialize the word chain

        game_state.word_chain_state['word_chain'] = []
        game_state.word_chain_state['word_chain'].append({
            'word': next_question.get('first_word', ''),
            'player': 'system',
            'team': None
        })

        if next_question.get('first_letter'):
            game_state.word_chain_state['current_letter'] = next_question.get('first_letter')
        # Ensure current_letter is set from the question
    
    # Reset other question state
    game_state.reset_question_state()
    
    # Move to the next question
    game_state.current_question = next_question_index
    
    is_last_question = game_state.current_question + 1 == len(game_state.questions)

    # Check if the next question is a drawing question
    next_drawer = None
    if next_question.get('type') == 'DRAWING':
        next_drawer = next_question.get('player')
        
        # For drawing in team mode, set the active team based on the drawer's team
        if game_state.is_team_mode and next_drawer:
            drawer_team = next_question.get('team', 
                           'blue' if next_drawer in game_state.blue_team else 'red')
            game_state.active_team = drawer_team
            # Store the team explicitly in the question for easier access
            next_question['active_team'] = drawer_team

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