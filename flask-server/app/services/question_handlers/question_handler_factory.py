from typing import Dict
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler
from .abcd_handler import AbcdQuestionHandler
from .true_false_handler import TrueFalseQuestionHandler
from .open_answer_handler import OpenAnswerQuestionHandler
from .guess_a_number_handler import GuessANumberQuestionHandler
from .math_quiz_handler import MathQuizQuestionHandler

class QuestionHandlerFactory:
    """Factory for creating the appropriate question handler based on question type."""
    
    _handlers: Dict[str, BaseQuestionHandler] = {}
    
    @classmethod
    def get_handler(cls, question_type: str) -> BaseQuestionHandler:
        """
        Get the appropriate handler for the question type.
        
        Args:
            question_type: The type of question to handle
            
        Returns:
            BaseQuestionHandler: The handler for the specified question type
            
        Raises:
            ValueError: If the question type is not supported
        """
        if not cls._handlers:
            # Initialize handlers if not already done
            cls._initialize_handlers()
            
        if question_type not in cls._handlers:
            # Return a BaseQuestionHandler for unsupported types
            return BaseQuestionHandler(question_type)
            
        return cls._handlers[question_type]
    
    @classmethod
    def _initialize_handlers(cls) -> None:
        """Initialize all question type handlers."""
        cls._handlers = {
            QUESTION_TYPES["ABCD"]: AbcdQuestionHandler(),
            QUESTION_TYPES["TRUE_FALSE"]: TrueFalseQuestionHandler(),
            QUESTION_TYPES["OPEN_ANSWER"]: OpenAnswerQuestionHandler(),
            QUESTION_TYPES["GUESS_A_NUMBER"]: GuessANumberQuestionHandler(),
            QUESTION_TYPES["MATH_QUIZ"]: MathQuizQuestionHandler(),
            # TODO: Add handlers for other question types as they are implemented
            # QUESTION_TYPES["BLIND_MAP"]: BlindMapQuestionHandler(),
            # QUESTION_TYPES["DRAWING"]: DrawingQuestionHandler(),
        }
