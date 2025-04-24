"""Player management routes for the quiz application.
Handles player joining and color selection functionality.
"""
from flask import Blueprint, jsonify, request
from .. import socketio
from ..game_state import game_state
from ..constants import AVAILABLE_COLORS, MAX_PLAYERS

player_routes = Blueprint('player_routes', __name__)

@player_routes.route('/available_colors', methods=['GET'])
def get_available_colors():
    """
    Get a list of available player colors that aren't currently in use.
    
    Returns:
        JSON object with array of available color codes
            {
                "colors": ["#FF5733", "#33FF57", ...]
            }
    """
    used_colors = [player['color'] for player in game_state.players.values()]
    available_colors = [color for color in AVAILABLE_COLORS if color not in used_colors]

    return jsonify({"colors": available_colors})

@player_routes.route('/join', methods=['POST'])
def join():
    """
    Handle a player joining the quiz.
    
    Validates that:

    - A quiz is currently active
    - Maximum player limit hasn't been reached
    - The player name is unique
    - The requested color is available
    
    Request body (JSON):

        player_name: The name/nickname of the player
        color: The color code chosen by the player
    
    Returns:
        200 JSON: Success confirmation with available colors
        400 JSON: Error if joining requirements aren't met
    """
    # Check if quiz is active
    if not game_state.is_quiz_active:
        return jsonify({"error": "Žádný kvíz není momentálně připraven"}), 400
    
    # Check if player limit has been reached
    if len(game_state.players) >= MAX_PLAYERS:
        return jsonify({"error": f"Kvíz již dosáhl maximálního počtu hráčů ({MAX_PLAYERS})"}), 400

    player_name = request.json['player_name']
    player_color = request.json['color']

    # Validate player name uniqueness
    if player_name in game_state.players:
        return jsonify({"error": "Tato přezdívka je již zabraná"}), 400
    
    # Validate color availability
    used_colors = [player['color'] for player in game_state.players.values()]
    if player_color not in AVAILABLE_COLORS or player_color in used_colors:
        return jsonify({"error": "Tato barva je již zabraná"}), 400
    
    # Check if game is running at the moment
    if game_state.is_game_running:
        return jsonify({"error": "Hra již probíhá, nelze se připojit"}), 400
    
    # Add player to game state (without socket ID)
    game_state.players[player_name] = {
        "score": 0,
        "color": player_color
    }
    
    # Update available colors list
    new_used_colors = [player['color'] for player in game_state.players.values()]
    new_available_colors = [c for c in AVAILABLE_COLORS if c not in new_used_colors]
    
    # Notify all clients about the player joining and updated color list
    socketio.emit('colors_updated', {"colors": new_available_colors})
    socketio.emit('player_joined', {"player_name": player_name, "color": player_color})
    
    return jsonify({"message": "Player joined", "colors": new_available_colors}), 200


@player_routes.route('/change_name', methods=['POST'])
def change_name():
    """
    Handle a player changing their name during the waiting room phase.
    
    Validates that:

    - The old name exists
    - The new name is unique
    - The new name meets length requirements
    
    Request body (JSON):

        - old_name: The current name of the player
        - new_name: The desired new name for the player
    
    Returns:
        200 JSON: Success confirmation
        400 JSON: Error if requirements aren't met
    """
    if not game_state.is_quiz_active:
        return jsonify({"error": "Žádný kvíz není momentálně připraven"}), 400
        
    old_name = request.json.get('old_name')
    new_name = request.json.get('new_name')
    
    # Validate that old name exists
    if old_name not in game_state.players:
        return jsonify({"error": "Původní jméno nebylo nalezeno"}), 400
        
    # Validate that new name is unique
    if new_name in game_state.players and new_name != old_name:
        return jsonify({"error": "Tato přezdívka je již zabraná"}), 400
        
    # Validate name length
    if len(new_name) < 3 or len(new_name) > 16:
        return jsonify({"error": "Přezdívka musí mít 3 až 16 znaků"}), 400
        
    # Get player data and update the name
    player_data = game_state.players.pop(old_name)
    game_state.players[new_name] = player_data
    
    # Emit a socket event to update clients
    socketio.emit('player_name_changed', {
        "old_name": old_name,
        "new_name": new_name,
        "color": player_data["color"]
    })
    
    return jsonify({"success": True, "message": "Jméno úspěšně změněno"}), 200
