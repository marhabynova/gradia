import structlog
from sqlalchemy.orm import Session
from backend.app.shared.infrastructure.gemini_client import GeminiCostController
from backend.app.shared.infrastructure.local_embedding import LocalEmbeddingService
from backend.app.module_a_student.domain.models import Chunk, Version

logger = structlog.get_logger(__name__)

class AIPipeline:
    """
    Handles background processing of documents (Embeddings and Paraphrasing).
    """

    @staticmethod
    def process_document_background(version_id: str, db: Session):
        """
        Background task to process all chunks of a newly uploaded document version.
        Generates vector embeddings for plagiarism search.
        """
        logger.info("background_ai_pipeline_started", version_id=version_id)
        try:
            chunks = db.query(Chunk).filter(Chunk.version_id == version_id).all()
            
            # Batch processing could be optimized further with ThreadPoolExecutor
            # if Gemini API allows high concurrency.
            processed_count = 0
            for chunk in chunks:
                if not chunk.embedding:
                    # Fetch embedding locally (ZERO API COST)
                    vector = LocalEmbeddingService.embed_content(chunk.chunk_text)
                    chunk.embedding = vector
                    processed_count += 1
            
            db.commit()
            logger.info("background_ai_pipeline_finished", version_id=version_id, chunks_embedded=processed_count)
            
            # Immediately trigger plagiarism search after embeddings are ready
            cls.run_plagiarism_check(version_id, db)
            
        except Exception as e:
            db.rollback()
            logger.error("background_ai_pipeline_failed", version_id=version_id, error=str(e))

    @classmethod
    def run_plagiarism_check(cls, version_id: str, db: Session, similarity_threshold: float = 0.2):
        """
        Searches the vector database for chunks that are too similar to existing corpus.
        Cosine distance: 0 means exactly the same, 1 means completely different.
        """
        from backend.app.module_a_student.domain.models import PlagiarismMatch
        
        logger.info("plagiarism_check_started", version_id=version_id)
        try:
            chunks = db.query(Chunk).filter(Chunk.version_id == version_id).all()
            matches_found = 0
            
            for chunk in chunks:
                if chunk.embedding is None:
                    continue
                
                # Search for chunks NOT from the same version that are very similar
                similar_chunks = db.query(Chunk).filter(
                    Chunk.version_id != version_id,
                    Chunk.embedding.cosine_distance(chunk.embedding) < similarity_threshold
                ).limit(3).all()
                
                for sim in similar_chunks:
                    # In real-world, we'd cross reference with external APIs too (Copyleaks)
                    # For now, we save the internal corpus matches.
                    match = PlagiarismMatch(
                        chunk_id=chunk.id,
                        matched_url=f"internal_doc_version:{sim.version_id}",
                        similarity_score=1.0 - 0.2 # Rough conversion from distance to score
                    )
                    db.add(match)
                    matches_found += 1
            
            db.commit()
            logger.info("plagiarism_check_finished", version_id=version_id, matches_found=matches_found)
        except Exception as e:
            db.rollback()
            logger.error("plagiarism_check_failed", version_id=version_id, error=str(e))

    @staticmethod
    async def paraphrase_text(original_text: str, user_id: str, db: Session) -> str:
        """
        Premium users get 'The Laundromat' (Translation Looping) + Auto-Citations.
        Free users get basic 1-shot paraphrase.
        """
        from backend.app.shared.domain.models import User, UserTier
        from backend.app.module_a_student.services.laundromat_service import LaundromatService
        from backend.app.module_a_student.services.citation_service import CitationService
        
        user = db.query(User).filter(User.id == user_id).first()
        is_premium = user and user.tier == UserTier.PREMIUM
        
        if is_premium:
            # Ghostwriter Pipeline (Killer Feature)
            # 1. Translation Looping to destroy AI Watermarks
            washed_text = await LaundromatService.process_laundromat(original_text)
            # 2. Inject Real Journals
            final_text = await CitationService.inject_citations(washed_text)
            return final_text
        else:
            # Basic Pipeline for Free Users (Strict Token Limits)
            prompt = f"""
            Anda adalah seorang asisten akademik profesional dan ahli linguistik yang bertugas menyempurnakan dokumen.
            Tugas Anda adalah memparafrase teks asli di bawah ini dengan mematuhi standar PUEBI/EYD yang kaku.
            
            Teks Asli:
            {original_text}
            """
            return GeminiCostController.generate_content(prompt, requires_advanced_reasoning=False, max_tokens=300)
