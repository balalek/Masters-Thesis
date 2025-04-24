"""Local database initialization for the quiz application.
             
This module sets up a lightweight TinyDB database for storing persistent
local data without requiring a full database server. It creates:

- A hidden directory in the user's home folder (.homequiz/data)
- A JSON-based TinyDB database for local storage needs
- Separate tables (collections) for different types of local data

The local database is used for:

- Tracking questions created on this device
- Saving unfinished/draft quizzes

If initialization fails (e.g., due to permissions or disk issues), 
local_db is set to None and the app will function without local storage.
"""

from tinydb import TinyDB
import os
from pathlib import Path

# Create directory for TinyDB data if it doesn't exist
data_dir = Path(os.path.expanduser("~")) / ".homequiz" / "data"
data_dir.mkdir(parents=True, exist_ok=True)

# Initialize the TinyDB database
db_path = data_dir / "local_quiz.json"
try:
    db = TinyDB(db_path)
    
    # Create tables (equivalent to collections in MongoDB)
    created_questions = db.table('created_questions')
    unfinished_quizzes = db.table('unfinished_quizzes')
    
    local_db = {
        'created_questions': created_questions,
        'unfinished_quizzes': unfinished_quizzes
    }

except Exception as e:
    print(e)
    local_db = None