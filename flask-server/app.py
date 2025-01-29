from flask import Flask, jsonify, send_from_directory, request, session
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from pathlib import Path
import webbrowser
import threading
import tkinter as tk
from tkinter import ttk
import sys

# Import MongoDB connection
from db import db

# Available colors list (tested for black theme)
AVAILABLE_COLORS = [
    "#f44336",  # Red
    "#e91e63",  # Pink
    "#43a047",  # Green
    "#00796b",  # Teal
    "#2196f3",  # Blue
    "#3f51b5",  # Indigo
    "#827717",  # Yellow
    "#607d8b",  # Blue grey
    "#0097a7",  # Cyan
    "#ef6c00",  # Orange
    "#9c27b0",  # Purple
    "#4a148c",  # Dark purple
    "#33691e",  # Dark Green
    "#795548",  # Brown
    "#616161",  # Grey
]

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = 'your_secret_key'
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*")

# Globální herní stav
game_state = {
    "players": {},  # Dictionary of players with their score and color
    "current_question": None,  # Index aktuální otázky
    "questions": [],  # Seznam otázek
    "answers_received": 0,  # Počet přijatých odpovědí
    "answer_counts": [0, 0, 0, 0],  # Initialize answer counts
}

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

@app.route('/available_colors', methods=['GET'])
def get_available_colors():
    used_colors = [player['color'] for player in game_state['players'].values()]
    available_colors = [color for color in AVAILABLE_COLORS if color not in used_colors]
    return jsonify({"colors": available_colors})

@app.route('/join', methods=['POST'])
def join():
    # Player joining the game
    player_name = request.json['player_name']
    player_color = request.json['color']
    
    if player_name in game_state['players']:
        return jsonify({"error": "Player already exists"}), 400
        
    # Calculate available colors before adding new player
    used_colors = [player['color'] for player in game_state['players'].values()]
    if player_color not in AVAILABLE_COLORS or player_color in used_colors:
        return jsonify({"error": "Color not available"}), 400
        
    # Add player with their color
    game_state['players'][player_name] = {
        "score": 0,
        "color": player_color
    }
    
    # Calculate new available colors after adding player
    new_used_colors = [player['color'] for player in game_state['players'].values()]
    new_available_colors = [c for c in AVAILABLE_COLORS if c not in new_used_colors]
    
    # Emit updates in correct order
    socketio.emit('colors_updated', {"colors": new_available_colors})
    socketio.emit('player_joined', {"player_name": player_name, "color": player_color})
    
    return jsonify({"message": "Player joined", "colors": new_available_colors}), 200

@socketio.on('join_room')
def handle_join_room(data):
    player_name = data['player_name']
    join_room(player_name)  # Player joins their own room - so that they can receive messages meant only for them
    print(f'Player {player_name} joined room {player_name}')

@app.route('/start_game', methods=['POST'])
def start_game():
    # Zahájení hry
    game_state['questions'] = [
        {"question": "Kolik je 2 + 2?", "options": ["3", "4", "5", "8"], "answer": 1},
        {"question": "Jaké je hlavní město Francie?", "options": ["Berlín", "Londýn", "Paříž", "Řím"], "answer": 2},
        {"question": "Kolik je odmocnina ze 16?", "options": ["3", "4", "5", "6"], "answer": 1}
    ]
    game_state['current_question'] = 0  # Nastavení první otázky
    game_state['answers_received'] = 0  # Reset počtu přijatých odpovědí
    game_state['answer_counts'] = [0, 0, 0, 0]  # Reset answer counts
    first_question = game_state['questions'][game_state['current_question']]
    #socketio.emit('game_started', {"questions": game_state['questions']})  # Oznámení o startu hry
    socketio.emit('game_started', {"question": first_question})  # Oznámení o startu hry
    return jsonify({"message": "Game started"}), 200

@socketio.on('submit_answer')
def submit_answer(data):
    player_name = data['player_name']
    answer = data['answer']
    current_question = game_state['current_question']
    points_for_correct = 50  # Keep existing points value
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    correct_answer = game_state['questions'][current_question]['answer']
    points_earned = points_for_correct if answer == correct_answer else 0
    
    if answer == correct_answer:
        game_state['players'][player_name]['score'] += points_for_correct  # Fix: access the score in the dictionary
    
    game_state['answers_received'] += 1
    game_state['answer_counts'][answer] += 1
    
    socketio.emit('answer_submitted')
    emit('answer_correctness', {
        "correct": answer == correct_answer,
        "points_earned": points_earned,
        "total_points": game_state['players'][player_name]['score']
    }, room=player_name)
    
    if game_state['answers_received'] == len(game_state['players']):
        socketio.emit('all_answers_received', {
            "scores": game_state['players'],
            "correct_answer": correct_answer,
            "answer_counts": game_state['answer_counts']
        })  # Oznámení o přijetí všech odpovědí

@app.route('/next_question', methods=['POST'])
def next_question():
    # Nastavení další otázky
    if game_state['current_question'] is None or game_state['current_question'] + 1 >= len(game_state['questions']):
        return jsonify({"error": "No more questions"}), 400
    
    game_state['current_question'] += 1  # Posun na další otázku
    game_state['answers_received'] = 0  # Reset počtu přijatých odpovědí
    game_state['answer_counts'] = [0, 0, 0, 0]  # Reset answer counts for the next question

    next_question = game_state['questions'][game_state['current_question']]
    is_last_question = game_state['current_question'] + 1 == len(game_state['questions'])

    socketio.emit('next_question', {"question": next_question, "is_last_question": is_last_question})  # Oznámení o nové otázce
    return jsonify({"question": next_question, "is_last_question": is_last_question}), 200

@app.route('/get_scores', methods=['GET'])
def get_scores():
    # Získání skóre všech hráčů
    return jsonify({"scores": game_state['players']}), 200

@app.route('/reset_game', methods=['POST'])
def reset_game():
    # Reset game state
    game_state['players'] = {}
    game_state['current_question'] = None
    game_state['questions'] = []
    game_state['answers_received'] = 0
    game_state['answer_counts'] = [0, 0, 0, 0]  # Reset answer counts
    return jsonify({"message": "Game state reset"}), 200

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
