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
            "metadata": self.metadata.to_dict()
        }

class Quiz:
    def __init__(
        self,
        name: str,
        questions: List[dict],
        type: str,
        _id: Optional[ObjectId] = None,
        creation_date: Optional[datetime] = None
    ):
        self._id = _id or ObjectId()
        self.name = name
        self.questions = questions  # List of {"questionId": ObjectId, "order": int}
        self.type = type
        self.creation_date = creation_date or datetime.now()

    def to_dict(self):
        return {
            "_id": self._id,
            "name": self.name,
            "questions": self.questions,
            "type": self.type,
            "creation_date": self.creation_date
        }
