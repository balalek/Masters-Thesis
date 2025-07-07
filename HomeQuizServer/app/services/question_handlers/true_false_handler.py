"""Handler for True/False type questions in the quiz application.
Processes boolean questions with exactly two options where
one is correct. Provides validation and formatting for this
specific question type.

Author: Bc. Martin Baláž
"""
from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class TrueFalseQuestionHandler(BaseQuestionHandler):
    """
    Handler for True/False type questions.
    
    Processes boolean questions with exactly two options (typically True/False)
    where players must select the correct answer. Ensures proper validation
    and formatting of this question type.
    """
    
    def __init__(self):
        """Initialize the handler with the TRUE_FALSE question type."""
        super().__init__(QUESTION_TYPES["TRUE_FALSE"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate that the true/false question has valid options.
        
        Performs standard question validation plus checks that:
        
        - There are exactly 2 options
        - A correct answer is specified
        
        Args:
            question_data: Raw question data to validate
            
        Returns:
            bool: True if the question has valid true/false structure
        """
        if not super().validate(question_data):
            return False
        
        # True/False specific validation
        options = question_data.get('answers', question_data.get('options', []))
        return (len(options) == 2 and 
                ('correctAnswer' in question_data or 'answer' in question_data))
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract fields specific to true/false questions.
        
        Standardizes field naming between different input formats
        to ensure consistent database storage.
        
        Args:
            question_data: Raw question data from frontend
            
        Returns:
            Dict: Dictionary with standardized true/false fields
        """
        return {
            "options": question_data.get("answers", question_data.get("options")),
            "answer": question_data.get("correctAnswer", question_data.get("answer"))
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format true/false question for frontend display.
        
        Processes the options and correct answer into a structured format
        that the frontend components can render appropriately.
        
        Args:
            question: Database question document
            quiz_name: Name of the parent quiz
            
        Returns:
            Dict: Formatted question with options and correct answer marked
        """
        question_data = super().format_for_frontend(question, quiz_name)
        
        if 'options' in question and question.get('answer') is not None:
            question_data['answers'] = [
                {'text': option, 'isCorrect': idx == question['answer']}
                for idx, option in enumerate(question['options'])
            ]
        else:
            # Fallback for malformed questions
            question_data['answers'] = [
                {'text': 'True', 'isCorrect': True},
                {'text': 'False', 'isCorrect': False}
            ]
            
        return question_data
