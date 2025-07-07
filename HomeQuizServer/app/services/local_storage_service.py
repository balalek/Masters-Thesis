"""Local storage service for the quiz application.
Manages persistent local device storage using TinyDB
to track questions created on this device. Used for
determining question ownership, because it's faster
to check locally than querying the server.

Author: Bc. Martin Baláž
"""
from ..local_db import local_db
from typing import List
from tinydb import Query

class LocalStorageService:
    """
    Service for managing local device storage operations.
    
    Provides methods to track and check question creation history
    on the local device using TinyDB as a lightweight JSON database.
    Used to determine if a question was originally created on this
    device, allowing for user permissions to be maintained across
    sessions and installations.
    """
    
    @staticmethod
    def store_created_question(question_id: str) -> bool:
        """
        Store the ID of a created question in the local database.
        
        When a new question is created, this records the ID locally
        to track ownership for future quick-play sessions.
        
        Args:
            question_id: MongoDB ObjectId of the created question (as string)
            
        Returns:
            bool: True if successfully stored or already exists, False if error
        """
        if not local_db:
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
            print(e)
            return False
    
    @staticmethod
    def get_created_questions() -> List[str]:
        """
        Get all question IDs that have been created by this device.
        
        Retrieves the complete history of questions created locally.
        
        Returns:
            List[str]: List of question ID strings, empty if none found or error
        """
        if not local_db:
            return []
        
        try:
            # Get all question IDs from local database
            question_docs = local_db['created_questions'].all()
            return [doc["question_id"] for doc in question_docs]
        
        except Exception as e:
            print(e)
            return []
    
    @staticmethod
    def is_question_created_locally(question_id: str) -> bool:
        """
        Check if a question was created by this device.
        
        Determines if the given question ID exists in the local
        database, indicating it was created on this device.
        
        Args:
            question_id: MongoDB ObjectId of the question to check (as string)
            
        Returns:
            bool: True if the question was created locally, False otherwise
        """
        if not local_db:
            return False
        
        try:
            Question = Query()
            return bool(local_db['created_questions'].search(Question.question_id == question_id))
        
        except Exception as e:
            print(e)
            return False