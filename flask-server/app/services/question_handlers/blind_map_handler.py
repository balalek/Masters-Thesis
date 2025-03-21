from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler

class BlindMapQuestionHandler(BaseQuestionHandler):
    """Handler for Blind Map type questions."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["BLIND_MAP"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        if not super().validate(question_data):
            return False
        
        # Blind Map specific validation
        # Check if location data exists
        if not question_data.get('locationX') or not question_data.get('locationY'):
            return False
            
        # Ensure map type is specified
        if not question_data.get('mapType'):
            return False
            
        # Ensure the city name is specified
        if not question_data.get('cityName'):
            return False
            
        return True
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "city_name": question_data.get("cityName", ""),
            "anagram": question_data.get("anagram", ""),
            "location_x": question_data.get("locationX", 0),
            "location_y": question_data.get("locationY", 0),
            "map_type": question_data.get("mapType", "cz"),
            "clue1": question_data.get("clue1", ""),
            "clue2": question_data.get("clue2", ""),
            "clue3": question_data.get("clue3", "")
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        question_data = super().format_for_frontend(question, quiz_name)
        
        # Add the blind map specific fields
        question_data.update({
            'cityName': question.get('city_name', ''),
            'anagram': question.get('anagram', ''),
            'locationX': question.get('location_x', 0),
            'locationY': question.get('location_y', 0),
            'mapType': question.get('map_type', 'cz'),
            'clue1': question.get('clue1', ''),
            'clue2': question.get('clue2', ''),
            'clue3': question.get('clue3', '')
        })
            
        # Format for display in the game
        question_data['answers'] = [
            {'text': f"Správné město: {question.get('city_name', '')}", 'isCorrect': True}
        ]
            
        return question_data
