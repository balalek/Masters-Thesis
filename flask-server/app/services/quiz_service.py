from ..db import db
from ..models import Question, Quiz, QuestionMetadata  # Add QuestionMetadata to imports
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
            
            # For copied questions, only use content data, create fresh metadata
            copy_of = None
            if q.get("_id"):  # If question has _id, it's a copied question
                original = db.questions.find_one({"_id": ObjectId(q["_id"])})
                if original:
                    # If the question is modified, set copy_of to null
                    # Otherwise, use the original's copy_of or the original's _id
                    if q.get("modified", False):
                        copy_of = None  # Modified questions are treated as new
                    else:
                        copy_of = original.get("copy_of") or original["_id"]
            
            # Create new Question with fresh metadata but copied content
            question = Question(
                question=q["question"],
                type=question_type,
                options=q["answers"] if "answers" in q else q["options"],
                answer=q["correctAnswer"] if "correctAnswer" in q else q["answer"],
                length=q["timeLimit"] if "timeLimit" in q else q["length"],
                category=q["category"],
                part_of=quiz_id,
                created_by=device_id,
                copy_of=copy_of,
                metadata=QuestionMetadata()  # Fresh metadata for the new question
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
        TODO Get quizzes from this device instead"""
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
    def get_existing_questions(device_id: str, filter_type: str = 'all', question_type: str = 'all', 
                             search_query: str = '', page: int = 1, per_page: int = 20) -> dict:
        """Get existing questions based on filters with pagination - used in ABCD quiz creation"""
        # Start with basic query
        query = {}

        # Apply question type filter if not 'all'
        if question_type != 'all':
            query['type'] = question_type
            
        # Apply search query if provided
        if search_query:
            query['question'] = {'$regex': search_query, '$options': 'i'}

        # Handle 'mine' filter type - show all my questions
        if filter_type == 'mine':
            query['created_by'] = device_id
            questions = list(db.questions.find(query))
            result = []
            
            for question in questions:
                quiz = db.quizzes.find_one({'_id': question['part_of']}) if question.get('part_of') else None
                question_data = convert_mongo_doc(question)
                question_data['quizName'] = quiz['name'] if quiz else 'Unknown Quiz'
                question_data['timesPlayed'] = question.get('metadata', {}).get('timesUsed', 0)
                question_data['isMyQuestion'] = True
                result.append(question_data)
                
        # Handle 'others' filter type - show only public originals or their public copies
        elif filter_type == 'others':
            query['created_by'] = {'$ne': device_id}
            query['copy_of'] = None  # Get only original questions
            
            original_questions = list(db.questions.find(query))
            result = []
            processed_originals = set()

            for question in original_questions:
                quiz = db.quizzes.find_one({'_id': question['part_of']}) if question.get('part_of') else None
                is_public = quiz and quiz.get('is_public', False)
                
                if is_public:
                    # If original question is public, use it
                    question_data = convert_mongo_doc(question)
                    question_data['quizName'] = quiz['name'] if quiz else 'Unknown Quiz'
                    question_data['timesPlayed'] = question.get('metadata', {}).get('timesUsed', 0)
                    question_data['isMyQuestion'] = False
                    result.append(question_data)
                else:
                    # Find a public copy of this question
                    public_copy = None
                    copies = db.questions.find({'copy_of': question['_id']})
                    
                    for copy in copies:
                        copy_quiz = db.quizzes.find_one({'_id': copy['part_of']}) if copy.get('part_of') else None
                        if copy_quiz and copy_quiz.get('is_public', False):
                            public_copy = copy
                            break
                    
                    if public_copy:
                        copy_quiz = db.quizzes.find_one({'_id': public_copy['part_of']})
                        copy_data = convert_mongo_doc(public_copy)
                        copy_data['quizName'] = copy_quiz['name'] if copy_quiz else 'Unknown Quiz'
                        copy_data['timesPlayed'] = public_copy.get('metadata', {}).get('timesUsed', 0)
                        copy_data['isMyQuestion'] = False
                        result.append(copy_data)

                processed_originals.add(str(question['_id']))

        # Sort results by timesPlayed
        result.sort(key=lambda x: x['timesPlayed'], reverse=True)
        
        # Apply pagination after sorting
        total_count = len(result)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_result = result[start_idx:end_idx]

        return {
            "questions": paginated_result,
            "total_count": total_count
        }

    @staticmethod
    def get_quizzes(device_id: str, filter_type: str = 'mine', quiz_type: str = 'all', 
                    search_query: str = '', page: int = 1, per_page: int = 10) -> dict:
        """Get quizzes with pagination"""
        try:
            query = {}
            
            # Apply quiz type filter if not 'all'
            if quiz_type != 'all':
                query['type'] = quiz_type
                
            # Apply search query if provided
            if search_query:
                query['name'] = {'$regex': search_query, '$options': 'i'}
            
            # Filter by ownership
            if filter_type == 'mine':
                query['created_by'] = device_id
            else:  # public
                query['is_public'] = True
                query['created_by'] = {'$ne': device_id}
            
            # Calculate skip value for pagination
            skip = (page - 1) * per_page
            
            # Get total count for pagination
            total = db.quizzes.count_documents(query)
            
            # Get paginated quizzes with proper sort
            cursor = db.quizzes.find(query)
            cursor.sort([('_id', -1)])  # Sort by _id descending (newest first)
            cursor.skip(skip)
            cursor.limit(per_page)
            
            quizzes = list(cursor)
            
            # Convert MongoDB documents to JSON-serializable format
            result = []
            for quiz in quizzes:
                quiz_data = convert_mongo_doc(quiz)
                # Count total questions for this quiz
                quiz_data['questionCount'] = len(quiz.get('questions', []))
                result.append(quiz_data)
                
            has_more = (skip + len(result)) < total
                
            return {
                "quizzes": result,
                "total": total,
                "has_more": has_more
            }
        except Exception as e:
            print(f"Error in get_quizzes: {str(e)}")
            raise e

    @staticmethod
    def toggle_quiz_publicity(quiz_id: str, device_id: str) -> dict:
        """Toggle quiz publicity status"""
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        
        if not quiz:
            raise ValueError("Kvíz nebyl nalezen")
            
        if quiz.get("created_by") != device_id:
            raise ValueError("Nemáte oprávnění sdílet tento kvíz")
            
        new_status = not quiz.get("is_public", False)
        
        db.quizzes.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": {"is_public": new_status}}
        )
        
        return {
            "success": True,
            "is_public": new_status,
            "message": "Kvíz byl úspěšně zveřejněn" if new_status else "Kvíz byl úspěšně skryt"
        }
