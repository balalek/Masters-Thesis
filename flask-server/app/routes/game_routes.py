"""Game management routes for the quiz application.
Handles game activation, initialization, question progression,
and game state reset functionality. Supports various quiz types
including drawing, word chain, ABCD, and specialized formats.
"""
from flask import Blueprint, jsonify, request
from time import time
from .. import socketio
from ..game_state import game_state
from ..constants import PREVIEW_TIME, PREVIEW_TIME_DRAWING, START_GAME_TIME, AVAILABLE_COLORS
from ..services.quiz_service import QuizService
from ..utils import get_device_id
from ..db import db
from bson import ObjectId
from ..services.question_generator import (
    generate_drawing_questions, 
    generate_word_chain_questions,
    generate_random_abcd_questions,
    generate_random_true_false_questions,
    generate_random_open_answer_questions,
    generate_random_guess_number_questions,
    generate_random_math_quiz_questions,
    generate_random_blind_map_questions
)
from app.socketio_events.word_chain_events import start_word_chain
from app.socketio_events.math_quiz_events import initialize_math_quiz
from app.socketio_events.blind_map_events import initialize_blind_map

game_routes = Blueprint('game_routes', __name__)

@game_routes.route('/activate_quiz', methods=['POST'])
def activate_quiz():
    """
    Activate the quiz mode in the game state.
    
    Returns:
        JSON response indicating quiz activation success
    """
    game_state.is_quiz_active = True
    return jsonify({"message": "Quiz activated"}), 200

