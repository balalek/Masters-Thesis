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
    
    # Add player to game state
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
