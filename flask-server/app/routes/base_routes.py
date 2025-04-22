"""
File: base_routes.py
Authors: Bc. Martin Baláž
Description: Core routing module for the Flask application.
             Contains basic routes for serving the frontend application,
             system information endpoints, and connectivity status checks.
"""
from flask import Blueprint, jsonify, send_from_directory
from pathlib import Path
from time import time
from .. import app
from ..utils import check_internet_connection, get_local_ip

base_routes = Blueprint('base_routes', __name__)

@base_routes.route('/')
def index():
    """
    Serve the main index.html file of the frontend application.
    
    Returns:
        HTML content of the main index page
    """
    return send_from_directory(app.static_folder, 'index.html')

@base_routes.route('/<path:path>')
def serve_static(path):
    """
    Serve static files from the frontend build directory.
    Falls back to index.html for client-side routing support.
    
    Args:
        path (str): Requested file path
    
    Returns:
        Requested file if it exists, otherwise index.html
    """
    file_path = Path(app.static_folder) / path # Construct the full file path
    if path != "" and file_path.exists():
        return send_from_directory(app.static_folder, path)
    else:
        # Fallback to index.html for client-side routing
        return send_from_directory(app.static_folder, 'index.html')
    
@base_routes.route('/play')
def play():
    """
    Explicit route for the 'play' page to support page refreshing in packaged app.
    
    Returns:
        HTML content of the main index page (React handles the routing)
    """
    return send_from_directory(app.static_folder, 'index.html')

@base_routes.route('/remote')
def remote():
    """
    Explicit route for the 'remote' page to support page refreshing in packaged app.
    
    Returns:
        HTML content of the main index page (React handles the routing)
    """
    return send_from_directory(app.static_folder, 'index.html')

@base_routes.route('/server_time', methods=['GET'])
def get_server_time():
    """
    Get the current server time in milliseconds.
    Used for synchronization between client and server.
    
    Returns:
        JSON object with server timestamp in milliseconds
        {
            "server_time": 1234567890123
        }
    """
    return jsonify({"server_time": int(time() * 1000)})  # Return time in milliseconds

@base_routes.route('/server_ip', methods=['GET'])
def get_server_ip():
    """
    Get the server's local IP address and port.
    Used for network communication between devices.
    
    Returns:
        JSON object containing the server's IP address and port
        {
            "ip": "192.168.1.100",
            "port": 5000
        }
    """
    ip_address = get_local_ip()
    return jsonify({"ip": ip_address, "port": 5000})

@base_routes.route('/online_status', methods=['GET'])
def get_online_status():
    """
    TODO: Haven't used this yet, but it might be useful in the future.
    Check if the server has internet connectivity.
    Forces a real-time check of the internet connection.
    
    Returns:
        JSON object with boolean internet connection status
        {
            "is_online": true/false
        }
    """
    is_connected = check_internet_connection()
    return jsonify({"is_online": is_connected}), 200