@game_routes.route('/start_game', methods=['POST'])
def start_game():
    """
    Initialize and start a new game session.
    
    Handles various game configurations including:
    
    - Regular quizzes loaded from database by ID
    - Quick play with combined question types (or single type)
    - Team mode vs individual play mode
    - Remote play mode
    
    Request body parameters:
    
        isTeamMode (bool): Whether to use team-based gameplay
        isRemote (bool): Whether this is a remote play session
        quick_play_type (str, optional): Type of quick play quiz to generate (used as flag)
        quizId (str, optional): ID of the predefined quiz to load
        teamAssignments (dict, optional): Player assignments to teams
        captainIndices (dict, optional): Indices of team captains
        typesConfig (list, optional): Configuration for quick play game
    
    Returns:
        200 JSON: Game started successfully with message
        400 JSON: Error if requirements not met (e.g., not enough players)
        404 JSON: Error if quiz ID not found
        500 JSON: Error if exception during setup
    """
    if len(game_state.players) < 2:
        return jsonify({"error": "Hra nemůže začít, dokud nejsou připojeni alespoň 2 hráči"}), 400

    game_state.reset_word_chain_state()

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
        red_captain_index = captain_indices.get('red', 0)
        
        # Store the captain indices in game state
        game_state.blue_captain_index = blue_captain_index
        game_state.red_captain_index = red_captain_index
        game_state.team_scores = {'blue': 0, 'red': 0}

        if len(game_state.blue_team) < 2 or len(game_state.red_team) < 2:
            return jsonify({"error": "V každém týmu musí být alespoň dva hráči"}), 400
    
    # Handle quick play modes - now we can use team information
    if quick_play_type:
        # Works as a flag for quick play mode, so if it's not COMBINED_QUIZ, then skip
        if quick_play_type == "COMBINED_QUIZ":
            try:
                # Get the types configuration from the request
                types_config = request.json.get('typesConfig', [])
                
                if not types_config:
                    return jsonify({"error": "Chybí konfigurace typů kvízů pro rychlou hru"}), 400
                
                # Initialize an array to hold all generated questions
                all_questions = []
                
                # Process each quiz type configuration
                for config in types_config:
                    quiz_type = config.get('type')
                    
                    if quiz_type == "DRAWING":
                        # Generate drawing questions for both modes
                        num_rounds = config.get('numRounds', 3)
                        round_length = config.get('roundLength', 60)
                        
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
                        
                        all_questions.extend(drawing_questions)
                        
                    elif quiz_type == "WORD_CHAIN":
                        # Generate word chain questions
                        num_rounds = config.get('numRounds', 3)
                        round_length = config.get('roundLength', 60)
                        
                        word_chain_questions = generate_word_chain_questions(
                            num_rounds,
                            round_length,
                            is_team_mode=game_state.is_team_mode
                        )
                        
                        all_questions.extend(word_chain_questions)

                    elif quiz_type == "ABCD":
                        # Generate ABCD questions
                        num_questions = config.get('numQuestions', 5)
                        categories = config.get('categories', None)
                        
                        # Get the device ID to exclude questions created by this device
                        device_id = get_device_id()

                        # TODO: In future, we can also exclude questions, that were already played on this device
                        #       This stands for every question type except drawing and word chain
                        
                        abcd_questions = generate_random_abcd_questions(
                            num_questions=num_questions,
                            categories=categories,
                            device_id=device_id
                        )
                        
                        if not abcd_questions:
                            # If no questions are found with specified categories, try without category filter
                            if categories:
                                abcd_questions = generate_random_abcd_questions(
                                    num_questions=num_questions,
                                    device_id=device_id
                                )
                        
                        all_questions.extend(abcd_questions)
                        
                    elif quiz_type == "TRUE_FALSE":
                        # Generate True/False questions
                        num_questions = config.get('numQuestions', 5)
                        categories = config.get('categories', None)
                        
                        # Get the device ID to exclude questions created by this device
                        device_id = get_device_id()
                        
                        true_false_questions = generate_random_true_false_questions(
                            num_questions=num_questions,
                            categories=categories,
                            device_id=device_id
                        )
                        
                        if not true_false_questions:
                            # If no questions are found with specified categories, try without category filter
                            if categories:
                                true_false_questions = generate_random_true_false_questions(
                                    num_questions=num_questions,
                                    device_id=device_id
                                )
                        
                        all_questions.extend(true_false_questions)

                    elif quiz_type == "OPEN_ANSWER":
                        # Generate Open Answer questions
                        num_questions = config.get('numQuestions', 5)
                        categories = config.get('categories', None)
                        # Get exclude audio preference
                        exclude_audio = config.get('excludeAudio', False)
                        print(f"Exclude audio: {exclude_audio}")
                        
                        # Get the device ID to exclude questions created by this device
                        device_id = get_device_id()
                        
                        open_answer_questions = generate_random_open_answer_questions(
                            num_questions=num_questions,
                            categories=categories,
                            device_id=device_id,
                            exclude_audio=exclude_audio
                        )
                        
                        if not open_answer_questions:
                            # If no questions are found with specified categories, try without category filter
                            if categories:
                                open_answer_questions = generate_random_open_answer_questions(
                                    num_questions=num_questions,
                                    device_id=device_id,
                                    exclude_audio=exclude_audio
                                )
                        
                        all_questions.extend(open_answer_questions)

                    elif quiz_type == "GUESS_A_NUMBER":
                        # Generate Guess a Number questions
                        num_questions = config.get('numQuestions', 5)
                        categories = config.get('categories', None)
                        
                        # Get the device ID to exclude questions created by this device
                        device_id = get_device_id()
                        
                        guess_number_questions = generate_random_guess_number_questions(
                            num_questions=num_questions,
                            categories=categories,
                            device_id=device_id
                        )
                        
                        if not guess_number_questions:
                            # If no questions are found with specified categories, try without category filter
                            if categories:
                                guess_number_questions = generate_random_guess_number_questions(
                                    num_questions=num_questions,
                                    device_id=device_id
                                )
                        
                        all_questions.extend(guess_number_questions)
                    
                    elif quiz_type == "MATH_QUIZ":
                        # Generate Math Quiz questions
                        num_questions = config.get('numQuestions', 2)
                        
                        # Get the device ID to exclude questions created by this device
                        device_id = get_device_id()
                        
                        math_quiz_questions = generate_random_math_quiz_questions(
                            num_questions=num_questions,
                            device_id=device_id
                        )
                        
                        all_questions.extend(math_quiz_questions)
                    
                    elif quiz_type == "BLIND_MAP":
                        # Generate Blind Map questions
                        num_rounds = config.get('numRounds', 3)
                        preferred_map = config.get('preferredMap', None)
                        
                        # Get the device ID to exclude questions created by this device
                        device_id = get_device_id()
                        
                        blind_map_questions = generate_random_blind_map_questions(
                            num_rounds=num_rounds,
                            preferred_map=preferred_map,
                            device_id=device_id
                        )
                        
                        all_questions.extend(blind_map_questions)
                
                # Set all generated questions in the game state
                if all_questions:
                    game_state.questions = all_questions
                else:
                    return jsonify({"error": "Nepodařilo se vygenerovat žádné otázky pro rychlou hru"}), 400
                
            except Exception as e:
                return jsonify({"error": f"Chyba při přípravě rychlé hry: {str(e)}"}), 500

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
                num_rounds = question.get('rounds', 3)
                round_length = question.get('length', 60)
                
                # Generate word chain questions
                word_chain_questions = generate_word_chain_questions(
                    num_rounds,
                    round_length,
                    is_team_mode=game_state.is_team_mode
                )
                
                final_questions.extend(word_chain_questions)
            else:
                # For other question types, just add them as they are in MongoDB
                final_questions.append(question)
                
        # Update game state with processed questions
        game_state.questions = final_questions

        # Increment times_used for all questions in the selected quiz
        # Skip this step for quick play mode - those questions are randomly selected, so it makes no sense for them
        try:
            # Get all question IDs from the quiz
            question_ids = [ObjectId(q["_id"]) for q in questions if "_id" in q]
            
            if question_ids:
                # Batch update all questions to increment timesUsed counter
                db.questions.update_many(
                    {"_id": {"$in": question_ids}},
                    {"$inc": {"metadata.timesUsed": 1}}
                )
                print(f"Updated timesUsed count for {len(question_ids)} questions")

        except Exception as e:
            print(f"Error updating question times_used metadata: {str(e)}")
            # Continue with the game even if metadata update fails
            pass

    # Reset game state for the new game
    game_state.current_question = 0
    game_state.reset_question_state()
    
    first_question = game_state.questions[game_state.current_question]
    
    # Calculate if this is the last question
    is_last_question = game_state.current_question + 1 >= len(game_state.questions)

    # Team mode setup
    if game_state.is_team_mode:
        # Make sure active_team is properly set for team mode
        game_state.active_team = 'blue'
        
        # If first question is a drawing question, set its first team to start
        if first_question.get('type') == 'DRAWING':
            first_drawer = first_question.get('player')
            if first_drawer:
                drawer_team = first_question.get('team', 
                             'blue' if first_drawer in game_state.blue_team else 'red')
                game_state.active_team = drawer_team
                # Store the team explicitly in the question for easier access
                first_question['active_team'] = drawer_team

    current_time = int(time() * 1000)
    game_start_time = current_time + START_GAME_TIME  # A few seconds from now
    
    # Set the question start time for the first question depending on type
    if first_question.get('type') == 'DRAWING':
        # For drawing questions, set the start time to be around 8 seconds from now
        # So that drawer have time to prepare (pick a word to draw)
        game_start_at = game_start_time + PREVIEW_TIME_DRAWING
    elif first_question.get('type') == 'WORD_CHAIN':
        # For other types, use regular preview time (around 5 seconds)
        game_start_at = game_start_time + PREVIEW_TIME
        start_word_chain()
    elif first_question.get('type') == 'MATH_QUIZ':
        game_start_at = game_start_time + PREVIEW_TIME
        initialize_math_quiz(True) # isFirstQuestion=True
        first_question['is_team_mode'] = game_state.is_team_mode
        first_question['blue_team'] = game_state.blue_team
        first_question['red_team'] = game_state.red_team
        first_question['players'] = game_state.players
        # Set a title for the Math Quiz question, that will be seen during preview
        first_question['question'] = "Matematický kvíz - vyřazovací hra"
    elif first_question.get('type') == 'BLIND_MAP':
        game_start_at = game_start_time + PREVIEW_TIME
        initialize_blind_map() 
    else:
        # Standard preview time for other question types
        game_start_at = game_start_time + PREVIEW_TIME 

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
        "is_last_question": is_last_question,
        "blind_map_is_team_play": game_state.is_team_mode
    }

    # First send the standard event to everyone (especially for the main display)
    if game_state.is_remote:
        # Game will start on different main screen
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
            "role": player_role,  # Include the player's own role
            "quizPhase": 1,  # Start with phase 1
            "is_drawer": first_drawer == player_name,  # Let player know if they're the drawer
            "is_last_question": is_last_question
        }

        # Send it to the specific player's room (each player has their own room)
        socketio.emit('game_started_mobile', player_game_data, room=player_name)
    
    game_state.is_game_running = True
    return jsonify({"message": "Game started"}), 200

