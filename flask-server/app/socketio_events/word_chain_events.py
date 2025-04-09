"""
Socket.IO events for Word Chain questions
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import POINTS_FOR_WORD_CHAIN, POINTS_FOR_LETTER, POINTS_FOR_SURVIVING_BOMB
from time import time
import random
import requests
import string
import re
from .utils import emit_all_answers_received, get_scores_data
from .dictionary_checker import DictionaryChecker  # Updated import from local file
import os
from pathlib import Path

# Letters that cannot be used to start a word
INVALID_ENDING_LETTERS = ['q', 'w', 'x', 'y', 'ů']  

# Initialize the dictionary checker with a project-relative path
APP_ROOT = Path(__file__).parents[2]  # Go up 2 levels from this file to reach app root
DICTIONARY_PATH = os.path.join(APP_ROOT, 'app', 'resources', 'czech.dic')

# Create resources directory if it doesn't exist
resources_dir = os.path.join(APP_ROOT, 'app', 'resources')
if not os.path.exists(resources_dir):
    os.makedirs(resources_dir)
    print(f"Created resources directory at {resources_dir}")

try:
    czech_dict = DictionaryChecker(DICTIONARY_PATH)
    print(f"Dictionary initialized from {DICTIONARY_PATH}")
except Exception as e:
    print(f"Error loading dictionary: {e}")
    # Create a fallback dictionary that assumes all words exist
    czech_dict = type('DummyChecker', (), {'word_exists': lambda self, word: True})()
    print("Using fallback dictionary checker that accepts all words")

# Initialize game-specific points tracker
game_points = {}

@socketio.on('submit_word_chain_word')
def submit_word_chain_word(data):
    """Handle player submitting a word for word chain game"""
    global game_points  # Add global declaration
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
    
    #Check if word have at least 3 letters
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
    
    # Free-for-all mode: update player timer for the player who just submitted
    if not game_state.is_team_mode:
        # Timer is preserved, as it's paused when not the player's turn
        pass
        
    # Broadcast updated word chain to all clients
    broadcast_word_chain_update()
    
    # Emit success feedback to the player
    emit('word_chain_feedback', {
        'success': True,
        'message': 'Slovo přijato!'
    }, room=player_name)
    
@socketio.on('start_word_chain')
def start_word_chain():
    """Initialize and start a word chain game"""
    global game_points
    game_points = {}  # Reset game-specific points
    
    print("Starting word chain game...")
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
        print(f"Word chain starting with word: {first_word}, next letter: {game_state.word_chain_state['current_letter']}")
    else:
        # If no first word provided, start with a random letter
        valid_letters = list(set(string.ascii_uppercase) - set([l.upper() for l in INVALID_ENDING_LETTERS]))
        game_state.word_chain_state['current_letter'] = random.choice(valid_letters)
        print(f"Word chain starting with letter: {game_state.word_chain_state['current_letter']}")
    
    # Broadcast initial state
    # broadcast_word_chain_update()
    
    # Start timers for players in free-for-all mode
    if not game_state.is_team_mode:
        # Timer starts only for the active player
        # start_player_timer(first_player)
        pass
    
    # Start bomb timer in team mode
    if game_state.is_team_mode:
        # Bomb timer logic will be handled by the frontend
        pass

def award_points_for_word(player_name, word):
    """Award points for a valid word submission (only in free-for-all mode)"""
    global game_points  # Add global declaration

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
    """Send word chain update with scores including player colors"""
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
    """Handle the end of a word chain game"""
    global game_points  # Add global declaration
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
        'game_points': game_points  # Add game-specific points
    }
    
    # Send results
    emit_all_answers_received(
        scores=scores,
        correct_answer="", # No correct answer for word chain
        additional_data=word_chain_stats
    )

    game_points = {}

@socketio.on('word_chain_bomb_exploded')
def word_chain_bomb_exploded(data):
    """Handle when the bomb explodes in team mode"""
    global game_points  # Add global declaration
    exploded_team = data.get('team')
    player_name = data.get('player_name')
    
    if game_state.is_team_mode and exploded_team in ['blue', 'red']:
        # Award points to the winning team
        winning_team = 'red' if exploded_team == 'blue' else 'blue'
        bonus_points = POINTS_FOR_WORD_CHAIN * 5  # Bonus for winning team
        game_state.team_scores[winning_team] += bonus_points
        
        # Add winning team bonus to each player in that team
        for player in (game_state.red_team if winning_team == 'red' else game_state.blue_team):
            if player not in game_points:
                game_points[player] = 0
            game_points[player] += bonus_points / len(game_state.red_team if winning_team == 'red' else game_state.blue_team)
        
        # Get scores
        scores = get_scores_data()
        
        # Get stats for the result screen
        word_chain_stats = {
            'word_chain': game_state.word_chain_state['word_chain'],
            'exploded_team': exploded_team,
            'winning_team': winning_team,
            'exploded_player': player_name,
            'game_points': game_points  # Add game-specific points
        }
        
        # Send results
        emit_all_answers_received(
            scores=scores,
            correct_answer="",  # No correct answer for word chain
            additional_data=word_chain_stats
        )

def get_player_team(player_name):
    """Get the team of a player"""
    if player_name in game_state.blue_team:
        return 'blue'
    elif player_name in game_state.red_team:
        return 'red'
    return None

def broadcast_word_chain_update():
    """Broadcast current word chain state to all clients"""
    send_word_chain_update()

def get_next_player(current_player):
    """Get the next player in the game"""
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
    """Initialize the order of players in team mode"""
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
    """Initialize the order of players in free-for-all mode"""
    player_order = list(game_state.players.keys())
    random.shuffle(player_order)  # Randomize player order
    game_state.word_chain_state['player_order'] = player_order
    
    # Initialize player timers
    for player in player_order:
        game_state.word_chain_state['player_timers'][player] = round_length * 1000  # Convert to milliseconds

def check_word_exists(word):
    """Check if a word exists in the dictionary using the loaded dictionary file"""
    try:
        # Check word in local dictionary file only
        return czech_dict.word_exists(word)
    except Exception as e:
        # If any error occurs, log details and assume word exists for simplicity
        print(f"Error checking word existence: {str(e)}")
        return True

def get_last_valid_letter(word):
    """Get the last valid letter of a word for the next player to use"""
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
    """Remove diacritics from Czech text"""

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

@socketio.on('word_chain_timer_update')
def word_chain_timer_update(data):
    """Update the remaining time for a player"""
    player_name = data.get('player_name')
    remaining_time = data.get('remaining_time', 0)
    
    if player_name in game_state.word_chain_state['player_timers']:
        game_state.word_chain_state['player_timers'][player_name] = remaining_time
        
        # If time is up, eliminate player in free-for-all mode
        if remaining_time <= 0 and not game_state.is_team_mode:
            eliminate_player(player_name)

@socketio.on('word_chain_timeout')
def handle_word_chain_timeout(data):
    """Handle when a player's timer runs out"""
    player = data.get('player')
    if player:
        eliminate_player(player)
        print(f"Player {player} eliminated due to timeout")

