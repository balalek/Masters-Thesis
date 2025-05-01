"""Main entry point for the Flask-based quiz application.

This file serves as the application entry point with two operational modes:
1. Production mode (currently active): Runs Flask directly with socketio
2. Desktop mode (commented out): Runs Flask in a background thread with a 
   Tkinter GUI window showing local IP and providing application controls

The application starts a web server on port 5000 that serves both the
API endpoints and static files for the frontend.
"""
from app import app, socketio
import threading
from app.utils import create_window
import os

# Store IP address globally
SERVER_IP = None

if __name__ == '__main__':
    port = 5000
    # Comment out the line below to use excecutable application mode
    socketio.run(app, host='0.0.0.0', port=port)
    
    # Desktop mode with GUI window (currently disabled)
    # Uncomment this section to use excecutable application mode
    """flask_thread = threading.Thread(
        target=lambda: socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
    )
    flask_thread.daemon = True
    flask_thread.start()
    
    # Create and run window, capture the IP address
    window, SERVER_IP = create_window(port)
    
    # Add the IP to the Flask app's configuration so it can be accessed from routes
    app.config['SERVER_IP'] = SERVER_IP
    
    window.mainloop()"""