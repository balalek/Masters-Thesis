from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler
from bson import ObjectId
from typing import Optional
from ...models import QuestionMetadata

class BlindMapQuestionHandler(BaseQuestionHandler):
    """Handler for Blind Map type questions."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["BLIND_MAP"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """Validate blind map data is valid."""
        # Override base validation to skip question validation
        # since BlindMap doesn't require a "question" field
        if not question_data or question_data.get('type') != self.question_type:
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
            
        # Ensure anagram is specified
        if not question_data.get('anagram'):
            return False
            
        return True
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "city_name": question_data.get("cityName", ""),
            "anagram": question_data.get("anagram", ""),
            "location_x": question_data.get("locationX", 0),
            "location_y": question_data.get("locationY", 0),
            "map_type": question_data.get("mapType", "cz"),
            "radius_preset": question_data.get("radiusPreset", "HARD"),
            "clue1": question_data.get("clue1", ""),
            "clue2": question_data.get("clue2", ""),
            "clue3": question_data.get("clue3", "")
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """Format blind map question for frontend display."""
        # Safety check to avoid NoneType errors
        if not question:
            return {
                '_id': '',
                'question': 'Slepá mapa',  # Default title for frontend
                'type': self.question_type,
                'length': 30,
                'quizName': quiz_name,
                'timesPlayed': 0,
                'copy_of': None,
                'isMyQuestion': False,
                'cityName': '',
                'anagram': '',
                'locationX': 0,
                'locationY': 0,
                'mapType': 'cz',
                'radiusPreset': 'HARD',
                'clue1': '',
                'clue2': '',
                'clue3': ''
            }
        
        question_data = super().format_for_frontend(question, quiz_name)
        
        # Add the blind map specific fields
        question_data.update({
            'question': 'Slepá mapa',  # Default title for frontend
            'cityName': question.get('city_name', ''),
            'anagram': question.get('anagram', ''),
            'locationX': question.get('location_x', 0),
            'locationY': question.get('location_y', 0),
            'mapType': question.get('map_type', 'cz'),
            'radiusPreset': question.get('radius_preset', 'HARD'),
            'clue1': question.get('clue1', ''),
            'clue2': question.get('clue2', ''),
            'clue3': question.get('clue3', '')
        })
            
        # Format for display in the game
        question_data['answers'] = [
            {'text': f"Správné město: {question.get('city_name', '')}", 'isCorrect': True}
        ]
            
        return question_data
    
    def create_question_dict(self, question_data: Dict[str, Any], quiz_id: ObjectId, 
                           device_id: str, original: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create question dict without the question and category fields."""
        # Add additional safety check for question_data
        if not question_data:
            question_data = {}
        
        is_modified = question_data.get("modified", False)
        is_existing = original is not None
        
        question_dict = {
            "question": "Slepá mapa",  # Default title for storage
            "type": self.question_type,
            "length": question_data.get("timeLimit", question_data.get("length", 30)),
            "category": '',  # Add empty category field explicitly
            "part_of": quiz_id,
            "created_by": device_id,
            "copy_of": self._determine_copy_of(question_data, original, is_modified, is_existing),
            "metadata": QuestionMetadata().to_dict()
        }
        
        # Add type-specific fields
        question_dict.update(self.add_type_specific_fields(question_data))
        
        return question_dict