@game_routes.route('/next_question', methods=['POST'])
def next_question():
    """
    Advance to the next question in the current game.
    
    Handles state transitions between different question types:
    
    - Preserves specific state for consecutive word chain questions (since they can only be in one group)
    - Initializes specialized state for math quiz and blind map questions
    - Updates team/player turn information
    - Manages drawer assignment for drawing questions
    
    Returns:
        200 JSON:

            - question: The full question object
            - is_last_question: Whether this is the final question
            - preview_time: Time to show question title before question actually starts
            - active_team: Which team is active in team mode
            - quizPhase: Current phase of the question (starting at 1)
            - drawer: Player assigned as drawer (for drawing questions)
            
        400 JSON: Error if no more questions are available
    """
    if game_state.current_question is None or game_state.current_question + 1 >= len(game_state.questions):
        return jsonify({"error": "Už nejsou žádné další otázky"}), 400
    
    # Get current and next question
    current_question_index = game_state.current_question
    next_question_index = current_question_index + 1
    next_question = game_state.questions[next_question_index]
    
    # For Word Chain questions, we need to preserve certain state while resetting others
    current_question_type = game_state.questions[current_question_index].get('type')
    next_question_type = next_question.get('type')
    
    # Next question means question that will be played now!
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
        start_word_chain()

        game_state.word_chain_state['word_chain'] = []
        game_state.word_chain_state['word_chain'].append({
            'word': next_question.get('first_word', ''),
            'player': 'system',
            'team': None
        })

        if next_question.get('first_letter'):
            game_state.word_chain_state['current_letter'] = next_question.get('first_letter')
    
    # Reset other question state
    game_state.reset_question_state()

    # For Math Quiz questions, initialize the state
    if next_question_type == 'MATH_QUIZ':
        initialize_math_quiz(False)  # IsFirstQuestion=False
        next_question['is_team_mode'] = game_state.is_team_mode
        next_question['blue_team'] = game_state.blue_team
        next_question['red_team'] = game_state.red_team
        next_question['players'] = game_state.players
        next_question['question'] = "Matematický kvíz - vyřazovací hra"
    
    if next_question_type == 'BLIND_MAP':
        initialize_blind_map()

    # Store the current question index in the game state
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
            # Start with blue team if no active team is set
            game_state.active_team = 'blue'
        else:
            # Switch active team from the previous question
            game_state.active_team = 'red' if game_state.active_team == 'blue' else 'blue'

    # Send the next question to all players devices
    socketio.emit('next_question', {
        "question": next_question,
        "is_last_question": is_last_question,
        "active_team": game_state.active_team,
        "quizPhase": 1,  # Start with phase 1 for the new question
        "drawer": next_drawer  # Include drawer information
    })

    # Return this for the caller - the main display
    return jsonify({
        "question": next_question,
        "is_last_question": is_last_question,
        "preview_time": PREVIEW_TIME_DRAWING if next_question.get('type') == 'DRAWING' else PREVIEW_TIME,
        "active_team": game_state.active_team,
        "quizPhase": 1,
        "drawer": next_drawer
    }), 200

@game_routes.route('/reset_game', methods=['POST'])
def reset_game():
    """
    Reset the game state completely.
    
    Clears all game state including:
    - Players
    - Questions
    - Team assignments
    - Score tracking
    - Question progress
    
    The system returns to initial state, ready for new players to join.
    
    Returns:
        200 JSON: Confirmation of reset with was_remote flag
    """
    was_remote = game_state.is_remote  # Store the state before reset
    game_state.reset()
    
    # After reset, emit the full color list since no players exist
    socketio.emit('colors_updated', {"colors": AVAILABLE_COLORS})
    socketio.emit('game_reset', {"was_remote": was_remote})

    return jsonify({"message": "Game state reset", "was_remote": was_remote}), 200