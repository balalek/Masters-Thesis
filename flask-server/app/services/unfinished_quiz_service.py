from ..local_db import local_db
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import json
from tinydb import Query
from ..utils import get_device_id

class UnfinishedQuizService:
    @staticmethod
    def save_unfinished_quiz(quiz_data: Dict[str, Any], is_editing: bool = False, 
                           quiz_id: Optional[str] = None, autosave_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Save or update unfinished quiz in the local database
        Returns: Tuple containing (success_bool, autosave_identifier)
        """
        if not local_db:
            print("Local database not available")
            return False, None
        
        try:
            device_id = get_device_id()
            
            # Determine the identifier for this autosave
            identifier = None
            
            # If autosave_id was provided, use that - this means we're updating an existing autosave
            if autosave_id:
                identifier = autosave_id
                print(f"Using provided autosave ID: {identifier}")
            # For an edited quiz, use the quiz_id as identifier
            elif is_editing and quiz_id:
                identifier = quiz_id
                print(f"Using quiz ID as identifier for edited quiz: {identifier}")
            # For a completely new quiz, always create a new identifier
            else:
                # Always create a unique ID for a new quiz
                identifier = f"new_{int(datetime.now().timestamp())}_{hash(str(quiz_data))}"
                print(f"Created new identifier for new quiz: {identifier}")
            
            # Basic validation
            if not quiz_data or not quiz_data.get('questions') or not isinstance(quiz_data.get('questions'), list):
                print("Invalid quiz data - missing questions array")
                return False, None
                
            # Prepare quiz data
            save_data = {
                "identifier": identifier,
                "name": quiz_data.get('name', 'Unnamed Quiz'),
                "questions": json.dumps(quiz_data.get('questions')),  # Serialize questions to string
                "quiz_type": quiz_data.get('quiz_type', 'ABCD'),
                "is_editing": is_editing,
                "original_quiz_id": quiz_id,
                "device_id": device_id,
                "last_updated": datetime.now().isoformat(),
                "question_count": len(quiz_data.get('questions', [])),
                "creation_time": datetime.now().isoformat() # Add creation time to track when it was first created
            }
            
            # Check if this quiz already exists by identifier
            Quiz = Query()
            existing = local_db['unfinished_quizzes'].search(Quiz.identifier == identifier)
            
            if existing:
                # Update existing record
                local_db['unfinished_quizzes'].update(save_data, Quiz.identifier == identifier)
                print(f"Updated existing autosave with ID: {identifier}")
            else:
                # Create new record
                local_db['unfinished_quizzes'].insert(save_data)
                print(f"Created new autosave with ID: {identifier}")
            
            return True, identifier
        except Exception as e:
            print(f"Error saving unfinished quiz: {e}")
            return False, None
    
    @staticmethod
    def get_unfinished_quizzes() -> List[Dict[str, Any]]:
        """
        Get all unfinished quizzes for the current device
        """
        if not local_db:
            print("Local database not available")
            return []
        
        try:
            device_id = get_device_id()
            Quiz = Query()
            
            quizzes = local_db['unfinished_quizzes'].search(Quiz.device_id == device_id)
            
            # Format quizzes for display
            formatted_quizzes = []
            for q in quizzes:
                formatted_quizzes.append({
                    "identifier": q.get("identifier"),
                    "name": q.get("name"),
                    "is_editing": q.get("is_editing"),
                    "original_quiz_id": q.get("original_quiz_id"),
                    "last_updated": q.get("last_updated"),
                    "question_count": q.get("question_count", 0)
                })
            
            # Sort by last updated, newest first
            formatted_quizzes.sort(key=lambda x: x.get("last_updated", ""), reverse=True)
            
            return formatted_quizzes
        except Exception as e:
            print(f"Error retrieving unfinished quizzes: {e}")
            return []
    
    @staticmethod
    def get_unfinished_quiz(identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific unfinished quiz by identifier
        """
        if not local_db:
            print("Local database not available")
            return None
        
        try:
            device_id = get_device_id()
            Quiz = Query()
            
            results = local_db['unfinished_quizzes'].search(
                (Quiz.identifier == identifier) & 
                (Quiz.device_id == device_id)
            )
            
            if not results:
                return None
                
            quiz_data = results[0]
            
            # Parse questions from JSON
            try:
                questions = json.loads(quiz_data.get("questions", "[]"))
            except:
                questions = []
            
            return {
                "identifier": quiz_data.get("identifier"),
                "name": quiz_data.get("name"),
                "questions": questions,
                "quiz_type": quiz_data.get("quiz_type"),
                "is_editing": quiz_data.get("is_editing"),
                "original_quiz_id": quiz_data.get("original_quiz_id"),
                "last_updated": quiz_data.get("last_updated")
            }
        except Exception as e:
            print(f"Error retrieving unfinished quiz: {e}")
            return None
    
    @staticmethod
    def delete_unfinished_quiz(identifier: str) -> bool:
        """
        Delete an unfinished quiz by identifier
        """
        if not local_db:
            print("Local database not available")
            return False
        
        try:
            device_id = get_device_id()
            Quiz = Query()
            
            local_db['unfinished_quizzes'].remove(
                (Quiz.identifier == identifier) & 
                (Quiz.device_id == device_id)
            )
            
            return True
        except Exception as e:
            print(f"Error deleting unfinished quiz: {e}")
            return False
