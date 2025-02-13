from app import app, socketio
import threading
from app.utils import create_window

if __name__ == '__main__':
    port = 5000

    socketio.run(app, host='0.0.0.0', port=port)
    ''' TODO - uncomment for .exe and comment above socketio.run
    # Start Flask in background thread
    flask_thread = threading.Thread(
        target=lambda: socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
    )
    flask_thread.daemon = True
    flask_thread.start()
    
    # Create and run window
    window = create_window(port)
    window.mainloop()
    '''