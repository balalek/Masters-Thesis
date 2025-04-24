"""Handler for ABCD (multiple choice) questions in the quiz application.

Provides validation, formatting, and processing logic specific to 
multiple choice question types.
"""
from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class AbcdQuestionHandler(BaseQuestionHandler):
    """
    Handler for ABCD (multiple choice) questions.
    
    Handles validation and formatting of multiple choice questions
    where users select one correct answer from several options.
    
    Supports both 'answers'/'correctAnswer' and 'options'/'answer' field naming
    conventions for compatibility with different frontend implementations.
    """
    
    def __init__(self):
        """
        Initialize the ABCD question handler.
        
        Sets the question type to ABCD from constants and inherits base
        validation functionality from the parent class.
        """
        super().__init__(QUESTION_TYPES["ABCD"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate that a question meets ABCD format requirements.
        
        Performs base validation first, then checks ABCD-specific requirements:
        
        - Must have more than one option/answer
        - Must specify which option/answer is correct
        
        Args:
            question_data: Dictionary containing question data
            
        Returns:
            bool: True if the question is valid, False otherwise
        """
        if not super().validate(question_data):
            return False
        
        # ABCD specific validation
        options = question_data.get('answers', question_data.get('options', []))
        return (len(options) > 1 and 
                ('correctAnswer' in question_data or 'answer' in question_data))
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add or transform fields specific to ABCD questions.
        
        Standardizes field names to 'options' and 'answer' regardless of 
        which naming convention was used in the input.
        
        Args:
            question_data: Dictionary containing raw question data
            
        Returns:
            dict: Dictionary with standardized ABCD fields
        """
        return {
            "options": question_data.get("answers", question_data.get("options")),
            "answer": question_data.get("correctAnswer", question_data.get("answer"))
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format an ABCD question for frontend display.
        
        Transforms the database storage format into the format expected by the frontend,
        including creating an array of answer objects with 'text' and 'isCorrect' properties.
        
        Args:
            question: Dictionary containing question data from database
            quiz_name: Name of the quiz containing this question
            
        Returns:
            dict: Question formatted for frontend display with answers array
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
                {'text': 'Missing options', 'isCorrect': True}
            ]
            
        return question_data