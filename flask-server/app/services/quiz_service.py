from ..db import db
from ..models import Question, Quiz
from bson import ObjectId
from typing import List
from ..utils import convert_mongo_doc, get_device_id
from datetime import datetime
from ..constants import QUESTION_TYPES, QUIZ_TYPES
from .local_storage_service import LocalStorageService

class QuizService:
    @staticmethod
    def create_quiz(name: str, questions: List[dict], quiz_type: str, device_id: str = None) -> ObjectId:
        # Validate quiz type
        if (quiz_type not in QUIZ_TYPES.values()):
            raise ValueError(f"Neplatný typ kvízu: {quiz_type}")
        
        # Create Quiz first to get the ID
        quiz = Quiz(
            name=name, 
            questions=[], 
            type=quiz_type, 
            is_public=False,
            created_by=device_id  # Set the created_by field
        )
        quiz_result = db.quizzes.insert_one(quiz.to_dict())
        quiz_id = quiz_result.inserted_id
        
        # Insert all questions with reference to the quiz and device ID
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
                category=q["category"],
                part_of=quiz_id,
                created_by=device_id  # Set the created_by field
            )
            result = db.questions.insert_one(question.to_dict())
            question_ids.append({"questionId": result.inserted_id, "order": idx})
            
            # Store created question ID in local database
            LocalStorageService.store_created_question(str(result.inserted_id))
            
        # Update the quiz with question IDs
        db.quizzes.update_one(
            {"_id": quiz_id},
            {"$set": {"questions": question_ids}}
        )
        
        return quiz_id

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
        
    @staticmethod
    def is_question_visible(question_id: str) -> bool:
        """Check if a question is visible based on its parent quiz's visibility"""
        question = db.questions.find_one({"_id": ObjectId(question_id)})
        if not question or not question.get("part_of"):
            return False
            
        quiz = db.quizzes.find_one({"_id": question["part_of"]})
        if not quiz:
            return False
            
        return quiz.get("is_public", False)
        
    @staticmethod
    def get_quizzes_by_device(device_id: str) -> List[dict]:
        """Get all quizzes created by a specific device -> used in home screen to show all quizzes created by this device
        TODO Get quizzes from this device instead and get it from local SQLite DB instead"""
        quizzes = list(db.quizzes.find({"created_by": device_id}))
        return [convert_mongo_doc(quiz) for quiz in quizzes]

    @staticmethod
    def get_created_questions_IDs() -> List[dict]:
        """Get all questions created by this device using local storage
        It should be faster than getting it from MongoDB"""
        # Get question IDs from local storage
        local_question_ids = LocalStorageService.get_created_questions()
        
        # Convert string IDs to ObjectIds
        object_ids = [ObjectId(id_str) for id_str in local_question_ids]
        
        # Fetch the questions from MongoDB
        questions = list(db.questions.find({"_id": {"$in": object_ids}}))
        return [convert_mongo_doc(question) for question in questions]

    @staticmethod
    def get_public_questions(device_id: str = None) -> List[dict]:
        """Get public questions not created by the specified device - used in quiz creation to add existing question 
        TODO Only questions with copy_of null, if they aren't public, 
        then find a public copy if there is one and show that one instead"""
        query = {"part_of": {"$exists": True}}
        if device_id:
            query["created_by"] = {"$ne": device_id}
            
        # Find questions that belong to public quizzes
        public_quizzes = list(db.quizzes.find({"is_public": True}))
        public_quiz_ids = [quiz["_id"] for quiz in public_quizzes]
        
        if public_quiz_ids:
            query["part_of"] = {"$in": public_quiz_ids}
            questions = list(db.questions.find(query))
            return [convert_mongo_doc(question) for question in questions]
        return []
    
    @staticmethod
    def is_owner(quiz_id: str) -> bool:
        """Check if the current device is the owner of the quiz"""
        device_id = get_device_id()
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            return False
        return quiz.get("created_by") == device_id
