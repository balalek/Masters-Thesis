"""Base question handler class implementing the strategy pattern
for processing different question types. Provides common functionality
for validation, creation, formatting, and reference management that
specialized question handlers can extend.

Author: Bc. Martin Baláž
"""
from bson import ObjectId
from typing import Dict, Any, Optional, List
from datetime import datetime
from ...db import db
from ...models import QuestionMetadata
from ...constants import QUIZ_VALIDATION

class BaseQuestionHandler:
    """
    Base class for handling different question types.
    
    This abstract class defines the interface and common functionality
    for all question type handlers. Each specific question type
    (ABCD, True/False, Drawing, etc.) should extend this class and
    implement the type-specific methods.
    
    The handler pattern allows for polymorphic processing of different
    question types throughout the application.
    """
    
    def __init__(self, question_type: str):
        """
        Initialize a new question handler for a specific type.
        
        Args:
            question_type: The type identifier for questions this handler processes
        """
        self.question_type = question_type
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate the question data based on its type.
        
        Performs basic validation common to all question types.
        Should be overridden by subclasses with additional type-specific validation.
        
        Args:
            question_data: The question data to validate
            
        Returns:
            bool: True if the question data is valid, False otherwise
        """
        return 'question' in question_data and question_data.get('type') == self.question_type
    
    def create_question_dict(self, question_data: Dict[str, Any], quiz_id: ObjectId, 
                            device_id: str, original: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a standardized question dictionary with common fields.
        
        Processes raw question data into the format required for database storage,
        handling both new questions and updates to existing questions.
        
        Args:
            question_data: Raw question data from the frontend
            quiz_id: MongoDB ObjectId of the parent quiz
            device_id: Device identifier of the creator/editor
            original: The original question document if this is an update
        
        Returns:
            Dict: Processed question dictionary ready for database insertion/update
        """
        is_modified = question_data.get("modified", False)
        is_existing = original is not None
        
        question_dict = {
            "question": question_data["question"],
            "type": self.question_type,
            "length": question_data.get("timeLimit", question_data.get("length", QUIZ_VALIDATION["TIME_LIMIT_DEFAULT"])),
            "category": question_data["category"],
            "part_of": quiz_id,
            "created_by": device_id,
            "copy_of": self._determine_copy_of(question_data, original, is_modified, is_existing),
            "metadata": QuestionMetadata().to_dict()
        }
        
        # Add type-specific fields by calling the subclass method
        question_dict.update(self.add_type_specific_fields(question_data))
        
        return question_dict
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add fields specific to this question type.
        
        This is a hook method to be implemented by subclasses to add
        fields that are unique to their specific question type.
        
        Args:
            question_data: The raw question data from the frontend
            
        Returns:
            Dict: Dictionary with type-specific fields to be added to the question
        """
        return {}
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format a database question document for frontend display.
        
        Transforms the database representation of a question into a format
        that the frontend can use, including computed and derived fields.
        
        Args:
            question: Database question document
            quiz_name: Name of the parent quiz for display purposes
            
        Returns:
            Dict: Formatted question data ready for frontend consumption
        """
        question_data = {
            '_id': str(question['_id']),
            'question': question['question'],
            'type': question['type'],
            'category': question.get('category', ''),
            'length': question.get('length', QUIZ_VALIDATION["TIME_LIMIT_DEFAULT"]),
            'timeLimit': question.get('length', QUIZ_VALIDATION["TIME_LIMIT_DEFAULT"]),
            'quizName': quiz_name,
            'timesPlayed': question.get('metadata', {}).get('timesUsed', 0),
            'copy_of': str(question['copy_of']) if question.get('copy_of') else None,
            'isMyQuestion': False  # This will be set by the caller
        }
        
        return question_data
    
    def _determine_copy_of(self, question_data: Dict[str, Any], original: Optional[Dict[str, Any]], 
                          is_modified: bool, is_existing: bool) -> Optional[ObjectId]:
        """
        Determine the 'copy_of' reference field value for a question.
        
        Complex logic to establish proper lineage tracking for questions
        that are copied from others or modified from originals.
        
        Args:
            question_data: The question data being processed
            original: Original question document if this is an update
            is_modified: Whether the question has been substantively modified
            is_existing: Whether this is an update to an existing question
            
        Returns:
            ObjectId or None: The ID of the original question this is a copy of, or None
        """
        if is_modified:
            return None # It's a modified question, so it's not a copy anymore but a new original
        if question_data.get("copy_of"):
            return ObjectId(question_data["copy_of"]) # Keep the copy_of reference from the frontend
        if original and original.get("copy_of"):
            return original["copy_of"] # This way we track the very first original question
        if not original or (is_existing and str(original["_id"]) == str(question_data.get("_id"))):
            return None # This is a new question or this is an update to the original question
        return original["_id"] # This is a copy of an existing question, which doesn't have a copy_of reference
    
    @staticmethod
    def handle_copy_references(old_question_id: ObjectId, copies: List[Dict[str, Any]]) -> None:
        """
        Handle copy_of references when an original question is changed or removed.
        
        Ensures the integrity of the question lineage by promoting the oldest copy
        to be the new original when the original question is deleted or significantly changed.
        
        Args:
            old_question_id: ID of the original question being removed/changed
            copies: List of question documents that are copies of the original
        """
        if copies:
            # Find oldest copy to become new original
            # Use the created_at field if it exists, otherwise use _id as a fallback
            new_original = min(copies, key=lambda x: x.get("created_at", x.get("_id", datetime.max)))
            new_original_id = new_original["_id"]
            
            # Update all other copies to point to new original
            db.questions.update_many(
                {
                    "copy_of": old_question_id,
                    "_id": {"$ne": new_original_id}
                },
                {"$set": {"copy_of": new_original_id}}
            )
            # Make new original a true original
            db.questions.update_one(
                {"_id": new_original_id},
                {"$set": {"copy_of": None}}
            )
