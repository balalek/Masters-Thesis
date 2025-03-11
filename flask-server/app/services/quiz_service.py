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
    def _handle_copy_references(old_question_id: ObjectId, copies: List[dict]) -> None:
        """Handle copy_of references when original question changes or is removed"""
        if copies:
            # Find oldest copy to become new original
            new_original = min(copies, key=lambda x: x.get("created_at", datetime.max))
            new_original_id = new_original["_id"]
            
            # Update all other copies to point to new original
            db.questions.update_many(
                {
                    "copy_of": old_question_id,
                    "_id": {"$ne": new_original_id}
                },
                {"$set": {"copy_of": new_original_id}}
            )
            # Make new original a true original
            db.questions.update_one(
                {"_id": new_original_id},
                {"$set": {"copy_of": None}}
            )

    @staticmethod
    def _determine_copy_of(question_data: dict, original: dict, is_modified: bool, is_existing: bool) -> ObjectId:
        """Determine the 'copy_of' field value for a question."""
        if is_modified:
            return None
        if question_data.get("copy_of"):
            return ObjectId(question_data["copy_of"])
        if original and original.get("copy_of"):
            return original["copy_of"]
        if not original or (is_existing and str(original["_id"]) == str(question_data.get("_id"))):
            return None
        return original["_id"]

    @staticmethod
    def _create_question(question_data: dict, quiz_id: ObjectId, device_id: str, order: int) -> dict:
        """Create or update a question and return its reference data"""
        # Validate question type
        question_type = question_data.get("type")
        if question_type not in QUESTION_TYPES.values():
            raise ValueError(f"Neplatný typ otázky: {question_type}")
        
        # Determine if this is a new question or an update
        is_existing = "_id" in question_data and not question_data.get("is_copy")
        is_modified = question_data.get("modified", False)
        original = None

        # If it's an existing question, fetch the original
        if is_existing:
            original = db.questions.find_one({"_id": ObjectId(question_data["_id"])})
            if is_modified and original and original.get("copy_of") is None:
                copies = list(db.questions.find({"copy_of": ObjectId(question_data["_id"])}))
                if copies:
                    QuizService._handle_copy_references(ObjectId(question_data["_id"]), copies)

        # Create base question dict
        question_dict = {
            "question": question_data["question"],
            "type": question_type,
            "length": question_data.get("timeLimit", question_data.get("length", 30)),
            "category": question_data["category"],
            "part_of": quiz_id,
            "created_by": device_id,
            "copy_of": QuizService._determine_copy_of(question_data, original, is_modified, is_existing),
            "metadata": QuestionMetadata().to_dict()
        }

        # Add type-specific fields
        if question_type in [QUESTION_TYPES["ABCD"], QUESTION_TYPES["TRUE_FALSE"]]:
            question_dict.update({
                "options": question_data.get("answers", question_data.get("options")),
                "answer": question_data.get("correctAnswer", question_data.get("answer"))
            })
        elif question_type == QUESTION_TYPES["OPEN_ANSWER"]:
            question_dict.update({
                "open_answer": question_data.get("answer"),
                "media_type": question_data.get("mediaType"),
                "media_url": question_data.get("mediaUrl"),
                "show_image_gradually": question_data.get("showImageGradually", False)
            })

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
    def _handle_quiz_questions(quiz_id: ObjectId, questions: List[dict], device_id: str, existing_questions: set = None) -> List[dict]:
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
                copies = list(db.questions.find({"copy_of": ObjectId(removed_id)}))
                if copies:
                    QuizService._handle_copy_references(ObjectId(removed_id), copies)

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
            created_by=device_id  # Set the created_by field
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
                
                # Handle different question types
                if question.get('type') in [QUESTION_TYPES['ABCD'], QUESTION_TYPES['TRUE_FALSE']]:
                    # Format ABCD/True-False questions
                    if 'options' in question and question.get('answer') is not None:
                        question_data['answers'] = [
                            {'text': option, 'isCorrect': idx == question['answer']}
                            for idx, option in enumerate(question['options'])
                        ]
                    else:
                        # Fallback for malformed questions
                        question_data['answers'] = [
                            {'text': 'Missing options', 'isCorrect': True}
                        ]
                        
                elif question.get('type') == QUESTION_TYPES['OPEN_ANSWER']:
                    # Format open answer questions
                    open_answer = question.get('open_answer', '')
                    if not open_answer and 'answer' in question:  # Fallback to 'answer' field if needed
                        open_answer = question.get('answer', '')
                        
                    question_data['answers'] = [
                        {'text': f"Správná odpověď: {open_answer}", 'isCorrect': True}
                    ]
                    question_data['open_answer'] = open_answer
                    
                    # Add media fields if they exist
                    if 'media_type' in question:
                        question_data['media_type'] = question['media_type']
                    if 'media_url' in question:
                        question_data['media_url'] = question['media_url']
                    if 'show_image_gradually' in question:
                        question_data['show_image_gradually'] = question['show_image_gradually']
                else:
                    # Handle unknown question types
                    question_data['answers'] = [
                        {'text': f"Neznámý typ otázky: {question.get('type')}", 'isCorrect': True}
                    ]
                
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
                    question_data = convert_mongo_doc(question)
                    question_data['quizName'] = quiz['name'] if quiz else 'Unknown Quiz'
                    question_data['timesPlayed'] = question.get('metadata', {}).get('timesUsed', 0)
                    question_data['isMyQuestion'] = False
                    
                    # Handle different question types
                    if question['type'] in [QUESTION_TYPES['ABCD'], QUESTION_TYPES['TRUE_FALSE']]:
                        question_data['answers'] = [
                            {'text': option, 'isCorrect': idx == question['answer']}
                            for idx, option in enumerate(question['options'])
                        ]
                    elif question['type'] == QUESTION_TYPES['OPEN_ANSWER']:
                        question_data['answers'] = [
                            {'text': f"Správná odpověď: {question.get('open_answer', '')}", 'isCorrect': True}
                        ]
                        question_data['open_answer'] = question.get('open_answer', '')
                        
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
                        
                        # Handle different question types for copies
                        if public_copy['type'] in [QUESTION_TYPES['ABCD'], QUESTION_TYPES['TRUE_FALSE']]:
                            copy_data['answers'] = [
                                {'text': option, 'isCorrect': idx == public_copy['answer']}
                                for idx, option in enumerate(public_copy['options'])
                            ]
                        elif public_copy['type'] == QUESTION_TYPES['OPEN_ANSWER']:
                            copy_data['answers'] = [
                                {'text': f"Správná odpověď: {public_copy.get('open_answer', '')}", 'isCorrect': True}
                            ]
                            copy_data['open_answer'] = public_copy.get('open_answer', '')
                            
                        result.append(copy_data)
                # TODO is this needed?
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
                    # Find questions that reference this as original
                    copies = list(db.questions.find({"copy_of": ObjectId(question_id)}))
                    if copies:
                        QuizService._handle_copy_references(ObjectId(question_id), copies)
                    # Delete the question
                    db.questions.delete_one({"_id": ObjectId(question_id)})
                except Exception as e:
                    print(f"Error deleting question {question_id}: {str(e)}")
        
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
        
        # Handle copy references for each question before deletion
        for question_id in question_ids:
            # Find questions that reference this as original
            copies = list(db.questions.find({"copy_of": question_id}))
            if copies:
                QuizService._handle_copy_references(question_id, copies)

        # Delete all questions
        db.questions.delete_many({"_id": {"$in": [ObjectId(id) for id in question_ids]}})
        
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

            # Create new question with proper references
            new_question = {
                "question": original_q["question"],
                "type": original_q["type"],
                "options": original_q["options"],
                "answer": original_q["answer"],
                "length": original_q["length"],
                "category": original_q["category"],
                "part_of": new_quiz_id,
                "created_by": device_id,
                "copy_of": original_q.get("copy_of") or original_q["_id"],  # Keep original reference chain
                "metadata": QuestionMetadata().to_dict()  # Reset metadata
            }

            # Insert new question
            result = db.questions.insert_one(new_question)
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
