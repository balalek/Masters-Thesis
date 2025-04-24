"""Contains main utility functions for the quiz application.

This module provides helper functions used throughout the application:

- Network utilities for IP detection and connectivity checks
- UI components for the desktop launcher window
- Data conversion utilities for MongoDB compatibility
- Device identification for tracking content ownership
"""
import tkinter as tk
from tkinter import ttk
import webbrowser
import sys
from bson import ObjectId
import os
import uuid
import platform
import socket
from .constants import is_online

def get_local_ip():
    """
    Get the local IP address that is being used for network communication.
    
    Attempts multiple methods to find a valid local IP address:

    1. Creates a UDP socket connection to determine the routing interface
    2. Falls back to hostname-based lookup if socket method fails
    3. Returns localhost as a final fallback
    
    Returns:
        str: Local IP address (e.g., "192.168.1.5") or "127.0.0.1" if detection fails
    """
    try:
        # This creates a socket and connects to an external service
        # to determine which local interface/IP is used for internet connectivity
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # Doesn't need to be reachable, just forces socket routing
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()

        return ip
    
    except Exception:
        # Fallback method
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            return ip
        
        except:
            return "127.0.0.1"  # Default fallback

def create_window(port):
    """
    Create and configure the application launcher window.
    
    Creates a simple Tkinter window with:
    
    - Display of the local IP address for communication
    - Button to launch the application in the default browser
    - Button to exit the application and turn off the server
    
    Args:
        port: The port number the Flask server is running on
        
    Returns:
        tuple: (tk.Tk root window, local IP address string)
    """
    root = tk.Tk()
    root.title("Domácí kvíz")
    root.geometry("300x100")
    root.eval('tk::PlaceWindow . center')
    
    ip_address = get_local_ip()
    
    def open_website():
        """
        Open the application in the default web browser.
        
        Opens a browser window to the localhost URL at the specified port.
        """
        url = f'http://localhost:{port}'
        webbrowser.open(url)
    
    def exit_app():
        """
        Exit the application completely.
        
        Destroys the Tkinter window and terminates the Python process.
        """
        root.destroy()
        sys.exit(0)
    
    ttk.Label(root, text=f"Lokální IP: {ip_address}:5000").pack(pady=5)
    ttk.Button(root, text="Spustit v prohlížeči", command=open_website).pack(pady=5)
    ttk.Button(root, text="Ukončit", command=exit_app).pack(pady=5)
    
    return root, ip_address

def convert_mongo_doc(doc):
    """
    Convert MongoDB document to JSON serializable format.
    
    Recursively processes MongoDB documents to convert ObjectId and other
    non-JSON serializable types to string representations. Handles nested
    dictionaries and lists automatically.
    
    Args:
        doc: MongoDB document or sub-document to convert
        
    Returns:
        dict/list/value: JSON-serializable version of the input document
    """
    if isinstance(doc, list):
        return [convert_mongo_doc(item) for item in doc]
    elif isinstance(doc, dict):
        return { key: convert_mongo_doc(value) for key, value in doc.items() }
    elif isinstance(doc, ObjectId):
        return str(doc)
    return doc

def get_device_id():
    """
    Get a unique identifier for this device.
    
    Creates a persistent device identifier used for tracking quiz ownership.
    First tries to read an existing ID from a hidden file in the user's home 
    directory, and if not found, generates a new one based on system information
    and a random UUID.
    
    Returns:
        str: Unique device identifier string
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
    
    Args:
        host: Host to connect to for testing internet connectivity (default: Google DNS)
        port: Port to connect to (default: DNS port 53)
        timeout: Connection timeout in seconds
        
    Returns:
        bool: True if connection is available, False otherwise
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