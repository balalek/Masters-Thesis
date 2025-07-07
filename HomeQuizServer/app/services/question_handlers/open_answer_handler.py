"""Handler for Open Answer type questions in the quiz application.
Processes questions where players must provide a free-text answer
that is checked against the expected response. Supports media
attachments like images and audio.

Author: Bc. Martin Baláž
"""
from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class OpenAnswerQuestionHandler(BaseQuestionHandler):
    """
    Handler for open answer type questions.
    
    Processes questions where users provide free-text answers that are matched
    against expected responses. These questions can include optional media
    attachments (images or audio) and special display options like gradual
    image reveal for progressive hints.
    """
    
    def __init__(self):
        """Initialize the handler with the OPEN_ANSWER question type."""
        super().__init__(QUESTION_TYPES["OPEN_ANSWER"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate that the open answer question has the required fields.
        
        Performs standard question validation plus checks that:

        - An expected answer is provided (under 'answer' or 'open_answer' key)
        
        Args:
            question_data: Raw question data to validate
            
        Returns:
            bool: True if the question contains a valid open answer
        """
        if not super().validate(question_data):
            return False
        
        # Open answer specific validation
        return 'answer' in question_data or 'open_answer' in question_data
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract fields specific to open answer questions.
        
        Processes:

        - The expected correct answer
        - Media attachments (type and URL)
        - Special display options like gradual image reveal
        
        Args:
            question_data: Raw question data from frontend
            
        Returns:
            Dict: Dictionary with open answer specific fields
        """
        return {
            "open_answer": question_data.get("answer", question_data.get("open_answer", "")),
            "media_type": question_data.get("mediaType"),
            "media_url": question_data.get("mediaUrl"),
            "show_image_gradually": question_data.get("showImageGradually", False)
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """
        Format open answer question for frontend display.
        
        Adds open answer specific fields to the standard question format:
        
        - Correct answer text for display
        - Media content type and URL
        - Display options like gradual reveal
        
        Args:
            question: Database question document
            quiz_name: Name of the parent quiz
            
        Returns:
            Dict: Formatted question with open answer information
        """
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