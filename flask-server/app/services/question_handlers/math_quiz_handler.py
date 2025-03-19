from typing import Dict, Any, List
from ...constants import QUESTION_TYPES, QUIZ_VALIDATION
from .base_handler import BaseQuestionHandler
from ...models import QuestionMetadata
from bson import ObjectId
from typing import Optional

class MathQuizQuestionHandler(BaseQuestionHandler):
    """Handler for Math Quiz type questions (sequences of equations)."""
    
    def __init__(self):
        super().__init__(QUESTION_TYPES["MATH_QUIZ"])
    
    def validate(self, question_data: Dict[str, Any]) -> bool:
        """Validate that the math quiz question data is valid."""
        # Override base validation to skip question validation
        # Only verify type is correct
        if not question_data or question_data.get('type') != self.question_type:
            return False
        
        # Math Quiz specific validation
        sequences = question_data.get('sequences', [])
        
        # Check if sequences are present
        if not sequences or not isinstance(sequences, list):
            return False
            
        # Check if each sequence has valid equations and answers
        for sequence in sequences:
            if not sequence or not isinstance(sequence, dict):
                return False
                
            equation = sequence.get('equation')
            answer = sequence.get('answer')
            
            # Both equation and answer must be present
            if not equation or answer is None:
                return False
                
            # Answer must be a number (int or float)
            if not isinstance(answer, (int, float)) and not (
                isinstance(answer, str) and self._is_valid_number(answer)
            ):
                return False
                
        return True
    
    def add_type_specific_fields(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add fields specific to math quiz questions."""
        # Process sequences with normalized answers and ensure each has a length
        sequences = []
        if question_data and isinstance(question_data.get('sequences'), list):
            for sequence in question_data.get('sequences', []):
                if not sequence or not isinstance(sequence, dict):
                    continue
                    
                answer = sequence.get('answer')
                # Convert string answers to numbers
                if isinstance(answer, str):
                    answer = self._normalize_number(answer)
                    
                sequences.append({
                    'equation': sequence.get('equation', ''),
                    'answer': answer,
                    'length': sequence.get('length', QUIZ_VALIDATION["TIME_LIMIT_DEFAULT_MATH"])
                })
                
        return {
            "sequences": sequences
        }
    
    def format_for_frontend(self, question: Dict[str, Any], quiz_name: str = "Unknown Quiz") -> Dict[str, Any]:
        """Format math quiz question for frontend display."""
        # Safety check to avoid NoneType errors
        if not question:
            return {
                '_id': '',
                'question': 'Matematické rovnice',
                'type': self.question_type,
                'category': '',
                'length': '',
                'timeLimit': '',
                'quizName': quiz_name,
                'timesPlayed': 0,
                'copy_of': None,
                'isMyQuestion': False,
                'sequences': [],
                'answers': [{'text': 'No equations defined', 'isCorrect': True}]
            }
        
        # Customize the base implementation for math quiz questions that don't have a question field
        question_data = {
            '_id': str(question.get('_id', '')),
            'question': 'Matematické rovnice',  # Default title for math sequences
            'type': question.get('type', self.question_type),
            'category': question.get('category', ''),
            'length': question.get('length', ''),
            'timeLimit': question.get('length', ''),
            'quizName': quiz_name,
            'timesPlayed': question.get('metadata', {}).get('timesUsed', 0) if question.get('metadata') else 0,
            'copy_of': str(question['copy_of']) if question.get('copy_of') else None,
            'isMyQuestion': False
        }
        
        sequences = question.get('sequences', [])
        # Ensure sequences is always a list
        if not isinstance(sequences, list):
            sequences = []
            
        question_data['sequences'] = sequences
        
        # Format for display in the game
        # Create answers for display in existing questions dialog
        answers = []
        for sequence in sequences:
            if not sequence or not isinstance(sequence, dict):
                continue
                
            answers.append({
                'text': f"{sequence.get('equation', '')} = {sequence.get('answer', '')} ({sequence.get('length', QUIZ_VALIDATION['TIME_LIMIT_DEFAULT_MATH'])}s)",
                'isCorrect': True
            })
            
        if not answers:
            answers = [{'text': 'No equations defined', 'isCorrect': True}]
            
        question_data['answers'] = answers
            
        return question_data
    
    def create_question_dict(self, question_data: Dict[str, Any], quiz_id: ObjectId, 
                           device_id: str, original: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create question dict without the question field and category fields."""
        # Add additional safety check for question_data
        if not question_data:
            question_data = {'sequences': []}
        
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

    def _is_valid_number(self, value: str) -> bool:
        """Check if a string represents a valid number (supports both '.' and ',' as decimal separator)."""
        # Safety check
        if not value or not isinstance(value, str):
            return False
            
        # Replace comma with dot for decimal numbers
        value = value.replace(',', '.')
        try:
            float(value)
            return True
        except (ValueError, TypeError):
            return False
    
    def _normalize_number(self, value: str) -> float:
        """Convert string to number, supporting both '.' and ',' as decimal separator."""
        # Safety check
        if not value or not isinstance(value, str):
            return 0.0
            
        value = value.replace(',', '.')
        try:
            # Convert to int if it's a whole number, otherwise float
            return int(value) if value.isdigit() else float(value)
        except (ValueError, TypeError):
            return 0.0
