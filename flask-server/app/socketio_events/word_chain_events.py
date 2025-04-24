"""Socket.IO event handlers for Word Chain gameplay.

This module provides real-time event handling for the Word Chain question type:

- Word submission and validation against Czech dictionary
- Player turn management and team rotation
- Diacritics handling for letter matching
- Time tracking and player elimination
- Points calculation and scoring
- Game state synchronization across clients

The Word Chain gameplay involves players taking turns to submit words that
start with the last letter of the previous word, with special handling for
team-based play and invalid letter sequences.
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_WORD_CHAIN, POINTS_FOR_LETTER, POINTS_FOR_SURVIVING_BOMB
import random
import string
import os
from pathlib import Path
from .utils import emit_all_answers_received, get_scores_data

# Dictionary functions for word validation
def load_dictionary(dic_file_path):
    """
    Load words from dictionary file into a set for quick lookup.
    
    Loads a Czech language dictionary for validating words during gameplay.
    Handles encoding issues and filters out non-word content from the dictionary file.
    
    Args:
        dic_file_path: Path to the dictionary file
        
    Returns:
        set: Set of words from the dictionary, or empty set if loading failed
    """
    words = set()
    
    if not os.path.exists(dic_file_path):
        print(f"Dictionary file not found: {dic_file_path}")
        return words
        
    try:
        with open(dic_file_path, 'r', encoding='utf-8') as f:
            # Process the file
            for line in f:
                # Strip and add words (ignoring any flags after '/')
                word = line.strip().split('/')[0].lower()
                if word:
                    words.add(word)
                    
        return words
    
    except Exception as e:
        print(f"Error loading dictionary: {str(e)}")
        return words

def word_exists(word, words_set):
    """
    Check if a word exists in the dictionary.
    
    Simple lookup in the pre-loaded dictionary set for fast word validation.
    
    Args:
        word: Word to check (case insensitive)
        words_set: Set of words to check against
        
    Returns:
        bool: True if word exists in the dictionary
    """
    return word.lower() in words_set

# Letters that cannot be used to start a word
INVALID_ENDING_LETTERS = ['q', 'w', 'x', 'y', 'ů']  

# Initialize the dictionary with a project-relative path
APP_ROOT = Path(__file__).parents[2]  # Go up 2 levels from this file to reach app root
DICTIONARY_PATH = os.path.join(APP_ROOT, 'app', 'resources', 'czech.dic')

# Create resources directory if it doesn't exist
resources_dir = os.path.join(APP_ROOT, 'app', 'resources')
if not os.path.exists(resources_dir):
    os.makedirs(resources_dir)
    print(f"Created resources directory at {resources_dir}")

# Load dictionary words into global set
try:
    dictionary_words = load_dictionary(DICTIONARY_PATH)

except Exception as e:
    print(f"Error loading dictionary: {e}")
    # Create empty dictionary if loading fails, so that all words are accepted and we can still play without it
    dictionary_words = set()

# Initialize game-specific points tracker
game_points = {}

@socketio.on('submit_word_chain_word')
def submit_word_chain_word(data):
    """
    Handle player submission of a word in the word chain game.
    
    Validates the submitted word against multiple rules:

    - Player must be the current active player
    - Word must not be previously used
    - Word must start with the current required letter
    - Word must be in the dictionary
    - Word must be at least 3 letters long
    
    If valid, awards points, advances to the next player, and broadcasts updates.
    
    Args:
        data (dict): 

            - player_name: Name of the player submitting the word
            - word: The word being submitted
    
    Emits:
        - 'word_chain_feedback': Success or error feedback to the player
    """
    global game_points
    player_name = data['player_name']
    word = data['word'].strip().lower()
    
    # Skip processing if current player is not the one submitting
    if game_state.word_chain_state['current_player'] != player_name:
        emit('word_chain_feedback', {
            'success': False,
            'message': 'Nejsi na řadě!'
        }, room=player_name)
        return
    
    # Check if player has been eliminated (should not happen normally)
    if player_name in game_state.word_chain_state['eliminated_players']:
        emit('word_chain_feedback', {
            'success': False,
            'message': 'Byl jsi vyřazen z hry!'
        }, room=player_name)
        return
    
    current_letter = game_state.word_chain_state['current_letter']
    
    # Check if word have at least 3 letters
    if len(word) < 3:
        emit('word_chain_feedback', {
            'success': False,
            'message': 'Slovo musí mít alespoň 3 písmena!'
        }, room=player_name)
        return
    
    # Check if word starts with the required letter
    if not word.startswith(current_letter.lower()) and not word.startswith(remove_diacritics(current_letter).lower()):
        emit('word_chain_feedback', {
            'success': False,
            'message': f'Slovo musí začínat na písmeno {current_letter}!'
        }, room=player_name)
        return
        
    # Check if word has already been used
    if word in game_state.word_chain_state['used_words']:
        emit('word_chain_feedback', {
            'success': False,
            'message': 'Toto slovo již bylo použito!'
        }, room=player_name)
        return

    # Check if word exists in dictionary
    if not check_word_exists(word):
        emit('word_chain_feedback', {
            'success': False,
            'message': 'Toto slovo neexistuje ve slovníku!'
        }, room=player_name)
        return
    
    # Word is valid - add to chain and update game state
    game_state.word_chain_state['used_words'].add(word)
    game_state.word_chain_state['word_chain'].append({
        'word': word,
        'player': player_name,
        'team': get_player_team(player_name)
    })
    
    # Award points for valid word
    award_points_for_word(player_name, word)
    
    # Get next letter from the last letter of the word
    last_letter = get_last_valid_letter(word)
    game_state.word_chain_state['current_letter'] = last_letter.upper()
    
    # Get next player and update game state
    next_player = get_next_player(player_name)
    game_state.word_chain_state['current_player'] = next_player
        
    # Broadcast updated word chain to all clients
    send_word_chain_update()
    
    # Emit success feedback to the player
    emit('word_chain_feedback', {
        'success': True,
        'message': 'Slovo přijato!'
    }, room=player_name)
    
@socketio.on('start_word_chain')
def start_word_chain():
    """
    Initialize and start a new word chain game.
    
    Sets up the initial game state for word chain:

    - Resets game-specific points
    - Sets the first word (or random letter if no word provided)
    - Establishes the current letter for the first player
    - Prepares player order and team setup
    
    This function is called both when the game first starts and 
    when advancing to a new word chain question.
    """
    global game_points
    game_points = {}  # Reset game-specific points

    current_question = game_state.questions[game_state.current_question]
    
    # Set first word and letter
    first_word = current_question.get('first_word', '')
    if first_word:
        # Start with the provided first word
        game_state.word_chain_state['word_chain'].append({
            'word': first_word,
            'player': 'system',
            'team': None
        })
        game_state.word_chain_state['used_words'].add(first_word)
        game_state.word_chain_state['current_letter'] = get_last_valid_letter(first_word).upper()
    else:
        # If no first word provided, start with a random letter
        valid_letters = list(set(string.ascii_uppercase) - set([l.upper() for l in INVALID_ENDING_LETTERS]))
        game_state.word_chain_state['current_letter'] = random.choice(valid_letters)

def award_points_for_word(player_name, word):
    """
    Award points for a valid word submission.
    
    Points are awarded based on word length in free-for-all mode.
    In team mode, points are handled by the bomb explosion mechanism.
    
    Args:
        player_name: The player who submitted the word
        word: The submitted word
    """
    global game_points

    if not game_state.is_team_mode:        
        total_points = len(word) * POINTS_FOR_LETTER
        
        # Initialize player in game_points if not exists
        if player_name not in game_points:
            game_points[player_name] = 0
        
        # Add points to game-specific tracker
        game_points[player_name] += total_points
        
        if player_name in game_state.players:
            game_state.players[player_name]['score'] += total_points

def send_word_chain_update():
    """
    Send current word chain state to all clients.
    
    Broadcasts the complete game state including:

    - Word chain history
    - Current player and letter
    - Player progression (previous and next players)
    - Eliminated players and timer information
    - Current scores and game-specific points
    
    Emits:
        - 'word_chain_update': Complete word chain state to all clients
    """
    scores = {
        'individual': {}
    }
    
    for player_name in game_state.players:
        scores['individual'][player_name] = {
            'score': game_state.players[player_name]['score'],
            'color': game_state.players[player_name]['color']
        }
    
    socketio.emit('word_chain_update', {
        'word_chain': game_state.word_chain_state['word_chain'],
        'current_letter': game_state.word_chain_state['current_letter'],
        'current_player': game_state.word_chain_state['current_player'],
        'previous_players': game_state.word_chain_state['previous_players'],
        'next_players': game_state.word_chain_state['next_players'],
        'eliminated_players': list(game_state.word_chain_state['eliminated_players']),
        'player_timers': game_state.word_chain_state['player_timers'],
        'scores': scores,
        'game_points': game_points
    })

def handle_word_chain_game_end():
    """
    Handle the end of a word chain game round.
    
    Calculates final scores and awards bonuses:

    - In free-for-all mode: Last surviving player gets a bonus
    - Prepares result statistics for display
    - Broadcasts results to all clients
    - Resets game-specific points for next round
    """
    global game_points
    scores = get_scores_data()
    
    # For free-for-all, the last player gets a bonus
    if not game_state.is_team_mode:
        active_players = [p for p in game_state.word_chain_state['player_order'] 
                        if p not in game_state.word_chain_state['eliminated_players']]
        
        if len(active_players) == 1:
            # Award survival bonus to the last player
            last_player = active_players[0]
            survival_bonus = POINTS_FOR_WORD_CHAIN
            game_state.players[last_player]['score'] += survival_bonus
            
            # Also add to game-specific points
            if last_player not in game_points:
                game_points[last_player] = 0
            game_points[last_player] += survival_bonus
            
            # Update scores
            scores = get_scores_data()
    
    # Get stats for the result screen
    word_chain_stats = {
        'word_chain': game_state.word_chain_state['word_chain'],
        'last_player': game_state.word_chain_state['current_player'],
        'eliminated_players': list(game_state.word_chain_state['eliminated_players']),
        'game_points': game_points
    }
    
    # Send results to everyone
    emit_all_answers_received(
        scores=scores,
        correct_answer="", # No correct answer for word chain
        additional_data=word_chain_stats
    )

    game_points = {}

def get_player_team(player_name):
    """
    Get the team of a player.
    
    Args:
        player_name: The name of the player
        
    Returns:
        str: 'blue' or 'red' if player is in a team, None otherwise
    """
    if player_name in game_state.blue_team:
        return 'blue'
    elif player_name in game_state.red_team:
        return 'red'
    
    return None

def get_next_player(current_player):
    """
    Get the next player in the game rotation.
    
    Handles team mode and free-for-all mode differently:

    - In team mode: Alternates between teams and tracks player indexes
    - In free-for-all: Uses player order and skips eliminated players
    
    Args:
        current_player: The current active player
        
    Returns:
        str: Name of the next player, None if no active players remain
    """
    if game_state.is_team_mode:
        # Get current teams and indexes
        red_players = game_state.red_team.copy()
        blue_players = game_state.blue_team.copy()
        team_indexes = game_state.word_chain_state['team_indexes']
        
        # Get current player's team
        current_team = get_player_team(current_player)
        
        # Determine next team (always alternate)
        next_team = 'blue' if current_team == 'red' else 'red'
        
        # Calculate the immediate next player first
        next_team_players = blue_players if next_team == 'blue' else red_players
        next_idx = (team_indexes[next_team] + 1) % len(next_team_players)
        immediate_next_player = next_team_players[next_idx]
        
        # Calculate future players for display (get the two players after the immediate next)
        next_players = []
        temp_team = next_team
        temp_indexes = team_indexes.copy()
        temp_indexes[next_team] = next_idx  # Start from after the immediate next player
        
        # Get two players after the immediate next
        for i in range(2):
            temp_team = 'blue' if temp_team == 'red' else 'red'
            players = blue_players if temp_team == 'blue' else red_players
            temp_idx = (temp_indexes[temp_team] + 1) % len(players)
            next_players.append(players[temp_idx])
            temp_indexes[temp_team] = temp_idx

        game_state.word_chain_state['next_players'] = next_players
        
        # Update the game state
        team_indexes[next_team] = next_idx
        
        # Update previous and next players arrays
        game_state.word_chain_state['previous_players'] = [current_player]
        if len(game_state.word_chain_state['word_chain']) > 1:
            last_word = game_state.word_chain_state['word_chain'][-2]
            game_state.word_chain_state['previous_players'].append(last_word['player'])
        
        return immediate_next_player

    else:
        # Free-for-all mode: use player order
        player_order = game_state.word_chain_state['player_order']
        
        # Find the index of the current player in the ORIGINAL order
        # (even if they've just been eliminated)
        try:
            original_index = player_order.index(current_player)
            
            # Start looking from the next position in the original order
            next_index = (original_index + 1) % len(player_order)
            
            # Now find the next active player starting from this position
            eliminated_players = game_state.word_chain_state['eliminated_players']
            
            # We may need to loop through all players to find the next active one
            for _ in range(len(player_order)):
                next_candidate = player_order[next_index]
                if next_candidate not in eliminated_players:
                    return next_candidate
                
                # Move to the next player in the order
                next_index = (next_index + 1) % len(player_order)
                
            # If we've gone through all players and found none active
            return None
            
        except ValueError:
            # Current player not found in player_order (shouldn't happen)
            # Fall back to first non-eliminated player
            active_players = [p for p in player_order if p not in game_state.word_chain_state['eliminated_players']]
            return active_players[0] if active_players else None

def initialize_team_order():
    """
    Initialize the order of players in team mode.
    
    Sets up initial team order with randomized starting team.
    Creates team indexes to track rotation position within each team.
    """
    red_players = game_state.red_team.copy()
    blue_players = game_state.blue_team.copy()
    
    # Randomize the starting team
    start_with_red = random.choice([True, False])
    
    # Create minimal team order with just the first person
    if start_with_red and red_players:
        # Initialize with first red player
        game_state.word_chain_state['team_order'] = [(red_players[0], 'red')]
        # Store team indexes to track where we are in each team's rotation
        game_state.word_chain_state['team_indexes'] = {'red': 0, 'blue': -1}
    elif blue_players:
        # Initialize with first blue player
        game_state.word_chain_state['team_order'] = [(blue_players[0], 'blue')]
        # Store team indexes to track where we are in each team's rotation
        game_state.word_chain_state['team_indexes'] = {'red': -1, 'blue': 0}

def initialize_player_order(round_length):
    """
    Initialize the order of players in free-for-all mode.
    
    Randomizes player order and initializes timers for each player.
    
    Args:
        round_length: Time in seconds for each player's turn
    """
    player_order = list(game_state.players.keys())
    random.shuffle(player_order)  # Randomize player order
    game_state.word_chain_state['player_order'] = player_order
    
    # Initialize player timers
    for player in player_order:
        game_state.word_chain_state['player_timers'][player] = round_length * 1000  # Convert to milliseconds

def check_word_exists(word):
    """
    Check if a word exists in the dictionary.
    
    Uses the loaded dictionary to validate word existence.
    Falls back to accepting all words if dictionary check fails.
    
    Args:
        word: Word to validate
        
    Returns:
        bool: True if word exists or error occurs, False if word definitely doesn't exist
    """
    try:
        if dictionary_words:
            return word_exists(word, dictionary_words)
        else:
            # If dictionary is empty, accept all words
            return True
        
    except Exception as e:
        print(f"Error checking word existence: {str(e)}")
        return True

def get_last_valid_letter(word):
    """
    Get the last valid letter of a word for the next player to use.
    
    Handles special cases where the last letter can't be used to start words.
    In such cases, picks a random valid letter instead.
    
    Args:
        word: The word from which to get the last letter
        
    Returns:
        str: Valid letter for the next player to use
    """
    # Remove diacritics and convert to lowercase
    normalized_word = remove_diacritics(word).lower()
    
    # Get the last letter
    last_letter = normalized_word[-1]
    
    # If last letter is invalid, pick a random valid letter
    if last_letter in INVALID_ENDING_LETTERS:
        valid_letters = list(set(string.ascii_lowercase) - set(INVALID_ENDING_LETTERS))
        return random.choice(valid_letters)
        
    return last_letter

def remove_diacritics(text):
    """
    Remove diacritics from Czech text.
    
    Handles Czech-specific characters by replacing them with their base form.
    
    Args:
        text: Text containing Czech diacritics
        
    Returns:
        str: Text with diacritics removed
    """
    replacements = {
        'á': 'a',
        'é': 'e',
        'ě': 'e',
        'í': 'i',
        'ó': 'o',
        'ý': 'y',
        'ň': 'n',
        'ť': 't',
        'ď': 'd',
        'ů': 'ú'
    }
    
    result = text
    for char, replacement in replacements.items():
        result = result.replace(char, replacement)
        result = result.replace(char.upper(), replacement.upper())
    
    return result

@socketio.on('word_chain_timeout')
def handle_word_chain_timeout(data):
    """
    Handle when a player's timer runs out in free-for-all mode.
    
    Called when a player's time expires completely.
    Initiates player elimination from the game.
    
    Args:
        data (dict):
        
            - player: The player whose timer ran out
            
    Emits:
        - 'word_chain_update': Updated game state after player elimination
    """
    player = data.get('player')
    if player:
        eliminate_player(player)

def eliminate_player(player_name):
    """
    Eliminate a player who ran out of time.
    
    Adds the player to the eliminated set and advances the game if needed.
    Checks if the game should end after elimination.
    
    Args:
        player_name: The player to eliminate
    """
    if player_name not in game_state.word_chain_state['eliminated_players']:
        game_state.word_chain_state['eliminated_players'].add(player_name)
        
        # If this was the current player, move to next player
        if game_state.word_chain_state['current_player'] == player_name:
            next_player = get_next_player(player_name)
            game_state.word_chain_state['current_player'] = next_player
        
        # Broadcast update
        send_word_chain_update()
        
        # Check if game is over (only one or no players left)
        check_game_end()

def check_game_end():
    """
    Check if the game should end.
    
    In free-for-all mode, ends when only 0-1 players remain.
    Team mode game end is triggered by the bomb explosion event.
    """
    if not game_state.is_team_mode:
        # Free-for-all: game ends when 0 or 1 players remain
        active_players = [p for p in game_state.word_chain_state['player_order'] 
                        if p not in game_state.word_chain_state['eliminated_players']]
        
        if len(active_players) <= 1:
            # Game is over
            handle_word_chain_game_end()
    
    # Team mode game end is triggered by the bomb exploding, handled by frontend

def handle_word_chain_time_up(scores):
    """
    Handle when time is up for word chain questions.
    
    Processes the end of game timer (as opposed to player timer).
    In team mode, acts as if the bomb exploded for the active team.
    
    Args:
        scores: Current game scores for inclusion in results
        
    Emits:
        - Event via emit_all_answers_received with game results
    """
    if game_state.is_team_mode:
        # In team mode, time up means the bomb exploded for the active team
        active_team = get_player_team(game_state.word_chain_state['current_player'])
        
        # Award points to the winning team
        winning_team = 'red' if active_team == 'blue' else 'blue'
        game_state.team_scores[winning_team] += POINTS_FOR_SURVIVING_BOMB  # Bonus for winning team
        
        # Update scores
        scores = get_scores_data()
        
        # Send results to everyone
        emit_all_answers_received(
            scores=scores,
            correct_answer="",
            additional_data={
                'word_chain': game_state.word_chain_state['word_chain'],
                'exploded_team': active_team,
                'winning_team': winning_team,
                'exploded_player': game_state.word_chain_state['current_player'],
                'game_points': POINTS_FOR_SURVIVING_BOMB
            }
        )