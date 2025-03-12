import cloudinary
import cloudinary.uploader
import cloudinary.api
from typing import Optional, Dict, Any
import os
import mimetypes
from flask import current_app

class CloudinaryService:
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
            "type": "upload",  # Use 'upload' instead of 'public'
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
    def optimize_image_url(url: str, width: int = 800, quality: int = 'auto') -> str:
        """
        Get an optimized image URL with Cloudinary transformations
        
        Args:
            url: Original Cloudinary URL
            width: Desired width in pixels
            quality: Quality setting (auto for automatic optimization)
            
        Returns:
            Optimized image URL with transformations
        """
        if not url or not url.startswith('http'):
            return url
            
        # Check if this is a Cloudinary URL
        if 'res.cloudinary.com' not in url:
            return url
            
        # Apply transformations to the URL
        # Format: .../image/upload/c_scale,w_800,q_auto/v123/folder/image.jpg
        parts = url.split('/upload/')
        if len(parts) != 2:
            return url
            
        return f"{parts[0]}/upload/c_scale,w_{width},q_{quality}/{parts[1]}"
    
    @staticmethod
    def optimize_audio_url(url: str, format: str = 'mp3') -> str:
        """
        Get an optimized audio URL with Cloudinary transformations
        
        Args:
            url: Original Cloudinary URL
            format: Desired audio format
            
        Returns:
            Optimized audio URL
        """
        if not url or not url.startswith('http'):
            return url
            
        # Check if this is a Cloudinary URL
        if 'res.cloudinary.com' not in url:
            return url
            
        # Apply transformations to the URL
        parts = url.split('/upload/')
        if len(parts) != 2:
            return url
            
        return f"{parts[0]}/upload/q_auto/{parts[1]}"

    @staticmethod
    def delete_file(url: str, db=None) -> bool:
        """Delete a file from Cloudinary using its URL if no other questions are using it"""
        if not url or 'res.cloudinary.com' not in url:
            current_app.logger.error(f"Invalid URL for deletion: {url}")
            return False
            
        try:
            # Check if any other questions are using this URL
            if db is not None:
                count = db.questions.count_documents({'media_url': url})
                if count > 1:  # If more than one document has this URL
                    current_app.logger.info(f"File {url} is still being used by {count-1} other questions, skipping deletion")
                    return True

            parts = url.split('/upload/')
            if len(parts) != 2:
                current_app.logger.error(f"Invalid URL format: {url}")
                return False
                
            # Detect resource type based on folder
            resource_type = 'image'
            if 'quiz_audio' in parts[1]:
                resource_type = 'video'
            
            current_app.logger.info(f"Deleting file: {url}")
            current_app.logger.info(f"Resource type: {resource_type}")
                
            # Extract public_id without version and extension
            folder_and_filename = parts[1].split('/', 1)[1]
            public_id = folder_and_filename.rsplit('.', 1)[0]
            
            current_app.logger.info(f"Public ID: {public_id}")
            
            # Delete the file with proper resource_type
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type,
                invalidate=True  # Add this to ensure the file is removed from CDN
            )
            
            current_app.logger.info(f"Deletion result: {result}")
            return result.get('result') == 'ok'
        except Exception as e:
            current_app.logger.error(f"Cloudinary delete error for URL {url}: {str(e)}")
            return False
