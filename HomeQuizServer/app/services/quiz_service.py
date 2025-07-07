"""Quiz service module for database operations.

This module provides a service class that handles all quiz-related database operations:

- Quiz and question CRUD operations (create, read, update, delete)
- Question metadata management and statistics tracking
- Quiz copying and publishing functionality
- Random question selection for quick play modes
- Question handling with appropriate type-specific handlers

The QuizService acts as a central service layer between the routes and the database.

Author: Bc. Martin Baláž
"""
from ..db import db
from ..models import Quiz
from bson import ObjectId
from typing import List, Set
from ..utils import convert_mongo_doc
from ..constants import QUESTION_TYPES, QUIZ_TYPES, QUIZ_VALIDATION
from .local_storage_service import LocalStorageService
from .question_handlers.question_handler_factory import QuestionHandlerFactory
from .cloudinary_service import CloudinaryService

class QuizService:
    @staticmethod
    def _create_question(question_data: dict, quiz_id: ObjectId, device_id: str, order: int) -> dict:
        """
        Create or update a question and return its reference data.
        
        Handles validation, type-specific processing, and copy management
        for new and existing questions.
        
        Args:
            question_data: Question data from frontend
            quiz_id: ObjectId of the quiz this question belongs to
            device_id: Device identifier for tracking question ownership
            order: Position of the question in the quiz
            
        Returns:
            dict: Reference data containing the question ID and order
            
        Raises:
            ValueError: If question type is invalid
        """
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
        """
        Process questions for a quiz and return list of question references.
        
        Creates new questions, updates existing ones, and handles removed
        questions when updating an existing quiz.
        
        Args:
            quiz_id: ObjectId of the parent quiz
            questions: List of question data from frontend
            device_id: Device identifier for tracking ownership
            existing_questions: Set of question IDs from existing quiz (for updates)
            
        Returns:
            list: List of question references in {questionId, order} format
        """
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
        """
        Create a new quiz with its questions.
        
        Creates a quiz record and all associated questions, establishing
        the parent-child relationship between them.
        
        Args:
            name: Title of the quiz
            questions: List of question data from frontend
            quiz_type: Type of quiz from QUIZ_TYPES
            device_id: Device identifier for tracking ownership
            
        Returns:
            ObjectId: ID of the newly created quiz
            
        Raises:
            ValueError: If quiz type is invalid
        """
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
        """
        Get a specific quiz by ID with its questions.
        
        Retrieves complete quiz data including all question content,
        sorted by question order.
        
        Args:
            quiz_id: String ID of the quiz to retrieve
            
        Returns:
            dict: Complete quiz data with questions, None if not found
            
        Raises:
            Exception: If error occurs during retrieval
        """
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
        """
        Get existing questions based on filters with pagination.
        
        Used for question browser in quiz creation UI. Supports filtering by:
        - Owner (mine/others)
        - Question type
        - Search query
        
        Args:
            device_id: Device identifier for ownership filtering
            filter_type: Filter to 'mine', 'others', or 'all' questions
            question_type: Question type to filter by
            search_query: Text to search for in question content
            page: Current page number for pagination
            per_page: Number of questions per page
            
        Returns:
            dict: {questions: [...], total_count: n} with pagination data
        """
        # Start with basic query
        query = {}

        # Always exclude Word Chain and Drawing questions - those are dynamic types
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
                
                if is_public:
                    # If original question is public, use it
                    handler = QuestionHandlerFactory.get_handler(question['type'])
                    question_data = handler.format_for_frontend(question, quiz['name'] if quiz else 'Unknown Quiz')
                    question_data['isMyQuestion'] = False
                    result.append(question_data)
                else:
                    # Find a public copy of this question instead
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
        """
        Get quizzes with pagination and filtering.
        
        Retrieves quizzes based on ownership, type, and search criteria,
        with additional metadata like question count and media presence.
        
        Args:
            device_id: Device identifier for ownership filtering
            filter_type: Filter to 'mine' or 'public' quizzes
            quiz_type: Quiz type to filter by
            search_query: Text to search for in quiz names
            page: Current page number for pagination
            per_page: Number of quizzes per page
            
        Returns:
            dict: {quizzes: [...], total: n, has_more: bool} with pagination data
            
        Raises:
            Exception: If error occurs during retrieval
        """
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
                    
                    # Check if quiz has questions
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
        """
        Toggle quiz publicity status.
        
        Switches a quiz between public and private status,
        ensuring the requestor has permission to change the quiz.
        
        Args:
            quiz_id: ID of the quiz to update
            device_id: Device identifier to verify ownership
            
        Returns:
            dict: Result with success status and new publicity state
            
        Raises:
            ValueError: If quiz not found or permission denied
        """
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
        """
        Update existing quiz and its questions.
        
        Updates quiz details, processes question changes, and handles 
        media deletion for removed questions.
        
        Args:
            quiz_id: ID of the quiz to update
            name: New title for the quiz
            questions: Updated list of question data
            device_id: Device identifier to verify ownership
            deleted_questions: List of question IDs explicitly removed
            quiz_type: Optional new quiz type
            
        Returns:
            ObjectId: ID of the updated quiz
            
        Raises:
            ValueError: If quiz not found or permission denied
        """
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
                if original and original.get('media_url') and question.get('mediaUrl') != original['media_url']:
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
        """
        Delete quiz and handle its questions' copy references.
        
        Deletes a quiz and all its associated questions, handling
        media deletion and copy references.
        
        Args:
            quiz_id: ID of the quiz to delete
            device_id: Device identifier to verify ownership
            
        Raises:
            ValueError: If quiz not found or permission denied
        """
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
        """
        Create a copy of an existing quiz with new questions.
        
        Duplicates a quiz and all its questions, preserving type-specific
        attributes while assigning new ownership.
        
        Args:
            quiz_id: ID of the quiz to copy
            device_id: Device identifier for new ownership
            
        Returns:
            ObjectId: ID of the newly created quiz copy
            
        Raises:
            ValueError: If original quiz not found
        """
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
            
            # Specific fields based on question type
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
            elif original_q["type"] == QUESTION_TYPES["BLIND_MAP"]:
                question_data.update({
                    "cityName": original_q.get("city_name", ""),
                    "anagram": original_q.get("anagram", ""),
                    "locationX": original_q.get("location_x", 0),
                    "locationY": original_q.get("location_y", 0),
                    "mapType": original_q.get("map_type", "cz"),
                    "clue1": original_q.get("clue1", ""),
                    "clue2": original_q.get("clue2", ""),
                    "clue3": original_q.get("clue3", "")
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
    def get_random_questions(question_type, categories=None, device_id=None, limit=5, exclude_audio=False, map_filter=None):
        """
        Get random questions from public quizzes.
        
        Retrieves questions matching specified criteria using MongoDB aggregation.
        Supports filtering by question type, category, and map type.
        
        Args:
            question_type: Type of question to retrieve
            categories: Optional list of categories to filter by
            device_id: Device ID to exclude questions created by this device
            limit: Maximum number of questions to return
            exclude_audio: Whether to exclude questions with audio media
            map_filter: Optional map type for blind map questions
            
        Returns:
            list: List of randomly selected questions with complete document structure
        """
        try:
            # First, find public quizzes that have questions of the requested type
            pipeline = [
                # Match only public quizzes not created by current device
                {"$match": {
                    "is_public": True,
                    "created_by": {"$ne": device_id} if device_id else {"$exists": True}
                }},
                # Look up the associated questions
                {"$lookup": {
                    "from": "questions",
                    "localField": "questions.questionId",
                    "foreignField": "_id",
                    "as": "full_questions"
                }},
                # Filter to quizzes that have matching question types
                {"$match": {"full_questions.type": question_type}},
                # Unwind to work with individual questions
                {"$unwind": "$full_questions"},
                # Keep only the questions of the target type
                {"$match": {"full_questions.type": question_type}},
                # Apply category filter if provided
                {"$match": {"full_questions.category": {"$in": categories}} if categories else {}},
                # Exclude audio questions if requested
                {"$match": {"full_questions.media_type": {"$ne": "audio"}} if question_type == QUESTION_TYPES["OPEN_ANSWER"] and exclude_audio else {}},
                # Filter by map type for blind map questions if provided
                {"$match": {"full_questions.map_type": map_filter} if question_type == QUESTION_TYPES["BLIND_MAP"] and map_filter else {}},
                # Project to get just the question documents
                {"$replaceRoot": {"newRoot": "$full_questions"}},
                # Sample random questions
                {"$sample": {"size": limit}}
            ]
            
            # Execute aggregation
            questions = list(db.quizzes.aggregate(pipeline))
            
            # Convert MongoDB documents to JSON-serializable format
            results = []
            for q in questions:
                # Use the existing convert_mongo_doc utility to handle ObjectId conversion
                question_data = convert_mongo_doc(q)
                results.append(question_data)
                
            return results
            
        except Exception as e:
            print(f"Error getting random questions: {str(e)}")
            return []