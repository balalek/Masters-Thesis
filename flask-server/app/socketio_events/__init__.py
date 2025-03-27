"""
Socket.IO events - initialization
Import all event handlers here to register them with the socketio instance
"""
from flask import request, session
from .. import socketio
from ..game_state import game_state

# Import all event handlers to register them
from .base_events import *
from .abcd_events import *
from .open_answer_events import *
from .guess_number_events import *

# Initialize the module
def init_socketio(app):
    """Initialize the socketio events module with the Flask app"""
    print("Socketio events initialized")
    return socketio
