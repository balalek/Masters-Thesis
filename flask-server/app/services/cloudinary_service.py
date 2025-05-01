"""Cloudinary integration service for the quiz application.
Provides methods for managing media assets (images and audio)
through Cloudinary's cloud storage. Handles uploads, optimizations,
transformations, deletion, and existence checks.
"""
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os # Keep
from typing import  Dict, Any
from flask import current_app

class CloudinaryService:
    """
    Service for managing media assets through Cloudinary.
    
    This class provides a collection of static methods for interacting
    with the Cloudinary API to handle media operations including:
    
    - File uploads with configurable parameters
    - URL transformations for image/audio optimization
    - Asset deletion with usage checks
    - Asset existence verification
    
    All methods are stateless and use the Cloudinary API directly,
    requiring proper environment configuration via CLOUDINARY_URL.
    """
    
    @staticmethod
    def initialize():
        """
        Initialize Cloudinary with environment variables
        
        Place your Cloudinary URL in environment variables or .env file:
        CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
        """
        # Cloudinary automatically reads from CLOUDINARY_URL environment variable
        cloudinary.config(secure=True)
        
    @staticmethod
    def upload_file(file_data, folder="quiz_media", resource_type="auto", 
                   transformation=None) -> Dict[str, Any]:
        """
        Upload a file to Cloudinary
        
        Args:
            file_data: The file data to upload
            folder: The folder to store the file in
            resource_type: auto, image, video, raw
            transformation: Optional transformation parameters
            
        Returns:
            Dict containing upload information including 'url' and 'public_id'
        """
        # Initialize Cloudinary if not already done
        CloudinaryService.initialize()
        
        upload_params = {
            "folder": folder,
            "resource_type": resource_type,
            "type": "upload",
            "access_mode": "authenticated",  # Makes files unlisted
            "unique_filename": True,  # Ensures unique filenames
            "overwrite": False  # Prevents overwriting existing files
        }
        
        # Add transformation if provided
        if transformation:
            upload_params["transformation"] = transformation
            
        # Upload the file
        try:
            result = cloudinary.uploader.upload(file_data, **upload_params)
            return result
        
        except Exception as e:
            current_app.logger.error(f"Cloudinary upload error: {str(e)}")
            raise

    @staticmethod
    def delete_file(url: str, db=None) -> bool:
        """
        Delete a file from Cloudinary
        
        Args:
            url: The Cloudinary URL of the file to delete
            db: Optional MongoDB database instance to check if the file is used by other questions
        
        Returns:
            bool: True if deletion was successful or file is still in use by other questions,
                  False if deletion failed or URL was invalid
        """
        if not url or 'res.cloudinary.com' not in url:
            current_app.logger.error(f"Invalid URL for deletion: {url}")
            return False
            
        try:
            # Only check usage if db is provided and check_usage is True
            if db is not None:
                count = db.questions.count_documents({'media_url': url})
                if count > 1:  # If more than one document has this URL
                    current_app.logger.info(f"File {url} is still being used by {count-1} other questions, skipping deletion")
                    return True

            # Extract public_id from URL
            parts = url.split('/upload/')
            if len(parts) != 2:
                current_app.logger.error(f"Invalid URL format: {url}")
                return False
                
            # Detect resource type based on folder
            resource_type = 'image'
            if 'quiz_audio' in parts[1]:
                resource_type = 'video'
            
            # Extract public_id without version and extension
            folder_and_filename = parts[1].split('/', 1)[1]
            public_id = folder_and_filename.rsplit('.', 1)[0]
            
            # Delete the file with proper resource_type
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type,
                invalidate=True
            )
            
            success = result.get('result') == 'ok'
            current_app.logger.info(f"Deletion result for {url}: {result}")

            return success
            
        except Exception as e:
            current_app.logger.error(f"Cloudinary delete error for URL {url}: {str(e)}")
            return False

    @staticmethod
    def check_file_exists(url: str) -> bool:
        """
        Check if a file exists in Cloudinary
        
        Args:
            url: The Cloudinary URL of the file
            
        Returns:
            bool: True if file exists, False otherwise
        """
        if not url or 'res.cloudinary.com' not in url:
            return False
            
        try:
            # Extract public_id and resource_type from URL
            parts = url.split('/upload/')
            if len(parts) != 2:
                return False
            
            # Handle version number in path
            path_part = parts[1]
            if '/' in path_part and path_part.split('/')[0].startswith('v'):
                path_part = path_part.split('/', 1)[1]
            
            # Determine resource_type based on folder
            resource_type = 'image'
            if 'quiz_audio' in path_part:
                resource_type = 'video'  # Cloudinary uses video type for audio
            
            # Extract public_id without extension
            public_id = path_part.rsplit('.', 1)[0]
            
            # Check if asset exists
            CloudinaryService.initialize()
            result = cloudinary.api.resource(public_id, resource_type=resource_type)

            return bool(result and result.get('public_id'))
        
        except cloudinary.exceptions.NotFound:
            return False
        
        except Exception as e:
            current_app.logger.error(f"Error checking if file exists in Cloudinary: {str(e)}")
            return False