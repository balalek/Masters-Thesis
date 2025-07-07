"""Handler for Blind Map questions in the quiz application.
Provides specialized validation, formatting and processing
for geography questions where users identify locations on maps.

Author: Bc. Martin Baláž
"""
from typing import Dict, Any
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler
from bson import ObjectId
from typing import Optional
from ...models import QuestionMetadata

class BlindMapQuestionHandler(BaseQuestionHandler):
    """
    Handler for Blind Map type questions.
    
    Processes geography questions where users must identify cities
    on a map from clues or anagrams. Implements specific validation for map
    coordinates, city names, and related properties.
    """
    
    def __init__(self):
        """Initialize the handler with the BLIND_MAP question type."""
        super().__init__(QUESTION_TYPES["BLIND_MAP"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """
        Validate blind map question data.
        
        Different from standard questions, Blind Map questions don't require
        a "question" field but instead need specific geographic data.
        
        Args:
            question_data: The question data to validate
            
        Returns:
            bool: True if the data contains valid blind map information
        """
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
        """
        Add fields specific to Blind Map questions.
        
        Extracts geographic data including coordinates, city name,
        anagram clues, map type, and difficulty settings.
        
        Args:
            question_data: Raw question data from the frontend
            
        Returns:
            Dict: Dictionary with blind map specific fields
        """
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
        """
        Format blind map question for frontend display.
        
        Transforms database field names to frontend field names and adds
        a default question title and generated answer object for display.
        
        Args:
            question: Database question document
            quiz_name: Name of the parent quiz
            
        Returns:
            Dict: Formatted blind map question for frontend display
        """
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
            'question': 'Slepá mapa',
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
        """
        Create question dictionary for a Blind Map question.
        
        Overrides the base method to provide a default question title
        and handle the special field structure of blind map questions.
        
        Args:
            question_data: Raw question data from frontend
            quiz_id: MongoDB ObjectId of the parent quiz
            device_id: Device identifier of the creator/editor
            original: Original question document if this is an update
            
        Returns:
            Dict: Processed blind map question ready for database storage
        """
        if not question_data:
            question_data = {}
        
        is_modified = question_data.get("modified", False)
        is_existing = original is not None
        
        question_dict = {
            "question": "Slepá mapa",
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
