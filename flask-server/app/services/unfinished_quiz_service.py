from ..local_db import local_db
from typing import List, Dict, Optional, Any, Tuple, Set
from datetime import datetime
import json
from tinydb import Query
from ..utils import get_device_id
from .cloudinary_service import CloudinaryService
from ..db import db
from bson import ObjectId  # Add this import

class UnfinishedQuizService:
    @staticmethod
    def save_unfinished_quiz(quiz_data: Dict[str, Any], is_editing: bool = False, 
                           quiz_id: Optional[str] = None, autosave_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Save or update unfinished quiz in the local database
        Returns: Tuple containing (success_bool, autosave_identifier)
        """
        # Don't save if we're editing an existing quiz
        if is_editing:
            return False, None
            
        if not local_db:
            print("Local database not available")
            return False, None
        
        try:
            device_id = get_device_id()
            
            # Determine the identifier for this autosave
            identifier = None
            
            # If autosave_id was provided, use that - this means we're updating an existing autosave
            if autosave_id:
                identifier = autosave_id
            else:
                # Always create a unique ID for a new quiz
                identifier = f"new_{int(datetime.now().timestamp())}_{hash(str(quiz_data))}"
            
            # Basic validation
            if not quiz_data or not quiz_data.get('questions') or not isinstance(quiz_data.get('questions'), list):
                print("Invalid quiz data - missing questions array")
                return False, None
                
            # Prepare quiz data
            save_data = {
                "identifier": identifier,
                "name": quiz_data.get('name', 'Unnamed Quiz'),
                "questions": json.dumps(quiz_data.get('questions')),  # Serialize questions to string
                "quiz_type": quiz_data.get('quiz_type', 'ABCD'),
                "is_editing": is_editing,
                "original_quiz_id": quiz_id,
                "device_id": device_id,
                "last_updated": datetime.now().isoformat(),
                "question_count": len(quiz_data.get('questions', [])),
                "creation_time": datetime.now().isoformat() # Add creation time to track when it was first created
            }
            
            # Check if this quiz already exists by identifier
            Quiz = Query()
            existing = local_db['unfinished_quizzes'].search(Quiz.identifier == identifier)
            
            if existing:
                # Update existing record
                local_db['unfinished_quizzes'].update(save_data, Quiz.identifier == identifier)
                print(f"Updated existing autosave with ID: {identifier}")
            else:
                # Create new record
                local_db['unfinished_quizzes'].insert(save_data)
                print(f"Created new autosave with ID: {identifier}")
            
            return True, identifier
        except Exception as e:
            print(f"Error saving unfinished quiz: {e}")
            return False, None
    
    @staticmethod
    def get_unfinished_quizzes() -> List[Dict[str, Any]]:
        """
        Get all unfinished quizzes for the current device
        """
        if not local_db:
            print("Local database not available")
            return []
        
        try:
            device_id = get_device_id()
            Quiz = Query()
            
            quizzes = local_db['unfinished_quizzes'].search(Quiz.device_id == device_id)
            
            # Format quizzes for display
            formatted_quizzes = []
            for q in quizzes:
                formatted_quizzes.append({
                    "identifier": q.get("identifier"),
                    "name": q.get("name"),
                    "is_editing": q.get("is_editing"),
                    "original_quiz_id": q.get("original_quiz_id"),
                    "last_updated": q.get("last_updated"),
                    "question_count": q.get("question_count", 0)
                })
            
            # Sort by last updated, newest first
            formatted_quizzes.sort(key=lambda x: x.get("last_updated", ""), reverse=True)
            
            return formatted_quizzes
        except Exception as e:
            print(f"Error retrieving unfinished quizzes: {e}")
            return []
    
    @staticmethod
    def get_unfinished_quiz(identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific unfinished quiz by identifier
        """
        if not local_db:
            print("Local database not available")
            return None
        
        try:
            device_id = get_device_id()
            Quiz = Query()
            
            results = local_db['unfinished_quizzes'].search(
                (Quiz.identifier == identifier) & 
                (Quiz.device_id == device_id)
            )
            
            if not results:
                return None
                
            quiz_data = results[0]
            
            # Parse questions from JSON
            try:
                questions = json.loads(quiz_data.get("questions", "[]"))
                
                # Validate media files still exist in Cloudinary
                questions_with_valid_data = []
                for question in questions:
                    # Check if question has media that needs validation
                    if question.get('mediaUrl'):
                        # Verify the file exists in Cloudinary
                        if CloudinaryService.check_file_exists(question['mediaUrl']):
                            # File exists, include question as-is
                            pass
                        else:
                            # File doesn't exist, mark media as missing
                            print(f"Media file not found: {question['mediaUrl']}")
                            question['mediaUrl'] = None
                            question['mediaType'] = None
                            question['showImageGradually'] = False
                            question['mediaFileNotFound'] = True
                    
                    # Check if copy_of reference still exists in MongoDB
                    if question.get('copy_of'):
                        try:
                            # Validate that the original question still exists
                            original_exists = db.questions.find_one({"_id": ObjectId(question['copy_of'])})
                            if not original_exists:
                                # Original question doesn't exist anymore, remove the reference
                                print(f"Original question not found for copy_of: {question['copy_of']}")
                                question['copy_of'] = None
                        except Exception as e:
                            # If there's any error (invalid ObjectId, etc.), remove the reference
                            print(f"Error checking copy_of reference: {e}")
                            question['copy_of'] = None
                    
                    questions_with_valid_data.append(question)
                
                # Replace original questions with validated ones
                questions = questions_with_valid_data
                
            except Exception as e:
                print(f"Error parsing/validating questions: {e}")
                questions = []
            
            return {
                "identifier": quiz_data.get("identifier"),
                "name": quiz_data.get("name"),
                "questions": questions,
                "quiz_type": quiz_data.get("quiz_type"),
                "is_editing": quiz_data.get("is_editing"),
                "original_quiz_id": quiz_data.get("original_quiz_id"),
                "last_updated": quiz_data.get("last_updated"),
                "media_validation_performed": True  # Flag to indicate media was checked
            }
        except Exception as e:
            print(f"Error retrieving unfinished quiz: {e}")
            return None
    
    @staticmethod
    def delete_unfinished_quiz(identifier: str, keep_files: bool = False) -> bool:
        """
        Delete an unfinished quiz by identifier and optionally clean up associated media files
        
        Args:
            identifier: The identifier of the unfinished quiz
            keep_files: If True, don't delete media files (used when quiz was successfully created)
        """
        if not local_db:
            print("Local database not available")
            return False
        
        try:
            device_id = get_device_id()
            Quiz = Query()
            
            # First, fetch the quiz to get its questions for media cleanup
            quiz_data = UnfinishedQuizService.get_unfinished_quiz(identifier)
            if quiz_data and quiz_data.get('questions') and not keep_files:
                # Only delete files if keep_files is False
                # Check if this is an edit of an existing quiz
                is_editing = quiz_data.get('is_editing', False)
                original_quiz_id = quiz_data.get('original_quiz_id')
                
                # Collect media URLs that need to be deleted
                media_urls_to_delete = set()
                
                # Get all questions with media
                questions_with_media = [q for q in quiz_data['questions'] if q.get('mediaUrl')]
                
                if is_editing and original_quiz_id:
                    # This is an edit of an existing quiz
                    # Get the original quiz to compare media URLs
                    try:
                        # Use MongoDB to get the original quiz
                        original_quiz = db.quizzes.find_one({"_id": original_quiz_id})
                        if original_quiz:
                            original_question_ids = {str(q_ref['questionId']) for q_ref in original_quiz.get('questions', [])}
                            
                            # Get all original questions' media URLs
                            original_media_urls = set()
                            if original_question_ids:
                                original_questions = db.questions.find({"_id": {"$in": original_question_ids}})
                                original_media_urls = {q.get('media_url') for q in original_questions if q.get('media_url')}
                            
                            # Only delete media URLs that are not in the original quiz
                            for question in questions_with_media:
                                if question.get('mediaUrl') and question.get('mediaUrl') not in original_media_urls:
                                    # This is a newly added media file
                                    media_urls_to_delete.add(question.get('mediaUrl'))
                    except Exception as e:
                        print(f"Error getting original quiz: {e}")
                        # If we can't get original quiz, assume all media is new
                        media_urls_to_delete = {q.get('mediaUrl') for q in questions_with_media}
                else:
                    # This is a new quiz, delete all media
                    media_urls_to_delete = {q.get('mediaUrl') for q in questions_with_media}
                
                # Delete all collected media URLs
                for url in media_urls_to_delete:
                    if url:
                        try:
                            CloudinaryService.delete_file(url)
                            print(f"Deleted media file: {url}")
                        except Exception as e:
                            print(f"Error deleting media file {url}: {e}")
            
            # Now delete the quiz from local DB
            local_db['unfinished_quizzes'].remove(
                (Quiz.identifier == identifier) & 
                (Quiz.device_id == device_id)
            )
            
            return True
        except Exception as e:
            print(f"Error deleting unfinished quiz: {e}")
            return False
