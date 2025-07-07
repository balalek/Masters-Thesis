"""Handler for Guess A Number type questions in the quiz application.
Manages questions where players must guess a specific numeric value,
with validation and scoring based on how close their answers are
to the target number.

Author: Bc. Martin Baláž
"""
from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class GuessANumberQuestionHandler(BaseQuestionHandler):
    """
    Handler for Guess A Number type questions.
    
    Processes questions where players submit numeric guesses trying to match
    or get close to a specific target number. Includes specialized validation
    to ensure the target answer is a valid number and handles type conversion
    between string representations and numeric values.
    """
    
    def __init__(self):
        """Initialize the handler with the GUESS_A_NUMBER question type."""
        super().__init__(QUESTION_TYPES["GUESS_A_NUMBER"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate that the guess-a-number question has a valid numeric answer.
        
        Performs standard question validation plus checks that:
        
        - An answer value exists
        - The answer is a valid number (int, float, or numeric string)
        
        Args:
            question_data: Raw question data to validate
            
        Returns:
            bool: True if the question has a valid numeric answer
        """
        if not super().validate(question_data):
            return False
        
        # Guess A Number specific validation
        answer = question_data.get('answer', question_data.get('number_answer', None))
        
        # Check if answer exists and is a number
        return answer is not None and (isinstance(answer, (int, float)) or 
                                      (isinstance(answer, str) and answer.replace('.', '', 1).isdigit()))
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the numeric answer field for storage.
        
        Handles type conversion to ensure the answer is stored as a proper
        numeric value (int for whole numbers, float for decimals).
        
        Args:
            question_data: Raw question data from frontend
            
        Returns:
            Dict: Dictionary containing the properly formatted numeric answer
        """
        # Get the answer, ensuring it's stored as a number
        answer = question_data.get('answer', question_data.get('number_answer', 0))
        if isinstance(answer, str):
            try:
                # Convert to int if it's a whole number, otherwise float
                answer = int(answer) if answer.isdigit() else float(answer)

            except ValueError:
                answer = 0
                
        return {
            "number_answer": answer
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format guess-a-number question for frontend display.
        
        Adds the numeric answer to the standard question format and
        generates a display-friendly answer representation for the UI.
        
        Args:
            question: Database question document
            quiz_name: Name of the parent quiz for display
            
        Returns:
            Dict: Formatted question with numeric answer information
        """
        question_data = super().format_for_frontend(question, quiz_name)
        
        number_answer = question.get('number_answer', 0)
        if not number_answer and 'answer' in question:
            number_answer = question.get('answer', 0)
            
        question_data['number_answer'] = number_answer
        
        # Format for display in the game
        question_data['answers'] = [
            {'text': f"Správná odpověď: {number_answer}", 'isCorrect': True}
        ]
            
        return question_data