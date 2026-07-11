import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from backend.app.shared.domain.models import TimestampMixin
from backend.app.shared.infrastructure.database import Base

class Document(Base, TimestampMixin):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="DRAFT", nullable=False)

class Version(Base, TimestampMixin):
    __tablename__ = "versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    file_url = Column(String(1024), nullable=False)

from sqlalchemy import Index

class Chunk(Base, TimestampMixin):
    __tablename__ = "chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    # 768 dimensions for Gemini text-embedding-004
    embedding = Column(Vector(768))

    __table_args__ = (
        Index(
            'idx_chunk_embedding', 
            embedding, 
            postgresql_using='hnsw', 
            postgresql_with={'m': 16, 'ef_construction': 64}, 
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
    )

class PlagiarismMatch(Base, TimestampMixin):
    __tablename__ = "plagiarism_matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    matched_url = Column(String(1024))
    similarity_score = Column(Float, nullable=False)

class ParaphraseEdit(Base, TimestampMixin):
    __tablename__ = "paraphrase_edits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=False)

class TextEnhancementEdit(Base, TimestampMixin):
    __tablename__ = "text_enhancement_edits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    original_text = Column(Text, nullable=False)
    enhanced_text = Column(Text, nullable=False)
    changes_summary = Column(Text)  # JSON-encoded list of change descriptions

class FormatIssue(Base, TimestampMixin):
    __tablename__ = "format_issues"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.id", ondelete="CASCADE"), nullable=False)
    issue_description = Column(Text, nullable=False)

class ChangeReport(Base, TimestampMixin):
    __tablename__ = "change_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.id", ondelete="CASCADE"), nullable=False, unique=True)
    overall_readiness_score = Column(Float)
    summary = Column(Text)

class DownloadTicket(Base, TimestampMixin):
    __tablename__ = "download_tickets"
    
    from sqlalchemy import DateTime
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.id", ondelete="CASCADE"), nullable=False, index=True)
    mode = Column(String(20), nullable=False) # 'FAST' or 'NORMAL'
    ready_at = Column(DateTime, nullable=False)
