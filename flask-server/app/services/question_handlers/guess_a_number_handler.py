from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class GuessANumberQuestionHandler(BaseQuestionHandler):
    """Handler for Guess A Number type questions."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["GUESS_A_NUMBER"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        if not super().validate(question_data):
            return False
        
        # Guess A Number specific validation
        answer = question_data.get('answer', question_data.get('number_answer', None))
        
        # Check if answer exists and is a number
        return answer is not None and (isinstance(answer, (int, float)) or 
                                      (isinstance(answer, str) and answer.replace('.', '', 1).isdigit()))
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
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
