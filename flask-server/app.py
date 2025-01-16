from flask import Flask, send_from_directory, request, session
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from pathlib import Path
import webbrowser
import threading
import tkinter as tk
from tkinter import ttk
import sys

# Import MongoDB connection
from db import db

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = 'your_secret_key'
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    file_path = Path(app.static_folder) / path
    if path != "" and file_path.exists():
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@socketio.on('connect')
def handle_connect():
    is_server = request.remote_addr == '127.0.0.1'
    if is_server:
        session['server'] = True
    print(f'Client connected from {request.remote_addr}. Is server: {is_server}')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    if 'server' in session:
        del session['server']

@socketio.on('send_message')
def handle_message(data):
    print('Received message: ' + data)
    socketio.emit('receive_message', data)

''' TODO - uncomment for .exe
def create_window(port):
    root = tk.Tk()
    root.title("Domácí kvíz")
    root.geometry("200x100")
    root.eval('tk::PlaceWindow . center')
    
    def open_website():
        url = f'http://localhost:{port}'
        webbrowser.open(url)
    
    def exit_app():
        root.destroy()
        sys.exit(0)
    
    ttk.Button(root, text="Spustit", command=open_website).pack(pady=10)
    ttk.Button(root, text="Ukončit", command=exit_app).pack(pady=5)
    
    return root
'''

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
