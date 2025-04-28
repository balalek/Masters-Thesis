"""Question generators for the quiz application.

This module provides functions that generate various types of questions:

- Random questions from the existing database for ABCD, True/False, etc.
- Dynamic questions for interactive game types like Drawing and Word Chain
- Specialized question fetching with filtering capabilities

Each generator handles a specific question type with appropriate parameters
and error handling for consistent question production.
"""
import requests
from ..constants import QUESTION_TYPES
from ..services.quiz_service import QuizService
from ..game_state import game_state
from ..socketio_events.word_chain_events import initialize_team_order, remove_diacritics, initialize_player_order
from random import randint

def generate_random_guess_number_questions(num_questions=5, categories=None, device_id=None):
    """
    Generate random Guess a Number questions from public quizzes.
    
    Fetches existing Guess a Number questions from the database,
    applying filters for categories and excluding questions from the current device.
    
    Args:
        num_questions (int): Number of questions to retrieve
        categories (list): List of category names to filter by
        device_id (str): Device ID to exclude questions created by this device
        
    Returns:
        list: List of Guess a Number questions, empty if none found
    """
    try:
        # Get questions from public quizzes
        questions = QuizService.get_random_questions(
            question_type=QUESTION_TYPES["GUESS_A_NUMBER"],
            categories=categories,
            device_id=device_id,
            limit=num_questions
        )
        
        if not questions:
            print("Warning: No Guess a Number questions found")
            
        return questions
    
    except Exception as e:
        print(f"Error generating GUESS_A_NUMBER questions: {str(e)}")
        return []

def generate_random_math_quiz_questions(num_questions=2, device_id=None):
    """
    Generate random Math Quiz questions from public quizzes.
    
    Fetches existing Math Quiz questions from the database,
    excluding questions from the current device.
    
    Args:
        num_questions (int): Number of questions to retrieve
        device_id (str): Device ID to exclude questions created by this device
        
    Returns:
        list: List of Math Quiz questions, empty if none found
    """
    try:
        # Get questions from public quizzes
        questions = QuizService.get_random_questions(
            question_type=QUESTION_TYPES["MATH_QUIZ"],
            device_id=device_id,
            limit=num_questions
        )
        
        if not questions:
            print("Warning: No Math Quiz questions found")
            
        return questions
    
    except Exception as e:
        print(f"Error generating Math Quiz questions: {str(e)}")
        return []

def generate_random_blind_map_questions(num_rounds=3, preferred_map=None, device_id=None):
    """
    Generate random Blind Map questions from public quizzes with map preference filtering.
    
    Args:
        num_rounds (int): Number of rounds/questions to generate
        preferred_map (str): Map preference 'cz', 'eu', or 'both'
        device_id (str): Device ID to exclude questions from this device
    
    Returns:
        list: List of Blind Map questions, empty if none found
    """
    try:
        # Set map filter based on preference
        map_filter = None
        if preferred_map == 'cz':
            map_filter = 'cz'
        elif preferred_map == 'eu':
            map_filter = 'europe'
        # 'both' or None means no filter - we'll get a mix of maps
        
        # Get questions from public quizzes
        questions = QuizService.get_random_questions(
            question_type=QUESTION_TYPES["BLIND_MAP"],
            device_id=device_id,
            limit=num_rounds,
            map_filter=map_filter
        )
        
        if not questions:
            # If no questions found with the specified map filter, try without filter
            if map_filter:
                questions = QuizService.get_random_questions(
                    question_type=QUESTION_TYPES["BLIND_MAP"],
                    device_id=device_id,
                    limit=num_rounds
                )
            
        return questions
    except Exception as e:
        print(f"Error generating Blind Map questions: {str(e)}")
        return []

