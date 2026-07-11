import json
import structlog
from backend.app.shared.infrastructure.gemini_client import GeminiCostController

logger = structlog.get_logger(__name__)

class WritingAssistantService:
    """
    Academic Writing Assistant: improves grammar, vocabulary, and structural
    clarity of a passage while preserving its meaning, citations, and facts.
    This is a single-pass editing aid, not a similarity/detection evasion tool.
    """

    @staticmethod
    def enhance_text(original_text: str) -> dict:
        prompt = f"""
        Anda adalah editor akademik profesional. Perbaiki kualitas tulisan berikut dari sisi
        tata bahasa (PUEBI/EYD), pilihan kosakata, dan kejelasan struktur kalimat.

        Aturan ketat:
        - JANGAN mengubah makna, fakta, data, atau kutipan/sitasi yang ada di dalam teks.
        - JANGAN meringkas atau menghapus informasi.
        - Fokus murni pada kualitas penulisan (grammar, diksi, alur kalimat).

        Teks Asli:
        {original_text}

        Balas HANYA dengan JSON murni tanpa markdown, dengan format:
        {{"enhanced_text": "teks hasil perbaikan", "changes": ["deskripsi singkat perbaikan 1", "deskripsi singkat perbaikan 2"]}}
        """

        response_text = GeminiCostController.generate_content(
            prompt, requires_advanced_reasoning=True, max_tokens=1500
        )

        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()

        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            logger.error("writing_assistant_json_parse_failed", response=response_text)
            data = {"enhanced_text": original_text, "changes": []}

        return {
            "enhanced_text": data.get("enhanced_text", original_text),
            "changes": data.get("changes", []),
        }
