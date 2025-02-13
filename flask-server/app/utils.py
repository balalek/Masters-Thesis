import tkinter as tk
from tkinter import ttk
import webbrowser
import sys

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