"""
Route registration module for the Flask application.
Imports and registers all route blueprints with the main Flask app.
"""
# Import all route blueprints
from .base_routes import base_routes
from .player_routes import player_routes
from .game_routes import game_routes
from .quiz_management_routes import quiz_management_routes
from .unfinished_quiz_routes import unfinished_quiz_routes
from .media_routes import media_routes

# List of all blueprints to register with the app
all_blueprints = [
    base_routes,
    player_routes,
    game_routes,
    quiz_management_routes,
    unfinished_quiz_routes,
    media_routes
]

def register_blueprints(app):
    """
    Register all blueprints with the Flask application.
    
    This function connects all route modules to the main Flask application,
    making all routes available when the application runs.
    
    Args:
        app: Flask application instance
    """
    for blueprint in all_blueprints:
        app.register_blueprint(blueprint)
