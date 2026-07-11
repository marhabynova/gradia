import os
import structlog
from sqlalchemy.orm import Session
from fastapi import UploadFile
from backend.app.module_a_student.domain.models import Document, Version, Chunk
from backend.app.module_a_student.services.document_parser import DocumentParser
from backend.app.module_a_student.services.ai_pipeline import AIPipeline
from backend.app.shared.infrastructure.storage import StorageService
from fastapi import BackgroundTasks

logger = structlog.get_logger(__name__)

class DocumentService:
    """
    Coordinates the document upload, parsing, and storage logic.
    """

    @staticmethod
    async def process_upload(file: UploadFile, user_id: str, db: Session, background_tasks: BackgroundTasks) -> dict:
        """
        Processes an uploaded file, chunks it, and stores the metadata.
        Returns the document ID and total chunks created.
        """
        file_bytes = await file.read()

        # 1. Parse into chunks
        chunks_text = DocumentParser.parse_docx(file_bytes)

        # 2. Database Transactions
        # Create Document Master
        new_doc = Document(
            user_id=user_id,
            title=file.filename,
            status="UPLOADED"
        )
        db.add(new_doc)
        db.flush() # flush to get the new_doc.id

        # Create Initial Version (file_url filled in after upload, once we have a safe storage key)
        new_version = Version(
            document_id=new_doc.id,
            version_number=1,
            file_url=""
        )
        db.add(new_version)
        db.flush() # flush to get new_version.id

        # 1.5 Upload to Google Cloud Storage - use the version UUID as the blob name
        # (not the raw filename) to prevent path traversal / blob-key injection and
        # filename collisions between users. Original filename is preserved in Document.title.
        _, ext = os.path.splitext(file.filename or "")
        safe_ext = ext if len(ext) <= 10 and all(c.isalnum() or c == '.' for c in ext) else ""
        storage_key = f"documents/{user_id}/{new_version.id}{safe_ext}"
        gcs_url = StorageService.upload_file_to_gcs(file_bytes, storage_key)
        new_version.file_url = gcs_url
        
        # Create Chunks
        db_chunks = []
        for text in chunks_text:
            db_chunks.append(
                Chunk(
                    version_id=new_version.id,
                    chunk_text=text
                )
            )
        
        db.add_all(db_chunks)
        db.commit()
        
        logger.info("document_processed_successfully", document_id=str(new_doc.id), chunks_count=len(chunks_text))
        
        # 3. Trigger Async AI Pipeline (Embeddings)
        background_tasks.add_task(AIPipeline.process_document_background, str(new_version.id), db)
        
        return {
            "document_id": str(new_doc.id),
            "version_id": str(new_version.id),
            "total_chunks": len(chunks_text)
        }
