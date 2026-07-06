import io
from docx import Document as DocxDocument
import structlog

logger = structlog.get_logger(__name__)

class DocumentParser:
    """
    Service responsible for parsing binary word documents into text chunks.
    Chunking strategy: Paragraph-based, filtering out empty ones.
    """
    
    @staticmethod
    def parse_docx(file_bytes: bytes) -> list[str]:
        """
        Parses a .docx file and returns a list of paragraph texts (chunks).
        """
        logger.info("parsing_docx_started", byte_size=len(file_bytes))
        
        try:
            doc = DocxDocument(io.BytesIO(file_bytes))
            chunks = []
            
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                    
                # Strict Semantic Chunking (Max 500 chars per chunk)
                if len(text) > 500:
                    sentences = text.split('. ')
                    current_chunk = ""
                    for sentence in sentences:
                        if len(current_chunk) + len(sentence) < 500:
                            current_chunk += sentence + ". "
                        else:
                            if current_chunk:
                                chunks.append(current_chunk.strip())
                            current_chunk = sentence + ". "
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                else:
                    chunks.append(text)
                    
            logger.info("parsing_docx_success", total_chunks=len(chunks))
            return chunks
        except Exception as e:
            logger.error("parsing_docx_failed", error=str(e))
            raise ValueError(f"Failed to parse document: {str(e)}")
