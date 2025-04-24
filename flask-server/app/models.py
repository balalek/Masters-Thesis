"""Data models for the quiz application.

This module defines the core data structures used throughout the application:

- QuestionMetadata: Tracks usage and performance metrics for questions
- Question: Represents quiz questions of various types with type-specific fields
- Quiz: Represents collections of questions with metadata

These models provide consistent structure for data storage and retrieval,
with methods to convert between Python objects and MongoDB documents.
"""
from bson import ObjectId
from typing import List, Optional, Dict, Any
from datetime import datetime
from .constants import QUESTION_TYPES, QUIZ_VALIDATION

class QuestionMetadata:
    """
    Metadata associated with a quiz question.
    
    Tracks usage statistics and performance metrics for questions,
    allowing for analytics and personalized content.
    """
    def __init__(self, times_used: int = 0, average_correct_rate: float = 0.0):
        """
        Initialize question metadata with usage statistics.
        
        Args:
            times_used: Counter for how many times this question has been used in quizzes
            average_correct_rate: Average percentage of players who answered correctly
        """
        self.times_used = times_used
        self.average_correct_rate = average_correct_rate

    def to_dict(self):
        """
        Convert metadata to a dictionary for MongoDB storage.
        
        Returns:
            dict: MongoDB-compatible document representation with camelCase keys for frontend compatibility
        """
        return {
            "timesUsed": self.times_used,
            "averageCorrectRate": self.average_correct_rate
        }

