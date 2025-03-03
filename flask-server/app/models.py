from bson import ObjectId
from typing import List, Optional
from datetime import datetime

class QuestionMetadata:
    def __init__(self, times_used: int = 0, average_correct_rate: float = 0.0):
        self.times_used = times_used
        self.average_correct_rate = average_correct_rate

    def to_dict(self):
        return {
            "timesUsed": self.times_used,
            "averageCorrectRate": self.average_correct_rate
        }

class Question:
    def __init__(
        self,
        question: str,
        type: str,
        options: List[str],
        answer: int,
        length: int,
        category: str,
        part_of: Optional[ObjectId] = None,  # Add part_of parameter to store quiz ID
        created_by: Optional[str] = None,  # Add created_by parameter to store device ID
        copy_of: Optional[ObjectId] = None,  # Add copy_of parameter to reference original question
        metadata: Optional[QuestionMetadata] = None,
        _id: Optional[ObjectId] = None
    ):
        self._id = _id or ObjectId()
        self.question = question
        self.type = type
        self.options = options
        self.answer = answer
        self.length = length
        self.category = category
        self.part_of = part_of  # Store the ObjectId of the quiz this question belongs to
        self.created_by = created_by  # Store the device ID that created this question
        self.copy_of = copy_of  # Store the ObjectId of the original question this is a copy of
        self.metadata = metadata or QuestionMetadata()

    def to_dict(self):
        return {
            "_id": self._id,
            "question": self.question,
            "type": self.type,
            "options": self.options,
            "answer": self.answer,
            "length": self.length,
            "category": self.category,
            "part_of": self.part_of,  # Include part_of in the dictionary
            "created_by": self.created_by,  # Include created_by in the dictionary
            "copy_of": self.copy_of,  # Include copy_of in the dictionary
            "metadata": self.metadata.to_dict()
        }

class Quiz:
    def __init__(
        self,
        name: str,
        questions: List[dict],
        type: str,
        is_public: bool = False,  # Add is_public parameter with default False
        created_by: Optional[str] = None,  # Add created_by parameter to store device ID
        _id: Optional[ObjectId] = None,
        creation_date: Optional[datetime] = None
    ):
        self._id = _id or ObjectId()
        self.name = name
        self.questions = questions  # List of {"questionId": ObjectId, "order": int}
        self.type = type
        self.is_public = is_public  # Store is_public attribute
        self.created_by = created_by  # Store the device ID that created this quiz
        self.creation_date = creation_date or datetime.now()

    def to_dict(self):
        return {
            "_id": self._id,
            "name": self.name,
            "questions": self.questions,
            "type": self.type,
            "is_public": self.is_public,  # Include is_public in dictionary
            "created_by": self.created_by,  # Include created_by in dictionary
            "creation_date": self.creation_date
        }
