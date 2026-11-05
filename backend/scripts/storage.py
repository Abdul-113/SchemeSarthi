import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

def get_supabase_client():
    """Get a Supabase client instance."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    return create_client(url, key)

def upload_document(file_bytes, original_filename, content_type="application/octet-stream"):
    """
    Upload a document to Supabase Storage.
    Falls back to local 'uploads' folder if Supabase configuration or connection fails.
    Returns the public URL (or local path) of the uploaded file.
    """
    ext = original_filename.split(".")[-1] if "." in original_filename else "bin"
    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    
    try:
        supabase = get_supabase_client()
        storage_path = f"uploads/{unique_name}"
        
        # Upload to the 'documents' bucket
        response = supabase.storage.from_("documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        # Get public URL
        public_url = supabase.storage.from_("documents").get_public_url(storage_path)
        return public_url
        
    except Exception as e:
        print(f"[STORAGE WARNING] Supabase upload failed ({e}). Falling back to local storage.")
        
        # Local fallback
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        local_path = os.path.join(uploads_dir, unique_name)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
            
        print(f"[STORAGE] File saved locally at: {local_path}")
        return f"local://{local_path}"
