"""Socket.IO event handlers initialization module.

This module serves as the central registration point for all Socket.IO event handlers:

- Imports and registers all event handler modules
- Sets up event handling for real-time communication
- Enables bidirectional server-client communication for interactive game features
- Provides structure for organizing event handlers by feature

The Socket.IO handlers manage real-time functionality including:

- Player management
- Game state synchronization
- Live question handling
- Drawing game coordination
- Word chain game coordination
"""
from .. import socketio

# Import all event handlers to register them
from .base_events import *
from .abcd_events import *
from .open_answer_events import *
from .guess_number_events import *
from .drawing_events import *
from .math_quiz_events import *
from .blind_map_events import *

def init_socketio(app):
    """
    Initialize Socket.IO event handling for the application.
    
    Completes the Socket.IO setup by binding it to the Flask application
    and ensuring all event handlers are properly registered.
    
    Args:
        app: The Flask application instance
        
    Returns:
        SocketIO: The configured socketio instance
    """
    return socketio
