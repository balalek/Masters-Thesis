"""
Author: Bc. Martin Baláž

Main Flask application initialization module.
Configures the Flask application, sets up middleware,
initializes SocketIO for real-time communication,
and registers all application routes and event handlers.

Author: Bc. Martin Baláž
"""
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Import global variable - TODO: use this in the app to check if online and warn the user
from .constants import is_online

# Initialize Flask app with static folder configuration
app = Flask(__name__, static_folder='../static', static_url_path='')
app.config['SECRET_KEY'] = 'home-quiz-default-secret-key'

# Setup CORS to allow cross-origin requests (important for development and API)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO for real-time bidirectional communication
socketio = SocketIO(app, cors_allowed_origins="*")

# Import and register route blueprints
from .routes import register_blueprints
register_blueprints(app)

# Import socketio_events package
from .socketio_events import init_socketio
init_socketio(app)