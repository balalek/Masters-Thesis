import sqlite3
import os
from pathlib import Path

class SQLiteDB:
    def __init__(self):
        # Create db directory if it doesn't exist
        db_dir = Path(os.path.dirname(os.path.abspath(__file__))) / 'data'
        db_dir.mkdir(exist_ok=True)
        
        self.db_path = db_dir / 'quiz.db'
        self.conn = None
        self.init_db()
        
    def get_connection(self):
        if self.conn is None:
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row
        return self.conn
        
    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Create questions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            type TEXT NOT NULL,
            options TEXT NOT NULL,  -- JSON string
            answer INTEGER NOT NULL,
            length INTEGER NOT NULL,
            category TEXT NOT NULL,
            part_of TEXT,
            created_by TEXT,
            copy_of TEXT,
            times_used INTEGER DEFAULT 0,
            average_correct_rate REAL DEFAULT 0.0
        )
        ''')
        
        # Create quizzes table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS quizzes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            questions TEXT NOT NULL,  -- JSON string
            type TEXT NOT NULL,
            is_public INTEGER DEFAULT 0,
            created_by TEXT,
            creation_date TEXT
        )
        ''')
        
        conn.commit()
        
    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

# Initialize database
sqlite_db = SQLiteDB()
