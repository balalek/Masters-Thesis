from typing import Dict, Any
from ...constants import QUESTION_TYPES, QUIZ_VALIDATION
from .base_handler import BaseQuestionHandler
from bson import ObjectId
from typing import Optional
from ...models import QuestionMetadata

class DrawingQuestionHandler(BaseQuestionHandler):
    """Handler for Drawing type questions."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["DRAWING"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """Validate that the drawing data is valid."""
        # Override base validation to skip question validation 
        # since Drawing doesn't use a "question" field
        if not question_data or question_data.get('type') != self.question_type:
            return False
        
        # Drawing specific validation
        length = question_data.get('length', question_data.get('length', QUIZ_VALIDATION['DRAWING_DEFAULT_TIME']))
        rounds = question_data.get('rounds', QUIZ_VALIDATION['DRAWING_DEFAULT_ROUNDS'])
        
        # Validate time limit
        if (length < QUIZ_VALIDATION['DRAWING_MIN_TIME'] or 
            length > QUIZ_VALIDATION['DRAWING_MAX_TIME']):
            return False
            
        # Validate rounds
        if (rounds < QUIZ_VALIDATION['DRAWING_MIN_ROUNDS'] or 
            rounds > QUIZ_VALIDATION['DRAWING_MAX_ROUNDS']):
            return False
            
        return True
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add fields specific to drawing questions."""
        return {
            "length": question_data.get("length", question_data.get("length", QUIZ_VALIDATION["DRAWING_DEFAULT_TIME"])),
            "rounds": question_data.get("rounds", QUIZ_VALIDATION["DRAWING_DEFAULT_ROUNDS"])
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """Format drawing question for frontend display."""
        # Safety check to avoid NoneType errors
        if not question:
            return {
                '_id': '',
                'question': 'Kreslení',  # Default title
                'type': self.question_type,
                'length': QUIZ_VALIDATION["DRAWING_DEFAULT_TIME"],
                'rounds': QUIZ_VALIDATION["DRAWING_DEFAULT_ROUNDS"],
                'quizName': quiz_name,
                'timesPlayed': 0,
                'copy_of': None,
                'isMyQuestion': False,
                'answers': [{'text': 'Hra kreslení - hádání', 'isCorrect': True}]
            }
        
        # Customize for drawing questions that don't have a question field
        question_data = {
            '_id': str(question.get('_id', '')),
            'question': 'Kreslení',  # Default title
            'type': question.get('type', self.question_type),
            'length': question.get('length', QUIZ_VALIDATION["DRAWING_DEFAULT_TIME"]),
            'rounds': question.get('rounds', QUIZ_VALIDATION["DRAWING_DEFAULT_ROUNDS"]),
            'quizName': quiz_name,
            'timesPlayed': question.get('metadata', {}).get('timesUsed', 0) if question.get('metadata') else 0,
            'copy_of': str(question['copy_of']) if question.get('copy_of') else None,
            'isMyQuestion': False
        }
            
        return question_data
    
    def create_question_dict(self, question_data: Dict[str, Any], quiz_id: ObjectId, 
                           device_id: str, original: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create question dict without the question field."""
        # Add additional safety check for question_data
        if not question_data:
            question_data = {}
        
        is_modified = question_data.get("modified", False)
        is_existing = original is not None
        
        question_dict = {
            "type": self.question_type,
            "part_of": quiz_id,
            "created_by": device_id,
            "copy_of": self._determine_copy_of(question_data, original, is_modified, is_existing),
            "metadata": QuestionMetadata().to_dict()
        }
        
        # Add type-specific fields
        question_dict.update(self.add_type_specific_fields(question_data))
        
        return question_dict
