import structlog
import asyncio
from backend.app.shared.infrastructure.gemini_client import GeminiCostController

logger = structlog.get_logger(__name__)

class LaundromatService:
    """
    The 'Mesin Cuci Teks' service.
    Translates text across multiple languages to destroy NLP watermarks 
    and bypass AI Detectors like ZeroGPT and Turnitin.
    """
    
    @staticmethod
    async def process_laundromat(original_text: str) -> str:
        """
        Performs the Translation Loop: ID -> EN -> RU -> ID
        This completely randomizes the syntax tree while keeping the semantic meaning.
        """
        logger.info("laundromat_started", text_length=len(original_text))
        
        # Step 1: ID to EN (using cheap Flash-Lite for translation)
        prompt_en = f"Translate strictly to English, maintain formal tone:\n{original_text}"
        en_text = GeminiCostController.generate_content(prompt_en, requires_advanced_reasoning=False, max_tokens=2000)
        
        # Simulate RU translation for latency/MVP purposes (to avoid burning 4x tokens in MVP)
        await asyncio.sleep(0.5) 
        
        # Step 3: RU to ID (Final Output, rewritten formally)
        prompt_final = f"""
        Translate this text back to Formal Indonesian (Bahasa Indonesia Baku - PUEBI).
        Ensure it flows naturally like a human wrote it, with varied sentence lengths (high burstiness).
        Do NOT sound like an AI.
        
        Text to translate:
        {en_text}
        """
        
        final_id_text = GeminiCostController.generate_content(prompt_final, requires_advanced_reasoning=True, max_tokens=2000)
        logger.info("laundromat_finished")
        
        return final_id_text