def generate_drawing_questions(players, num_rounds, round_length, blue_team=None, red_team=None):
    """
    Generate drawing questions with random words for the specified teams or players.
    
    Creates dynamic drawing questions for each round, fetching random words 
    from an external API. Handles both team mode and individual play mode.
    Each player gets three word choices per drawing turn.
    
    Args:
        players (dict): Dictionary of players when not in team mode
        num_rounds (int): Number of rounds to play
        round_length (int): Length of each round in seconds
        blue_team (list, optional): List of players in blue team
        red_team (list, optional): List of players in red team
    
    Returns:
        list: List of drawing questions with words to draw
        
    Raises:
        Exception: If unable to fetch words from the external API
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
                        "team": team,
                        "words": player_words,
                        "selected_word": None,
                        "length": round_length,
                        "category": "Kreslení"
                    }
                    drawing_questions.append(question)
        else:
            # Free-for-all mode
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
    Generate word chain questions for the specified number of rounds.
    
    Creates dynamic word chain questions with starting word fetched from an external API.
    Sets up the player order and initializes the word chain state for gameplay.
    
    Args:
        num_rounds (int): Number of rounds to play
        round_length (int): Length in seconds for each player's turn
        is_team_mode (bool): Whether we're in team mode
    
    Returns:
        list: List of word chain questions with starting words and player information
        
    Raises:
        Exception: If unable to fetch words from the external API
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
        
        # Define default words in case of failure to fetch
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
            next_players = [immediate_next_player]
            temp_team = next_team
            temp_indexes = team_indexes.copy()
            temp_indexes[next_team] = next_idx  # Start after the current player
            
            # Get one more player after the immediate next (for a total of 2 next players)
            for i in range(1):  # 1 since we already added the immediate next
                temp_team = 'blue' if temp_team == 'red' else 'red'
                players = blue_players if temp_team == 'blue' else red_players
                temp_idx = (temp_indexes[temp_team] + 1) % len(players)
                next_players.append(players[temp_idx])
                temp_indexes[temp_team] = temp_idx

            game_state.word_chain_state['next_players'] = next_players

            # In team mode, we don't need player_order
            if 'player_order' not in game_state.word_chain_state:
                game_state.word_chain_state['player_order'] = []

            # Initialize bomb timer (random between 2-4 mins)
            round_length = randint(120, 240)
        else:
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
            # fix last letter using remove_diacritics
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
                "next_players": game_state.word_chain_state.get('next_players', [])
            }
            word_chain_questions.append(question)
        
        return word_chain_questions
        
    except Exception as e:
        print(f"Error generating word chain questions: {str(e)}")
        raise e

def generate_random_abcd_questions(num_questions=5, categories=None, device_id=None):
    """
    Generate random ABCD questions from public quizzes.
    
    Fetches existing ABCD questions from the database,
    applying filters for categories and excluding questions from the current device.
    
    Args:
        num_questions (int): Number of questions to retrieve
        categories (list): List of category names to filter by
        device_id (str): Device ID to exclude questions created by this device
        
    Returns:
        list: List of ABCD questions, empty if none found
    """
    try:
        # Get questions from public quizzes
        questions = QuizService.get_random_questions(
            question_type=QUESTION_TYPES["ABCD"],
            categories=categories,
            device_id=device_id,
            limit=num_questions
        )
        
        if not questions:
            print("Warning: No ABCD questions found")
            
        return questions
    
    except Exception as e:
        print(f"Error generating ABCD questions: {str(e)}")
        return []

def generate_random_true_false_questions(num_questions=5, categories=None, device_id=None):
    """
    Generate random True/False questions from public quizzes.
    
    Fetches existing True/False questions from the database,
    applying filters for categories and excluding questions from the current device.
    
    Args:
        num_questions (int): Number of questions to retrieve
        categories (list): List of category names to filter by
        device_id (str): Device ID to exclude questions created by this device
        
    Returns:
        list: List of True/False questions, empty if none found
    """
    try:
        # Get questions from public quizzes
        questions = QuizService.get_random_questions(
            question_type=QUESTION_TYPES["TRUE_FALSE"],
            categories=categories,
            device_id=device_id,
            limit=num_questions
        )
        
        if not questions:
            print("Warning: No True/False questions found")
            
        return questions
    
    except Exception as e:
        print(f"Error generating TRUE_FALSE questions: {str(e)}")
        return []

def generate_random_open_answer_questions(num_questions=5, categories=None, device_id=None, exclude_audio=False):
    """
    Generate random Open Answer questions from public quizzes.
    
    Fetches existing Open Answer questions from the database,
    applying filters for categories and excluding questions from the current device.
    Can optionally exclude questions with audio content.
    
    Args:
        num_questions (int): Number of questions to retrieve
        categories (list): List of category names to filter by
        device_id (str): Device ID to exclude questions created by this device
        exclude_audio (bool): Whether to exclude questions with audio content
        
    Returns:
        list: List of Open Answer questions, empty if none found
    """
    try:
        # Get questions from public quizzes
        questions = QuizService.get_random_questions(
            question_type=QUESTION_TYPES["OPEN_ANSWER"],
            categories=categories,
            device_id=device_id,
            limit=num_questions,
            exclude_audio=exclude_audio
        )
        
        if not questions:
            print("Warning: No Open Answer questions found")
            
        return questions
    except Exception as e:
        print(f"Error generating OPEN_ANSWER questions: {str(e)}")
        return []