import os
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, InternalServerError

logger = structlog.get_logger(__name__)

# Basic Setup (Needs API Key from env)
API_KEY = os.getenv("GEMINI_API_KEY", "dummy-key-for-now")
genai.configure(api_key=API_KEY)

class GeminiCostController:
    """
    Handles Model Routing and Token Budgeting based on AGENTS.md rules.
    Default to Flash-Lite for simple tasks, Pro only for complex reasoning.
    """
    DEFAULT_MODEL = "gemini-2.5-flash-lite"
    ADVANCED_MODEL = "gemini-2.5-pro"
    
    @classmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((ResourceExhausted, InternalServerError))
    )
    def generate_content(cls, prompt: str, requires_advanced_reasoning: bool = False, max_tokens: int = 500) -> str:
        """
        Executes a Gemini API call with Circuit Breaker (Retry + Backoff) and strict cost limits.
        """
        model_name = cls.ADVANCED_MODEL if requires_advanced_reasoning else cls.DEFAULT_MODEL
        logger.info("gemini_api_call_started", model=model_name, prompt_length=len(prompt), max_tokens=max_tokens)
        
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=max_tokens,
                )
            )
            logger.info("gemini_api_call_success", model=model_name, tokens_used=response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else "unknown")
            return response.text
        except Exception as e:
            logger.error("gemini_api_call_failed", model=model_name, error=str(e))
            raise

    @classmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=5),
        retry=retry_if_exception_type((ResourceExhausted, InternalServerError))
    )
    def embed_content(cls, text: str) -> list[float]:
        """
        Generates text embeddings using Gemini embedding model.
        Returns a 768-dimensional float array (Note: Gemini text-embedding-004 outputs 768d).
        """
        logger.info("gemini_embedding_call_started", text_length=len(text))
        try:
            # Using the latest recommended embedding model
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            embedding = result['embedding']
            logger.info("gemini_embedding_call_success", dimensions=len(embedding))
            return embedding
        except Exception as e:
            logger.error("gemini_embedding_call_failed", error=str(e))
            raise

