from tinydb import TinyDB
import os
from pathlib import Path
import datetime

# Create directory for TinyDB data if it doesn't exist
data_dir = Path(os.path.expanduser("~")) / ".homequiz" / "data"
data_dir.mkdir(parents=True, exist_ok=True)

# Initialize the TinyDB database
db_path = data_dir / "local_quiz.json"
try:
    db = TinyDB(db_path)
    
    # Create tables (equivalent to collections in MongoDB)
    created_questions = db.table('created_questions')
    favorite_quizzes = db.table('favorite_quizzes')
    created_quizzes = db.table('created_quizzes')
    
    local_db = {
        'created_questions': created_questions,
        'favorite_quizzes': favorite_quizzes,
        'created_quizzes': created_quizzes
    }
    
    print(f"TinyDB initialized successfully at {db_path}")
except Exception as e:
    print(f"Error initializing TinyDB: {e}")
    local_db = None