class Question:
    """
    Core question model supporting multiple question types.
    
    Represents a quiz question with type-specific fields and behavior.
    Handles various question formats including:

    - ABCD (multiple choice)
    - True/False 
    - Open answers (with optional media)
    - Numeric guessing
    - Math equations
    - Blind map (geography)
    - Drawing and word chain game formats
    
    Each question stores both content and metadata including question content,
    performance tracking, ownership information, and type-specific configuration.
    """
    def __init__(
        self,
        question: str,
        type: str,
        options: List[str] = None,
        answer: int = None,
        length: int = QUIZ_VALIDATION["TIME_LIMIT_DEFAULT"],
        category: str = None,
        part_of: Optional[ObjectId] = None,
        created_by: Optional[str] = None,
        copy_of: Optional[ObjectId] = None, 
        metadata: Optional[QuestionMetadata] = None,
        _id: Optional[ObjectId] = None,
        # Fields for open answers
        open_answer: Optional[str] = None,
        media_type: Optional[str] = None,
        media_url: Optional[str] = None,
        show_image_gradually: bool = False,
        # Field for guess a number
        number_answer: Optional[float] = None,
        # Fields for math quiz
        sequences: Optional[List[Dict[str, Any]]] = None,
        # Fields for blind map
        city_name: Optional[str] = None,
        anagram: Optional[str] = None,
        location_x: Optional[float] = None,
        location_y: Optional[float] = None,
        map_type: Optional[str] = None,
        radius_preset: Optional[str] = None,
        clue1: Optional[str] = None,
        clue2: Optional[str] = None,
        clue3: Optional[str] = None
    ):
        """
        Initialize a Question object with type-specific fields.
        
        Args:
            _id: Unique MongoDB ObjectId
            question: The question text
            type: Question type identifier from QUESTION_TYPES
            options: List of answer options for multiple choice questions -> optional
            answer: Index of correct answer or correct value -> optional
            length: Time limit for the question in seconds
            category: Subject category for the question
            part_of: Reference to parent quiz
            created_by: Device identifier of creator
            copy_of: Reference to original question if this is a copy
            metadata: Usage and performance statistics
            
            # Type-specific parameters:
            open_answer: Correct text answer for open questions
            media_type: Type of attached media ('image' or 'audio')
            media_url: URL to the media resource
            show_image_gradually: Whether to reveal image progressively
            number_answer: Correct numeric answer for guess-a-number
            sequences: List of equation sequences with answers
            city_name: Name of the city to locate
            anagram: Scrambled version of city name
            location_x: X coordinate on the map
            location_y: Y coordinate on the map
            map_type: Map identifier (e.g., 'cz', 'world')
            radius_preset: Difficulty setting for scoring radius
            clue1: First progressive hint for the location
            clue2: Second progressive hint for the location
            clue3: Third progressive hint for the location
        """
        self._id = _id or ObjectId()
        self.question = question
        self.type = type
        self.options = options
        self.answer = answer
        self.open_answer = open_answer
        self.length = length
        self.category = category
        self.part_of = part_of
        self.created_by = created_by
        self.copy_of = copy_of
        self.metadata = metadata or QuestionMetadata()
        # Media fields
        self.media_type = media_type
        self.media_url = media_url
        self.show_image_gradually = show_image_gradually
        # Guess a number field
        self.number_answer = number_answer
        # Math quiz fields
        self.sequences = sequences or []
        # Blind map fields
        self.city_name = city_name
        self.anagram = anagram
        self.location_x = location_x
        self.location_y = location_y
        self.map_type = map_type
        self.radius_preset = radius_preset
        self.clue1 = clue1
        self.clue2 = clue2
        self.clue3 = clue3

    def to_dict(self):
        """
        Convert the Question object to a dictionary for MongoDB storage.
        
        Creates a type-specific representation with only the relevant fields
        for the question's type, ensuring efficient storage.
        
        Returns:
            dict: MongoDB-compatible document representation
        """
        base_dict = {
            "_id": self._id,
            "question": self.question,
            "type": self.type,
            "length": self.length,
            "category": self.category,
            "part_of": self.part_of,
            "created_by": self.created_by,
            "copy_of": self.copy_of,
            "metadata": self.metadata.to_dict()
        }
        
        # Type-specific fields
        if self.type in [QUESTION_TYPES["ABCD"], QUESTION_TYPES["TRUE_FALSE"]]:
            base_dict.update({
                "options": self.options,
                "answer": self.answer
            })
        elif self.type == QUESTION_TYPES["OPEN_ANSWER"]:
            base_dict.update({
                "open_answer": self.open_answer,
                "media_type": self.media_type,
                "media_url": self.media_url,
                "show_image_gradually": self.show_image_gradually
            })
        elif self.type == QUESTION_TYPES["GUESS_A_NUMBER"]:
            base_dict.update({
                "number_answer": self.number_answer
            })
        elif self.type == QUESTION_TYPES["MATH_QUIZ"]:
            base_dict.update({
                "sequences": self.sequences
            })
        elif self.type == QUESTION_TYPES["BLIND_MAP"]:
            base_dict.update({
                "city_name": self.city_name,
                "anagram": self.anagram,
                "location_x": self.location_x,
                "location_y": self.location_y,
                "map_type": self.map_type,
                "radius_preset": self.radius_preset, 
                "clue1": self.clue1,
                "clue2": self.clue2,
                "clue3": self.clue3
            })
            
        return base_dict

class Quiz:
    """
    Quiz collection model representing a complete quiz activity.
    
    Groups multiple questions into a playable quiz with metadata
    about ownership, visibility, and organization.
    """
    def __init__(
        self,
        name: str,
        questions: List[dict],
        type: str,
        is_public: bool = False,
        created_by: Optional[str] = None,
        _id: Optional[ObjectId] = None,
        creation_date: Optional[datetime] = None
    ):
        """
        Initialize a Quiz object.
        
        Args:
            _id: Unique MongoDB ObjectId
            name: Title of the quiz
            questions: List of question references with ordering information 
                     (each dict contains {'questionId': ObjectId, 'order': int})
            type: Quiz format type
            is_public: Whether the quiz is publicly available to other users
            created_by: Device identifier of creator
            creation_date: Timestamp of quiz creation
        """
        self._id = _id or ObjectId()
        self.name = name
        self.questions = questions
        self.type = type
        self.is_public = is_public
        self.created_by = created_by
        self.creation_date = creation_date or datetime.now()

    def to_dict(self):
        """
        Convert the Quiz object to a dictionary for MongoDB storage.
        
        Returns:
            dict: MongoDB-compatible document representation
        """
        return {
            "_id": self._id,
            "name": self.name,
            "questions": self.questions,
            "type": self.type,
            "is_public": self.is_public, 
            "created_by": self.created_by,
            "creation_date": self.creation_date
        }