def eliminate_player(player_name):
    """Eliminate a player who ran out of time"""
    if player_name not in game_state.word_chain_state['eliminated_players']:
        game_state.word_chain_state['eliminated_players'].add(player_name)
        
        # If this was the current player, move to next player
        if game_state.word_chain_state['current_player'] == player_name:
            next_player = get_next_player(player_name)
            game_state.word_chain_state['current_player'] = next_player
        
        # Broadcast update
        broadcast_word_chain_update()
        
        # Check if game is over (only one or no players left)
        check_game_end()

def check_game_end():
    """Check if the game should end"""
    if not game_state.is_team_mode:
        # Free-for-all: game ends when 0 or 1 players remain
        active_players = [p for p in game_state.word_chain_state['player_order'] 
                        if p not in game_state.word_chain_state['eliminated_players']]
        
        if len(active_players) <= 1:
            # Game is over
            handle_word_chain_game_end()
    
    # Team mode game end is triggered by the bomb exploding, handled by frontend

def handle_word_chain_time_up(scores):
    """Handle when time is up for word chain questions"""
    if game_state.is_team_mode:
        # In team mode, time up means the bomb exploded for the active team
        active_team = get_player_team(game_state.word_chain_state['current_player'])
        
        # Award points to the winning team
        winning_team = 'red' if active_team == 'blue' else 'blue'
        game_state.team_scores[winning_team] += POINTS_FOR_SURVIVING_BOMB  # Bonus for winning team
        
        # Update scores
        scores = get_scores_data()
        
        # Send results
        emit_all_answers_received(
            scores=scores,
            correct_answer="",
            additional_data={
                'word_chain': game_state.word_chain_state['word_chain'],
                'exploded_team': active_team,
                'winning_team': winning_team,
                'exploded_player': game_state.word_chain_state['current_player'],
                'game_points': POINTS_FOR_SURVIVING_BOMB  # Add game-specific points
            }
        )
