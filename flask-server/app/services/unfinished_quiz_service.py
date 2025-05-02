"""Unfinished quiz management service.

This module provides functionality for handling quizzes that are being created or edited (the drafts):

- Saving quiz drafts to local storage during creation/editing drafts
- Retrieving saved drafts for resuming work
- Managing autosave functionality
- Validating and cleaning up media files for incomplete quizzes
- Deleting drafts and associated resources

The service uses TinyDB for local storage to persist quiz data between sessions.
"""
from ..local_db import local_db
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import json
from tinydb import Query
from ..utils import get_device_id
from .cloudinary_service import CloudinaryService
from ..db import db
from bson import ObjectId

class UnfinishedQuizService:
    """
    Service for managing unfinished (draft) quizzes in local storage.
    
    Provides methods for saving, retrieving, and deleting quiz drafts,
    with support for autosave functionality and media validation.
    All operations are tied to the current device ID to ensure privacy.
    """
    
    @staticmethod
    def save_unfinished_quiz(quiz_data: Dict[str, Any], is_editing: bool = False, 
                           quiz_id: Optional[str] = None, autosave_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Save or update an unfinished quiz in the local database.
        
        Handles both new quiz drafts and updates to existing drafts.
        Generates a unique identifier for new drafts or uses the provided autosave_id.
        
        Args:
            quiz_data: Dictionary containing the quiz data to save
            is_editing: Whether this is an edit of an existing quiz
            quiz_id: ID of the original quiz being edited (if applicable)
            autosave_id: Existing autosave identifier for updates
            
        Returns:
            tuple: (success_boolean, autosave_identifier)
                   
                   (False, None) if saving fails
        """
        # Don't save if we're editing an existing quiz, since it's not implemented
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
                # Use a more distinctive format to avoid hash collisions
                timestamp = int(datetime.now().timestamp())
                unique_hash = abs(hash(str(quiz_data) + str(timestamp)))
                identifier = f"quiz_{timestamp}_{unique_hash}"
            
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
                "creation_time": datetime.now().isoformat() # Track when it was first created
            }
            
            # Check if this quiz already exists by identifier
            Quiz = Query()
            
            try:
                # First check if our unfinished_quizzes table is accessible
                if not isinstance(local_db['unfinished_quizzes'], object):
                    print("ERROR: unfinished_quizzes table is not properly initialized")
                    return False, None
                
                # Use a transaction-like approach to ensure data integrity
                existing = local_db['unfinished_quizzes'].search(Quiz.identifier == identifier)
                
                if existing:
                    # Update existing record
                    result = local_db['unfinished_quizzes'].update(save_data, Quiz.identifier == identifier)
                    print(f"Updated existing quiz draft: {identifier}, result: {result}")
                else:
                    # Create new record - use insert instead of upsert to avoid potential overwrites
                    doc_id = local_db['unfinished_quizzes'].insert(save_data)
                    print(f"Created new quiz draft with ID: {identifier}, doc_id: {doc_id}")
                
                # Force a storage flush to ensure data is written to disk
                if hasattr(local_db['unfinished_quizzes'].storage, 'flush'):
                    local_db['unfinished_quizzes'].storage.flush()
                
                # Verify the save was successful
                verification = local_db['unfinished_quizzes'].search(Quiz.identifier == identifier)
                if not verification:
                    print(f"WARNING: Failed to verify saved quiz with identifier {identifier}")
                    return False, None
                
                return True, identifier
            except Exception as inner_e:
                print(f"Database operation error: {inner_e}")
                return False, None
        
        except Exception as e:
            print(f"Error saving unfinished quiz: {e}")
            return False, None
    
    @staticmethod
    def get_unfinished_quizzes() -> List[Dict[str, Any]]:
        """
        Get all unfinished quizzes for the current device.
        
        Retrieves all saved drafts associated with the current device ID,
        sorted by last update time (newest first).
        
        Returns:
            list: List of quiz draft metadata dictionaries with:

                 - identifier: Unique ID for the draft
                 - name: Quiz title
                 - is_editing: Whether this is an edit of an existing quiz
                 - original_quiz_id: ID of the original quiz being edited
                 - last_updated: Timestamp of last save
                 - question_count: Number of questions in the draft
        """
        if not local_db:
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
        Get a specific unfinished quiz by identifier.
        
        Retrieves a complete quiz draft including all questions.
        Performs validation on media URLs and question references to ensure
        all referenced resources still exist.
        
        Args:
            identifier: The unique identifier of the quiz draft
            
        Returns:
            dict: Complete quiz draft with validated questions, or None if not found. 
                  The returned quiz includes:

                  - identifier: Unique ID
                  - name: Quiz title
                  - questions: List of question objects
                  - quiz_type: Type of quiz
                  - is_editing: Whether this is an edit of an existing quiz
                  - original_quiz_id: ID of the original quiz being edited
                  - last_updated: Timestamp of last save
        """
        if not local_db:
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
        Delete an unfinished quiz and optionally its associated media files.
        
        Removes the quiz draft from local storage and optionally cleans up
        any media files that were uploaded specifically for this draft.
        
        Args:
            identifier: The unique identifier of the quiz draft
            keep_files: If True, don't delete media files (used when quiz was completed)
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        if not local_db:
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

                        except Exception as e:
                            print(f"Error deleting media file {url}: {e}")
            
            # Now delete the quiz from local DB
            result = local_db['unfinished_quizzes'].remove(
                (Quiz.identifier == identifier) & 
                (Quiz.device_id == device_id)
            )
            
            # Force a flush to disk to ensure the deletion is persisted
            if hasattr(local_db['unfinished_quizzes'].storage, 'flush'):
                local_db['unfinished_quizzes'].storage.flush()
            
            # Double-check the item was actually removed
            verification = local_db['unfinished_quizzes'].search(
                (Quiz.identifier == identifier) & 
                (Quiz.device_id == device_id)
            )
            
            if verification:
                print(f"Warning: Quiz {identifier} appears to still exist after deletion")
                return False
            
            print(f"Successfully deleted quiz {identifier}, db reported {result} items removed")
            return True
            
        except Exception as e:
            print(f"Error deleting unfinished quiz: {e}")
            return False