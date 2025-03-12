from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Import MongoDB connection
from .db import db

# Import global variable
from .constants import is_online

# Initialize Flask app with static folder configuration
app = Flask(__name__, static_folder='../static', static_url_path='')
app.config['SECRET_KEY'] = 'your_secret_key'

# Setup CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Import routes after app initialization to avoid circular imports
from .routes import *
from .socketio_events import *