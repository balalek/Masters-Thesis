from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class TrueFalseQuestionHandler(BaseQuestionHandler):
    """Handler for True/False type questions."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["TRUE_FALSE"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        if not super().validate(question_data):
            return False
        
        # True/False specific validation
        options = question_data.get('answers', question_data.get('options', []))
        return (len(options) == 2 and 
                ('correctAnswer' in question_data or 'answer' in question_data))
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "options": question_data.get("answers", question_data.get("options")),
            "answer": question_data.get("correctAnswer", question_data.get("answer"))
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
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
