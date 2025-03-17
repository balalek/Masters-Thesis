from bson import ObjectId
from typing import Dict, Any, Optional, List
from datetime import datetime
from ...db import db
from ...models import QuestionMetadata

class BaseQuestionHandler:
    """Base class for handling different question types."""
    
    def __init__(self, question_type: str):
        self.question_type = question_type
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate the question data based on its type.
        Should be overridden by subclasses with specific validation logic.
        
        Returns:
            bool: True if valid, False otherwise
        """
        # Base validation that applies to all question types
        return 'question' in question_data and question_data.get('type') == self.question_type
    
    def create_question_dict(self, question_data: Dict[str, Any], quiz_id: ObjectId, 
                            device_id: str, original: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create the base question dictionary with common fields.
        
        Args:
            question_data: The raw question data
            quiz_id: The ID of the parent quiz
            device_id: The ID of the device creating/updating the question
            original: The original question document if this is an update
        
        Returns:
            Dict: The prepared question dictionary with common fields
        """
        is_modified = question_data.get("modified", False)
        is_existing = original is not None
        
        question_dict = {
            "question": question_data["question"],
            "type": self.question_type,
            "length": question_data.get("timeLimit", question_data.get("length", 30)),
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
        Should be overridden by subclasses.
        
        Returns:
            Dict: Dictionary with type-specific fields to be added
        """
        return {}
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format the question for frontend display.
        Should be extended by subclasses for type-specific formatting.
        
        Returns:
            Dict: The formatted question data for frontend
        """
        question_data = {
            '_id': str(question['_id']),
            'question': question['question'],
            'type': question['type'],
            'category': question['category'],
            'length': question.get('length', 30),
            'timeLimit': question.get('length', 30),
            'quizName': quiz_name,
            'timesPlayed': question.get('metadata', {}).get('timesUsed', 0),
            'copy_of': str(question['copy_of']) if question.get('copy_of') else None,  # Add copy_of reference
            'isMyQuestion': False  # This will be set by the caller
        }
        
        return question_data
    
    def _determine_copy_of(self, question_data: Dict[str, Any], original: Optional[Dict[str, Any]], 
                          is_modified: bool, is_existing: bool) -> Optional[ObjectId]:
        """Determine the 'copy_of' field value for a question."""
        if is_modified:
            return None
        if question_data.get("copy_of"):
            return ObjectId(question_data["copy_of"])
        if original and original.get("copy_of"):
            return original["copy_of"]
        if not original or (is_existing and str(original["_id"]) == str(question_data.get("_id"))):
            return None
        return original["_id"]
    
    @staticmethod
    def handle_copy_references(old_question_id: ObjectId, copies: List[Dict[str, Any]]) -> None:
        """Handle copy_of references when original question changes or is removed"""
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
