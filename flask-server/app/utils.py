import tkinter as tk
from tkinter import ttk
import webbrowser
import sys
from bson import ObjectId
import os
import uuid
import platform
from functools import wraps
from flask import request, jsonify
import socket
from .constants import is_online

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

def convert_mongo_doc(doc):
    """Convert MongoDB document to JSON serializable format."""
    if isinstance(doc, list):
        return [convert_mongo_doc(item) for item in doc]
    elif isinstance(doc, dict):
        return {key: convert_mongo_doc(value) for key, value in doc.items()}
    elif isinstance(doc, ObjectId):
        return str(doc)
    return doc

def get_device_id():
    """
    Get a unique identifier for this device.
    First tries to read from a file, if not available creates one.
    """
    device_id_file = os.path.join(os.path.expanduser("~"), ".homequiz_device_id")
    
    # Try to read existing device ID
    if os.path.exists(device_id_file):
        try:
            with open(device_id_file, 'r') as f:
                device_id = f.read().strip()
                if device_id:
                    return device_id
        except Exception:
            pass  # If reading fails, we'll generate a new one
    
    # Generate a new device ID based on hardware info and a UUID
    try:
        system_info = platform.uname()
        base_info = f"{system_info.system}-{system_info.node}-{system_info.machine}"
    except:
        base_info = "unknown-device"
    
    # Generate a unique ID
    device_id = f"{base_info}-{uuid.uuid4()}"
    
    # Try to save for future use
    try:
        with open(device_id_file, 'w') as f:
            f.write(device_id)
    except Exception:
        pass  # If saving fails, we'll just use the generated ID for this session
        
    return device_id

def check_internet_connection(host="8.8.8.8", port=53, timeout=3):
    """
    Check if there's an internet connection by trying to connect to Google's DNS server.
    Updates the global is_online variable.
    
    Returns:
        bool: True if connection is available, False otherwise.
    """
    global is_online
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        is_online = True
        return True
    except socket.error:
        is_online = False
        return False