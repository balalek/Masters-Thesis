"""Handler for Drawing type questions in the quiz application.
Provides specialized validation, formatting, and processing
for interactive drawing questions where players take turns
drawing words while others guess.

Author: Bc. Martin Baláž
"""
from typing import Dict, Any
from ...constants import QUESTION_TYPES, QUIZ_VALIDATION
from .base_handler import BaseQuestionHandler
from bson import ObjectId
from typing import Optional
from ...models import QuestionMetadata

class DrawingQuestionHandler(BaseQuestionHandler):
    """
    Handler for Drawing type questions.
    
    Manages interactive drawing questions where players take turns drawing
    words for others to guess. These questions have special properties
    like rounds and drawing time instead of standard question content.
    """
    
    def __init__(self):
        """Initialize the handler with the DRAWING question type."""
        super().__init__(QUESTION_TYPES["DRAWING"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate that the drawing question configuration is valid.
        
        Checks drawing-specific constraints including:

        - Time limits for each drawing round
        - Number of drawing rounds
        
        Args:
            question_data: Raw question data to validate
            
        Returns:
            bool: True if the drawing configuration is valid
        """
        # Override base validation to skip question validation 
        # since Drawing doesn't use a "question" field
        if not question_data or question_data.get('type') != self.question_type:
            return False
        
        # Drawing specific validation
        length = question_data.get('length', question_data.get('length', QUIZ_VALIDATION['DRAWING_DEFAULT_TIME']))
        rounds = question_data.get('rounds', QUIZ_VALIDATION['DRAWING_DEFAULT_ROUNDS'])
        
        # Validate time limit
        if (length < QUIZ_VALIDATION['DRAWING_MIN_TIME'] or 
            length > QUIZ_VALIDATION['DRAWING_MAX_TIME']):
            return False
            
        # Validate rounds
        if (rounds < QUIZ_VALIDATION['DRAWING_MIN_ROUNDS'] or 
            rounds > QUIZ_VALIDATION['DRAWING_MAX_ROUNDS']):
            return False
            
        return True
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add fields specific to drawing questions.
        
        Extracts drawing-specific configuration including:
        
        - Length of each drawing round
        - Number of drawing rounds
        
        Args:
            question_data: Raw question data from frontend
            
        Returns:
            Dict: Drawing-specific fields for database storage
        """
        return {
            "length": question_data.get("length", question_data.get("length", QUIZ_VALIDATION["DRAWING_DEFAULT_TIME"])),
            "rounds": question_data.get("rounds", QUIZ_VALIDATION["DRAWING_DEFAULT_ROUNDS"])
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format drawing question for frontend display.
        
        Creates a standardized representation of drawing questions for the UI,
        providing default values for missing fields and adapting the database
        structure to match frontend expectations.
        
        Args:
            question: Database question document
            quiz_name: Name of the parent quiz for display purposes
            
        Returns:
            Dict: Formatted drawing question ready for frontend consumption
        """
        # Safety check to avoid NoneType errors
        if not question:
            return {
                '_id': '',
                'question': 'Kreslení',  # Default title
                'type': self.question_type,
                'length': QUIZ_VALIDATION["DRAWING_DEFAULT_TIME"],
                'rounds': QUIZ_VALIDATION["DRAWING_DEFAULT_ROUNDS"],
                'quizName': quiz_name,
                'timesPlayed': 0,
                'copy_of': None,
                'isMyQuestion': False,
                'answers': [{'text': 'Hra kreslení - hádání', 'isCorrect': True}]
            }
        
        # Customize for drawing questions that don't have a question field
        question_data = {
            '_id': str(question.get('_id', '')),
            'question': 'Kreslení',
            'type': question.get('type', self.question_type),
            'length': question.get('length', QUIZ_VALIDATION["DRAWING_DEFAULT_TIME"]),
            'rounds': question.get('rounds', QUIZ_VALIDATION["DRAWING_DEFAULT_ROUNDS"]),
            'quizName': quiz_name,
            'timesPlayed': question.get('metadata', {}).get('timesUsed', 0) if question.get('metadata') else 0,
            'copy_of': str(question['copy_of']) if question.get('copy_of') else None,
            'isMyQuestion': False
        }
            
        return question_data
    
    def create_question_dict(self, question_data: Dict[str, Any], quiz_id: ObjectId, 
                           device_id: str, original: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a database document for a drawing question.
        
        Overrides the base method to handle the special structure of drawing questions,
        which don't have standard question text and answers.
        
        Args:
            question_data: Raw question data from frontend
            quiz_id: MongoDB ObjectId of the parent quiz
            device_id: Device identifier of the creator/editor
            original: Original question document if this is an update
            
        Returns:
            Dict: Processed drawing question ready for database storage
        """
        if not question_data:
            question_data = {}
        
        is_modified = question_data.get("modified", False)
        is_existing = original is not None
        
        question_dict = {
            "type": self.question_type,
            "part_of": quiz_id,
            "created_by": device_id,
            "copy_of": self._determine_copy_of(question_data, original, is_modified, is_existing),
            "metadata": QuestionMetadata().to_dict()
        }
        
        # Add type-specific fields
        question_dict.update(self.add_type_specific_fields(question_data))
        
        return question_dict