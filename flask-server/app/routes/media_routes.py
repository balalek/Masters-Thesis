"""Media handling routes for the quiz application (for Open Answer question type).
Provides endpoints for uploading to and deleting from Cloudinary.
Supports different media types with appropriate optimizations.
"""
from flask import Blueprint, jsonify, request
from ..services.cloudinary_service import CloudinaryService

media_routes = Blueprint('media_routes', __name__)

@media_routes.route('/upload_media', methods=['POST'])
def upload_media():
    """
    Upload media files to Cloudinary and return the URL.
    
    Handles both image and audio file uploads with appropriate optimizations.
    Images are optimized with auto quality and format.
    Audio files are stored in a separate folder.
    
    Request body:

        file: The media file to upload (multipart/form-data)
    
    Returns:
        200 JSON: 
        
            - url: URL to access the uploaded file
            - public_id: Cloudinary public ID
            - resource_type: Type of resource (image/video)
            - format: File format
        400 JSON: Error if file is missing
        500 JSON: Error if upload fails
    """
    if 'file' not in request.files:
        return jsonify({"error": "Žádný soubor nebyl vybrán"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "Žádný soubor nebyl vybrán"}), 400
    
    try:
        # Determine if it's image or audio based on mimetype
        mimetype = file.mimetype
        resource_type = "auto"
        folder = "quiz_media"
        transformation = None
        
        # Prepare optimized transformations based on file type
        if mimetype.startswith('image/'):
            resource_type = "image"
            # Set automatic quality and format optimization for images
            transformation = {"quality": "auto", "fetch_format": "auto"}
        elif mimetype.startswith('audio/'):
            resource_type = "video"  # Cloudinary uses "video" type for audio too
            folder = "quiz_audio"
        
        # Upload to Cloudinary
        result = CloudinaryService.upload_file(
            file,
            folder=folder,
            resource_type=resource_type,
            transformation=transformation
        )
        
        # Return the secure URL and other needed metadata
        return jsonify({
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": resource_type,
            "format": result["format"]
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@media_routes.route('/delete_media', methods=['POST'])
def delete_media():
    """
    Delete a media file from Cloudinary.
    
    Request body (JSON):
    
        url: The URL of the file to delete
    
    Returns:
        200 JSON: Confirmation message if deletion succeeds
        400 JSON: Error if URL is missing
        500 JSON: Error if deletion fails
    """
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Žádné URL nebylo poskytnuto"}), 400
        
    try:
        success = CloudinaryService.delete_file(url)

        if success:
            return jsonify({"message": "File deleted successfully"}), 200
        
        return jsonify({"error": "Smazání souboru selhalo"}), 500
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500