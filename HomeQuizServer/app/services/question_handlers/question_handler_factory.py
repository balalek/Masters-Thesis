"""Factory implementation for creating question handlers.
Implements the Factory Method design pattern to instantiate
the appropriate handler based on question type without exposing
creation logic to client code.

Author: Bc. Martin Baláž
"""
from typing import Dict
from ...constants import QUESTION_TYPES
from .base_handler import BaseQuestionHandler
from .abcd_handler import AbcdQuestionHandler
from .true_false_handler import TrueFalseQuestionHandler
from .open_answer_handler import OpenAnswerQuestionHandler
from .guess_a_number_handler import GuessANumberQuestionHandler
from .math_quiz_handler import MathQuizQuestionHandler
from .word_chain_handler import WordChainQuestionHandler
from .drawing_handler import DrawingQuestionHandler
from .blind_map_handler import BlindMapQuestionHandler

class QuestionHandlerFactory:
    """
    Factory for creating the appropriate question handler based on question type.
    
    This class implements the Factory Method design pattern to provide the correct
    handler subclass for each question type. It maintains a registry of handlers
    and lazily initializes them on first use.
    
    Usage:
        - handler = QuestionHandlerFactory.get_handler(question["type"])
        - result = handler.validate(question_data)
    """
    
    _handlers: Dict[str, BaseQuestionHandler] = {}
    
    @classmethod
    def get_handler(cls, question_type: str) -> BaseQuestionHandler:
        """
        Get the appropriate handler for the question type.
        
        Uses lazy initialization to create handlers only when needed
        and caches them for future use.
        
        Args:
            question_type: The type identifier of the question
            
        Returns:
            BaseQuestionHandler: The handler for the specified question type
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
        """
        Initialize all question type handlers.
        
        Creates one instance of each handler type and stores them
        in the handler registry for future reuse.
        """
        cls._handlers = {
            QUESTION_TYPES["ABCD"]: AbcdQuestionHandler(),
            QUESTION_TYPES["TRUE_FALSE"]: TrueFalseQuestionHandler(),
            QUESTION_TYPES["OPEN_ANSWER"]: OpenAnswerQuestionHandler(),
            QUESTION_TYPES["GUESS_A_NUMBER"]: GuessANumberQuestionHandler(),
            QUESTION_TYPES["MATH_QUIZ"]: MathQuizQuestionHandler(),
            QUESTION_TYPES["WORD_CHAIN"]: WordChainQuestionHandler(),
            QUESTION_TYPES["DRAWING"]: DrawingQuestionHandler(),
            QUESTION_TYPES["BLIND_MAP"]: BlindMapQuestionHandler()
        }
