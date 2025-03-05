from ..local_db import local_db
from typing import List
import datetime
import json
from tinydb import Query

class LocalStorageService:
    @staticmethod
    def store_created_question(question_id: str) -> bool:
        """
        Store the ID of a created question in the local database
        """
        if not local_db:
            print("Local database not available")
            return False
        
        try:
            # Check if question ID already exists
            Question = Query()
            existing = local_db['created_questions'].search(Question.question_id == question_id)
            if existing:
                return True  # Already stored
            
            # Store the question ID only
            local_db['created_questions'].insert({
                "question_id": question_id
            })
            return True
        except Exception as e:
            print(f"Error storing created question: {e}")
            return False
    
    @staticmethod
    def get_created_questions() -> List[str]:
        """
        Get all question IDs that have been created by this device
        """
        if not local_db:
            print("Local database not available")
            return []
        
        try:
            # Get all question IDs from local database
            question_docs = local_db['created_questions'].all()
            return [doc["question_id"] for doc in question_docs]
        except Exception as e:
            print(f"Error retrieving created questions: {e}")
            return []
    
    @staticmethod
    def is_question_created_locally(question_id: str) -> bool:
        """
        Check if a question was created by this device
        """
        if not local_db:
            print("Local database not available")
            return False
        
        try:
            Question = Query()
            return bool(local_db['created_questions'].search(Question.question_id == question_id))
        except Exception as e:
            print(f"Error checking if question was created locally: {e}")
            return False
