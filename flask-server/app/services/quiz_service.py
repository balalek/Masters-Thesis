from ..db import db
from ..models import Question, Quiz
from bson import ObjectId
from typing import List
from ..utils import convert_mongo_doc
from datetime import datetime
from ..constants import QUESTION_TYPES, QUIZ_TYPES

class QuizService:
    @staticmethod
    def create_quiz(name: str, questions: List[dict], quiz_type: str) -> ObjectId:
        # Validate quiz type
        if quiz_type not in QUIZ_TYPES.values():
            raise ValueError(f"Neplatný typ kvízu: {quiz_type}")
            
        # First, insert all questions and get their IDs
        question_ids = []
        for idx, q in enumerate(questions):
            # Validate question type
            question_type = q.get("type")
            if question_type not in QUESTION_TYPES.values():
                raise ValueError(f"Neplatný typ otázky: {question_type}")
                
            question = Question(
                question=q["question"],
                type=question_type,
                options=q["answers"],
                answer=q["correctAnswer"],
                length=q["timeLimit"],
                category=q["category"]
            )
            result = db.questions.insert_one(question.to_dict())
            question_ids.append({"questionId": result.inserted_id, "order": idx})

        # Create and insert the quiz with type and creation date
        quiz = Quiz(name=name, questions=question_ids, type=quiz_type)
        result = db.quizzes.insert_one(quiz.to_dict())
        return result.inserted_id

    @staticmethod
    def get_quiz(quiz_id: str) -> dict:
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            return None
        
        # Fetch all questions for this quiz
        questions = []
        for q in quiz["questions"]:
            question = db.questions.find_one({"_id": q["questionId"]})
            if question:
                questions.append({**question, "order": q["order"]})
        
        result = {**quiz, "questions": sorted(questions, key=lambda x: x["order"])}
        return convert_mongo_doc(result)
