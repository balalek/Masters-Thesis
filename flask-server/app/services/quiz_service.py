from ..db import db
from ..models import Question, Quiz, QuestionMetadata
from bson import ObjectId
from typing import List, Dict, Any, Optional, Set
from ..utils import convert_mongo_doc, get_device_id
from datetime import datetime
from ..constants import QUESTION_TYPES, QUIZ_TYPES, QUIZ_VALIDATION
from .local_storage_service import LocalStorageService
from .question_handlers.question_handler_factory import QuestionHandlerFactory
from .cloudinary_service import CloudinaryService

class QuizService:
    @staticmethod
    def _create_question(question_data: dict, quiz_id: ObjectId, device_id: str, order: int) -> dict:
        """Create or update a question and return its reference data"""
        # Validate question type
        question_type = question_data.get("type")
        if (question_type not in QUESTION_TYPES.values()):
            raise ValueError(f"Neplatný typ otázky: {question_type}")
        
        # Get the appropriate handler for this question type
        handler = QuestionHandlerFactory.get_handler(question_type)
        
        # Determine if this is a new question or an update
        is_existing = "_id" in question_data and not question_data.get("is_copy")
        original = None

        # If it's an existing question, fetch the original
        if is_existing:
            original = db.questions.find_one({"_id": ObjectId(question_data["_id"])})
            if question_data.get("modified", False) and original and original.get("copy_of") is None:
                copies = list(db.questions.find({"copy_of": ObjectId(question_data["_id"])}))
                if copies:
                    handler.handle_copy_references(ObjectId(question_data["_id"]), copies)

        # Create question dict using the handler
        question_dict = handler.create_question_dict(question_data, quiz_id, device_id, original)

        if is_existing:
            db.questions.update_one(
                {"_id": ObjectId(question_data["_id"])},
                {"$set": question_dict}
            )
            question_id = ObjectId(question_data["_id"])
        else:
            result = db.questions.insert_one(question_dict)
            question_id = result.inserted_id
            if not question_data.get("is_copy"):
                LocalStorageService.store_created_question(str(question_id))

        return {"questionId": question_id, "order": order}

    @staticmethod
    def _handle_quiz_questions(quiz_id: ObjectId, questions: List[dict], device_id: str, existing_questions: Set[str] = None) -> List[dict]:
        """Process questions for a quiz and return list of question references"""
        question_refs = []
        
        # Create/update all questions
        for idx, question_data in enumerate(questions):
            question_ref = QuizService._create_question(question_data, quiz_id, device_id, idx)
            question_refs.append(question_ref)

        # Handle removed questions if updating existing quiz
        if existing_questions:
            new_question_ids = {str(q["questionId"]) for q in question_refs}
            removed_ids = existing_questions - new_question_ids
            
            for removed_id in removed_ids:
                question = db.questions.find_one({"_id": ObjectId(removed_id)})
                if question:
                    handler = QuestionHandlerFactory.get_handler(question["type"])
                    copies = list(db.questions.find({"copy_of": ObjectId(removed_id)}))
                    if copies:
                        handler.handle_copy_references(ObjectId(removed_id), copies)

        return question_refs

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
            created_by=device_id
        )
        quiz_result = db.quizzes.insert_one(quiz.to_dict())
        quiz_id = quiz_result.inserted_id
        
        question_refs = QuizService._handle_quiz_questions(quiz_id, questions, device_id)
        
        db.quizzes.update_one(
            {"_id": quiz_id},
            {"$set": {"questions": question_refs}}
        )
        
        return quiz_id

    @staticmethod
    def get_quiz(quiz_id: str) -> dict:
        """Get a specific quiz by ID with its questions"""
        try:
            quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
            if not quiz:
                return None
            
            # Fetch all questions for this quiz
            questions = []
            for q in quiz["questions"]:
                question = db.questions.find_one({"_id": q["questionId"]})
                if question:
                    question_data = convert_mongo_doc(question)
                    question_data["order"] = q["order"]
                    questions.append(question_data)
            
            result = convert_mongo_doc(quiz)
            result["questions"] = sorted(questions, key=lambda x: x["order"])
            return result
            
        except Exception as e:
            print(f"Error fetching quiz: {str(e)}")
            raise e

    @staticmethod
    def get_existing_questions(device_id: str, filter_type: str = 'all', question_type: str = 'all', 
                             search_query: str = '', page: int = 1, per_page: int = 20) -> dict:
        """Get existing questions based on filters with pagination - used in ABCD quiz creation"""
        # Start with basic query
        query = {}

        # Always exclude Word Chain and Drawing questions
        query['type'] = {'$nin': [QUESTION_TYPES["WORD_CHAIN"], QUESTION_TYPES["DRAWING"]]}

        # Apply question type filter if not 'all'
        if question_type != 'all':
            # Need to modify the query to include both the type filter and the exclusions
            query['type'] = {
                '$eq': question_type,
                '$nin': [QUESTION_TYPES["WORD_CHAIN"], QUESTION_TYPES["DRAWING"]]
            }
            
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
                quiz_name = quiz['name'] if quiz else 'Unknown Quiz'
                
                # Get the appropriate handler for this question type
                handler = QuestionHandlerFactory.get_handler(question['type'])
                
                # Format the question for frontend using the handler
                question_data = handler.format_for_frontend(question, quiz_name)
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
                
                if (is_public):
                    # If original question is public, use it
                    handler = QuestionHandlerFactory.get_handler(question['type'])
                    question_data = handler.format_for_frontend(question, quiz['name'] if quiz else 'Unknown Quiz')
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
                        handler = QuestionHandlerFactory.get_handler(public_copy['type'])
                        copy_data = handler.format_for_frontend(
                            public_copy, 
                            copy_quiz['name'] if copy_quiz else 'Unknown Quiz'
                        )
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
                try:
                    quiz_data = convert_mongo_doc(quiz)
                    
                    # Add proper error handling for questions array
                    questions = quiz.get('questions', [])
                    if not isinstance(questions, list):
                        questions = []
                    
                    # Count total questions for this quiz - safely handle malformed question references
                    quiz_data['questionCount'] = len(questions)
                    
                    # Check if quiz has audio questions
                    has_audio = False
                    for q_ref in questions:
                        if not isinstance(q_ref, dict) or 'questionId' not in q_ref:
                            continue  # Skip invalid question references
                        
                        try:
                            question = db.questions.find_one({"_id": q_ref["questionId"]})
                            if question and question.get('media_type') == 'audio':
                                has_audio = True
                                break
                        except Exception as q_error:
                            print(f"Error processing question reference: {q_error}")
                            continue
                    
                    quiz_data['has_audio'] = has_audio
                    result.append(quiz_data)
                except Exception as quiz_error:
                    print(f"Error processing quiz {quiz.get('_id', 'unknown')}: {quiz_error}")
                    # Skip this quiz instead of failing the entire request
                    continue
                    
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

    @staticmethod
    def update_quiz(quiz_id: str, name: str, questions: List[dict], device_id: str, deleted_questions: List[str] = None, quiz_type: str = None) -> ObjectId:
        """Update existing quiz and its questions"""
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            raise ValueError("Kvíz nebyl nalezen")
            
        if quiz.get("created_by") != device_id:
            raise ValueError("Nemáte oprávnění upravovat tento kvíz")
        
        # Update quiz basic info including type
        update_fields = {"name": name}
        if quiz_type:
            update_fields["type"] = quiz_type
            
        db.quizzes.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": update_fields}
        )
        
        # Get existing question IDs before update
        existing_questions = {str(q["questionId"]) for q in quiz["questions"]}
        
        # Handle explicitly deleted questions
        if deleted_questions:
            for question_id in deleted_questions:
                try:
                    question = db.questions.find_one({"_id": ObjectId(question_id)})
                    if question:
                        # Delete media file if exists and not used by other questions
                        if question.get('media_url'):
                            CloudinaryService.delete_file(question['media_url'], db)
                            
                        handler = QuestionHandlerFactory.get_handler(question["type"])
                        copies = list(db.questions.find({"copy_of": ObjectId(question_id)}))
                        if copies:
                            handler.handle_copy_references(ObjectId(question_id), copies)
                            
                    db.questions.delete_one({"_id": ObjectId(question_id)})
                except Exception as e:
                    print(f"Error deleting question {question_id}: {str(e)}")

        # Handle questions update with media replacement
        for question in questions:
            if question.get('_id'):
                original = db.questions.find_one({"_id": ObjectId(question['_id'])})
                if original and original.get('media_url'):
                    # If media URL changed, delete old file if not used by other questions
                    if question.get('mediaUrl') != original['media_url']:
                        CloudinaryService.delete_file(original['media_url'], db)

        # Handle questions
        question_refs = QuizService._handle_quiz_questions(
            ObjectId(quiz_id), 
            questions, 
            device_id, 
            existing_questions
        )
        
        # Update questions reference in quiz
        db.quizzes.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": {"questions": question_refs}}
        )
        
        return quiz_id

    @staticmethod
    def delete_quiz(quiz_id: str, device_id: str) -> None:
        """Delete quiz and handle its questions' copy references"""
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            raise ValueError("Kvíz nebyl nalezen")
            
        if quiz.get("created_by") != device_id:
            raise ValueError("Nemáte oprávnění smazat tento kvíz")

        # Get all questions from this quiz
        question_ids = [q["questionId"] for q in quiz["questions"]]
        
        # Handle each question
        for question_id in question_ids:
            question = db.questions.find_one({"_id": question_id})
            if question:
                # Delete media file if exists and not used by other questions
                if question.get('media_url'):
                    CloudinaryService.delete_file(question['media_url'], db)
                    
                # Handle copy references
                handler = QuestionHandlerFactory.get_handler(question["type"])
                copies = list(db.questions.find({"copy_of": question_id}))
                if copies:
                    handler.handle_copy_references(question_id, copies)

        # Delete all questions
        db.questions.delete_many({"_id": {"$in": question_ids}})
        
        # Delete the quiz
        db.quizzes.delete_one({"_id": ObjectId(quiz_id)})

    @staticmethod
    def copy_quiz(quiz_id: str, device_id: str) -> ObjectId:
        """Create a copy of an existing quiz with new questions"""
        # Get original quiz
        quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            raise ValueError("Původní kvíz nebyl nalezen")

        # Create new quiz with reset metadata
        new_quiz = Quiz(
            name=f"Kopie - {quiz['name']}", 
            questions=[],  # Will be filled later
            type=quiz['type'],
            is_public=False,
            created_by=device_id
        )
        new_quiz_result = db.quizzes.insert_one(new_quiz.to_dict())
        new_quiz_id = new_quiz_result.inserted_id

        # Create copies of all questions
        question_refs = []
        for idx, q_ref in enumerate(quiz['questions']):
            original_q = db.questions.find_one({"_id": q_ref["questionId"]})
            if not original_q:
                continue

            # Get the appropriate handler for this question type
            handler = QuestionHandlerFactory.get_handler(original_q["type"])

            # Create question data in a format compatible with handlers
            question_data = {
                # Only include question field if it exists in the original question
                **({"question": original_q["question"]} if "question" in original_q else {"question": ""}),
                "type": original_q["type"],
                "category": original_q.get("category", ""),
                "length": original_q.get("length", ""),
                "timeLimit": original_q.get("length", ""),
                "copy_of": original_q.get("copy_of") or original_q["_id"],
            }
            
            # Add specific fields for Word Chain and Drawing questions
            if original_q["type"] == QUESTION_TYPES["WORD_CHAIN"]:
                question_data.update({
                    "rounds": original_q.get("rounds", QUIZ_VALIDATION['WORD_CHAIN_DEFAULT_ROUNDS']),
                    "length": original_q.get("length", QUIZ_VALIDATION['WORD_CHAIN_DEFAULT_TIME'])
                })
            elif original_q["type"] == QUESTION_TYPES["DRAWING"]:
                question_data.update({
                    "rounds": original_q.get("rounds", QUIZ_VALIDATION['DRAWING_DEFAULT_ROUNDS']),
                    "length": original_q.get("length", QUIZ_VALIDATION['DRAWING_DEFAULT_TIME'])
                })
            # Add type-specific fields based on question type
            elif original_q["type"] == QUESTION_TYPES["OPEN_ANSWER"]:
                question_data.update({
                    "answer": original_q.get("open_answer", ""),
                    "mediaType": original_q.get("media_type"),
                    "mediaUrl": original_q.get("media_url"),
                    "showImageGradually": original_q.get("show_image_gradually", False)
                })
            elif original_q["type"] == QUESTION_TYPES["GUESS_A_NUMBER"]:
                question_data.update({
                    "answer": original_q.get("number_answer", 0)
                })
            elif original_q["type"] == QUESTION_TYPES["MATH_QUIZ"]:
                question_data.update({
                    "sequences": original_q.get("sequences", [])
                })
            else:  # ABCD or TRUE_FALSE
                question_data.update({
                    "answers": original_q.get("options", []),
                    "correctAnswer": original_q.get("answer")
                })

            # Create question dict using the handler
            question_dict = handler.create_question_dict(question_data, new_quiz_id, device_id, None)
            
            # Insert new question
            result = db.questions.insert_one(question_dict)
            question_refs.append({
                "questionId": result.inserted_id,
                "order": idx
            })

        # Update quiz with question references
        db.quizzes.update_one(
            {"_id": new_quiz_id},
            {"$set": {"questions": question_refs}}
        )

        return new_quiz_id

    @staticmethod
    def update_question_metadata(question_id: str, is_correct: bool, increment_times_played: bool = False) -> None:
        """Update question metadata after it's been answered"""
        question = db.questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            return

        current_metadata = question.get('metadata', {})
        times_used = current_metadata.get('timesUsed', 0)
        current_rate = current_metadata.get('averageCorrectRate', 0.0)

        # Calculate new correct rate using weighted average
        if increment_times_played:
            new_times_used = times_used + 1
            new_rate = ((current_rate * times_used) + (1 if is_correct else 0)) / new_times_used
        else:
            new_times_used = times_used
            # Update rate without incrementing times_used
            new_rate = ((current_rate * times_used) + (1 if is_correct else 0)) / (times_used or 1)

        # Update metadata
        update_dict = {"metadata.averageCorrectRate": round(new_rate, 4)}
        if increment_times_played:
            update_dict["metadata.timesUsed"] = new_times_used

        db.questions.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": update_dict}
        )
