from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class OpenAnswerQuestionHandler(BaseQuestionHandler):
    """Handler for open answer type questions."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["OPEN_ANSWER"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        if not super().validate(question_data):
            return False
        
        # Open answer specific validation
        return 'answer' in question_data or 'open_answer' in question_data
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "open_answer": question_data.get("answer", question_data.get("open_answer", "")),
            "media_type": question_data.get("mediaType"),
            "media_url": question_data.get("mediaUrl"),
            "show_image_gradually": question_data.get("showImageGradually", False)
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        question_data = super().format_for_frontend(question, quiz_name)
        
        open_answer = question.get('open_answer', '')
        if not open_answer and 'answer' in question:
            open_answer = question.get('answer', '')
            
        question_data['answers'] = [
            {'text': f"Správná odpověď: {open_answer}", 'isCorrect': True}
        ]
        question_data['open_answer'] = open_answer
        
        # Add media fields if they exist
        if 'media_type' in question:
            question_data['media_type'] = question['media_type']
        if 'media_url' in question:
            question_data['media_url'] = question['media_url']
        if 'show_image_gradually' in question:
            question_data['show_image_gradually'] = question['show_image_gradually']
            
        return question_data
