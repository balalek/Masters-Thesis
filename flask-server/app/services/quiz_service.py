from ..db import db
from ..models import Question, Quiz
from bson import ObjectId
from typing import List
from ..utils import convert_mongo_doc

class QuizService:
    @staticmethod
    def quiz_name_exists(name):
        return db.quizzes.find_one({"name": name}) is not None

    @staticmethod
    def create_quiz(name: str, questions: List[dict]) -> ObjectId:
        if QuizService.quiz_name_exists(name):
            # Check if the name already ends with a number in parentheses
            import re
            base_name = re.sub(r' \(\d+\)$', '', name)
            
            # Find all existing quizzes with this base name
            existing_names = list(db.quizzes.find(
                {"name": {"$regex": f"^{re.escape(base_name)}(?: \(\d+\))?$"}}
            ))
            
            # Extract existing numbers
            numbers = [1]  # Start with 1 as a default
            for existing in existing_names:
                match = re.search(r'\((\d+)\)$', existing['name'])
                if match:
                    numbers.append(int(match.group(1)))
            
            # Get the next available number
            next_number = max(numbers) + 1
            suggested_name = f"{base_name} ({next_number})"
            
            raise ValueError(f"DUPLICATE_NAME:{suggested_name}")

        # First, insert all questions and get their IDs
        question_ids = []
        for idx, q in enumerate(questions):
            question = Question(
                question=q["question"],
                type="TRUE_FALSE" if len(q["answers"]) == 2 else "ABCD",
                options=q["answers"],
                answer=q["correctAnswer"],
                length=q["timeLimit"],
                category=q["category"]
            )
            result = db.questions.insert_one(question.to_dict())
            question_ids.append({"questionId": result.inserted_id, "order": idx})

        # Create and insert the quiz
        quiz = Quiz(name=name, questions=question_ids)
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
