import structlog
import random

logger = structlog.get_logger(__name__)

class LocalEmbeddingService:
    """
    Simulates a local Sentence-Transformers model running in CPU/RAM.
    This eliminates API costs for background plagiarism checks.
    In production, this would use: `sentence_transformers.SentenceTransformer('all-MiniLM-L6-v2')`
    """
    
    @staticmethod
    def embed_content(text: str) -> list[float]:
        """
        Generates text embeddings LOCALLY.
        Returns a 768-dimensional float array to match pgvector config.
        """
        # logger.info("local_embedding_started", text_length=len(text))
        
        # Simulate generating a 768d vector locally (Zero API cost)
        embedding = [random.uniform(-1.0, 1.0) for _ in range(768)]
        
        return embedding
