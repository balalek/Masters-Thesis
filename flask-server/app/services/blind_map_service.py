from ..db import db
from typing import Dict, Any, List
from ..constants import QUIZ_VALIDATION
from bson import ObjectId

class BlindMapService:
    """Service for handling BlindMap gameplay and scoring."""
    
    @staticmethod
    def calculate_distance(x1: float, y1: float, x2: float, y2: float) -> float:
        """Calculate the Euclidean distance between two points on the map."""
        # Simple Euclidean distance in map coordinates
        return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5
    
    @staticmethod
    def check_location_guess(question_id: str, user_x: float, user_y: float) -> Dict[str, Any]:
        """Check if a location guess is within the correct radius."""
        # Get the question
        question = db.questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            return {"correct": False, "message": "Otázka nenalezena", "correctLocation": {"x": 0, "y": 0}}
        
        # Get the correct location
        correct_x = question.get("location_x", 0)
        correct_y = question.get("location_y", 0)
        
        # Get the radius preset
        radius_preset = question.get("radius_preset", "HARD")
        
        # Calculate distance
        distance = BlindMapService.calculate_distance(user_x, user_y, correct_x, correct_y)
        
        # Get the presets
        presets = QUIZ_VALIDATION["BLIND_MAP_RADIUS_PRESETS"]
        
        # Check if within radius
        exact_radius = presets[radius_preset]["exact"]
        if distance <= exact_radius:
            return {
                "correct": True,
                "message": "Přesné umístění!",
                "correctLocation": {"x": correct_x, "y": correct_y}
            }
        
        # For EASY mode, check area hit
        if radius_preset == "EASY" and "area" in presets["EASY"]:
            area_radius = presets["EASY"]["area"]
            if distance <= area_radius:
                # Calculate score based on distance within area
                score = int(100 - ((distance - exact_radius) / (area_radius - exact_radius)) * 50)
                return {
                    "score": max(50, score),  # At least 50 points for being in the area
                    "correct": True,
                    "message": "Blízko správného umístění!",
                    "correctLocation": {"x": correct_x, "y": correct_y}
                }
        
        # No score
        return {
            "correct": False,
            "message": "Špatné umístění",
            "correctLocation": {"x": correct_x, "y": correct_y}
        }
