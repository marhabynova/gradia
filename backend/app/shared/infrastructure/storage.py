import os
import structlog
from google.cloud import storage

logger = structlog.get_logger(__name__)

GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "gradia-student-documents-dummy-bucket")

class StorageService:
    """
    Handles uploading documents to Google Cloud Storage (GCS).
    """
    @staticmethod
    def upload_file_to_gcs(file_bytes: bytes, filename: str) -> str:
        """
        Uploads a file to GCS and returns the public URL or gs:// URI.
        Mocked to return a dummy URL if GCP credentials are not found.
        """
        logger.info("upload_to_gcs_started", filename=filename, byte_size=len(file_bytes))
        
        try:
            # Initialize GCS client (requires GOOGLE_APPLICATION_CREDENTIALS env var)
            client = storage.Client()
            bucket = client.bucket(GCS_BUCKET_NAME)
            blob = bucket.blob(filename)
            
            blob.upload_from_string(file_bytes)
            
            public_url = blob.public_url
            logger.info("upload_to_gcs_success", url=public_url)
            return public_url
            
        except Exception as e:
            logger.warning("gcs_upload_failed_using_mock", error=str(e))
            # Fallback for local development if no credentials exist
            mock_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/mock/{filename}"
            return mock_url

    @staticmethod
    def generate_signed_url(url: str, expiration_minutes: int = 10) -> str:
        """
        Takes a public/mock URL and returns a Signed URL.
        For MVP, if it's a mock URL, it just appends a fake signature.
        """
        import datetime
        try:
            # Check if it's our mock URL
            if "/mock/" in url:
                return f"{url}?Signature=DUMMY_SIGNATURE_EXPIRES_{expiration_minutes}M"
                
            client = storage.Client()
            bucket = client.bucket(GCS_BUCKET_NAME)
            # Extract filename from url
            filename = url.split(f"/{GCS_BUCKET_NAME}/")[-1]
            blob = bucket.blob(filename)
            
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(minutes=expiration_minutes),
                method="GET"
            )
            return signed_url
        except Exception as e:
            logger.warning("gcs_signed_url_failed", error=str(e))
            return f"{url}?FallbackSignature=1"
