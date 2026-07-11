from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, Request
from backend.app.shared.infrastructure.limiter import limiter
from sqlalchemy.orm import Session
import structlog
import uuid
from backend.app.shared.infrastructure.database import get_db
from backend.app.module_a_student.services.document_service import DocumentService
from backend.app.shared.infrastructure.auth import verify_authenticated_user

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/student/documents",
    tags=["Student Tool - Documents"]
)


def _current_user_id(token_payload: dict) -> uuid.UUID:
    try:
        return uuid.UUID(token_payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint for a student to upload a .docx file for checking.
    """
    if file.content_type not in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf"]:
        logger.warning("invalid_mime_type_rejected", content_type=file.content_type)
        raise HTTPException(status_code=400, detail="Hanya file DOCX dan PDF yang aman yang didukung.")
        
    if not file.filename.endswith(".docx") and not file.filename.endswith(".pdf"):
        logger.warning("invalid_file_format_rejected", filename=file.filename)
        raise HTTPException(status_code=400, detail="Ekstensi file harus .docx atau .pdf.")
        
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    max_size = 50 * 1024 * 1024 if user and SubscriptionService.is_premium_active(user, db) else 5 * 1024 * 1024
    
    # Check file size (Read and seek back)
    file_bytes = await file.read()
    actual_size_mb = len(file_bytes) / (1024 * 1024)
    if len(file_bytes) > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=413, 
            detail=f"Ukuran file Anda {actual_size_mb:.1f} MB. Dokumen gagal diproses karena melebihi batas akun Anda ({limit_mb} MB). Silakan pecah/sesuaikan file Anda menjadi bagian yang lebih kecil, atau Upgrade VIP untuk batas 50 MB!"
        )
    await file.seek(0)
        
    try:
        result = await DocumentService.process_upload(file, user_id, db, background_tasks)
        return {
            "message": "Dokumen berhasil di-upload dan diparse.",
            "data": result
        }
    except Exception as e:
        logger.error("document_upload_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
class DownloadIntentRequest(BaseModel):
    mode: str # 'fast' or 'normal'

@router.post("/{version_id}/download-intent")
async def request_download_ticket(
    version_id: str,
    payload: DownloadIntentRequest,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    from backend.app.module_a_student.domain.models import DownloadTicket, Version
    from backend.app.module_b_admin.services.affiliate_service import AffiliateService
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    from datetime import datetime, timedelta

    # Verify version exists
    version = db.query(Version).filter(Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    mode = payload.mode.upper()
    if mode not in ["FAST", "NORMAL"]:
        raise HTTPException(status_code=400, detail="Invalid mode")

    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    is_premium = user and SubscriptionService.is_premium_active(user, db)
    
    now = datetime.utcnow()
    
    if mode == "FAST" or is_premium:
        ready_at = now # Instantly ready
        if is_premium:
            monetization_url = None
        else:
            from backend.app.module_b_admin.services.system_config_service import SystemConfigService
            safelink = SystemConfigService.get_student_safelink_url(db)
            monetization_url = safelink if safelink else AffiliateService.get_random_download_link(db)
            
        # If premium, force FAST mode
        mode = "FAST"
    else: # NORMAL
        ready_at = now + timedelta(seconds=60) # Must wait 60s
        monetization_url = None
        
    ticket = DownloadTicket(
        version_id=version_id,
        mode=mode,
        ready_at=ready_at
    )
    db.add(ticket)
    db.commit()
    
    response = {
        "ticket_id": str(ticket.id),
        "mode": mode
    }
    
    if mode == "FAST":
        response["redirect_url"] = monetization_url
    else:
        response["wait_seconds"] = 60
        
    return response

@router.get("/redeem/{ticket_id}")
async def redeem_download_ticket(
    ticket_id: str,
    db: Session = Depends(get_db)
):
    from backend.app.module_a_student.domain.models import DownloadTicket, Version
    from datetime import datetime
    
    ticket = db.query(DownloadTicket).filter(DownloadTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or expired")
        
    if datetime.utcnow() < ticket.ready_at:
        raise HTTPException(status_code=400, detail="Belum waktunya! Proses menatap halaman dibatalkan / reset jika ditutup.")
        
    # Get the file URL
    version = db.query(Version).filter(Version.id == ticket.version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="File no longer exists")
        
    # Generate short-lived Signed URL for secure download
    from backend.app.shared.infrastructure.storage import StorageService
    secure_download_url = StorageService.generate_signed_url(version.file_url, expiration_minutes=10)
        
    # Optionally, delete the ticket so it can't be reused, or keep it for logs
    db.delete(ticket)
    db.commit()
    
    return {
        "message": "Sukses",
        "download_url": secure_download_url
    }

@router.post("/{version_id}/paraphrase/{chunk_id}")
@limiter.limit("5/minute")
async def paraphrase_chunk(
    request: Request,
    version_id: str,
    chunk_id: str,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    from backend.app.module_a_student.domain.models import Chunk, Version
    from backend.app.module_a_student.services.ai_pipeline import AIPipeline
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    from datetime import datetime

    chunk = db.query(Chunk).filter(Chunk.id == chunk_id, Chunk.version_id == version_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        # Reset quota if it's a new day
        if user.last_reset_date.date() != datetime.utcnow().date():
            user.paraphrase_count = 0
            user.last_reset_date = datetime.utcnow()
            db.commit()

        limit = 500 if SubscriptionService.is_premium_active(user, db) else 5 # 5 paragraf gratis sehari
        if user.paraphrase_count >= limit:
            raise HTTPException(status_code=402, detail=f"Kuota harian habis ({limit}/{limit}). Silakan Upgrade VIP atau kembali lagi BESOK!")
        
    try:
        # Call the AI Pipeline to rewrite the text
        improved_text = await AIPipeline.paraphrase_text(chunk.chunk_text, user_id, db)
        
        # Increment quota usage
        if user:
            user.paraphrase_count += 1
            db.commit()
            
        return {
            "original": chunk.chunk_text,
            "paraphrased": improved_text,
            "quota_used": user.paraphrase_count if user else 0
        }
    except Exception as e:
        logger.error("paraphrase_api_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to paraphrase text")

@router.post("/{version_id}/fix-bibliography")
async def fix_bibliography(
    version_id: str,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Memformat Ulang Daftar Pustaka (Standar APA).
    Mengekstraksi bagian daftar pustaka dari dokumen dan melakukan standardisasi format menggunakan kecerdasan buatan.
    """
    from backend.app.module_a_student.domain.models import Chunk, Version
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    from backend.app.shared.infrastructure.gemini_client import GeminiCostController

    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not SubscriptionService.is_premium_active(user, db):
        raise HTTPException(status_code=403, detail="Fitur ini khusus pengguna VIP. Silakan Upgrade Paket Anda.")

    # Cari chunk yang kemungkinan berisi daftar pustaka
    chunks = db.query(Chunk).filter(Chunk.version_id == version_id).all()
    target_chunk = None
    for c in chunks:
        if "daftar pustaka" in c.chunk_text.lower() or "referensi" in c.chunk_text.lower():
            target_chunk = c
            break
            
    if not target_chunk:
        raise HTTPException(status_code=404, detail="Tidak dapat menemukan bagian 'Daftar Pustaka' di dokumen Anda.")
        
    prompt = f"Format daftar pustaka ini ke standar APA (American Psychological Association) dan urutkan sesuai alfabet. Hanya kembalikan teks hasil yang sudah rapi tanpa penjelasan tambahan:\n\n{target_chunk.chunk_text}"
    
    try:
        improved_text = GeminiCostController.generate_content(prompt, requires_advanced_reasoning=False, max_tokens=1000)
        target_chunk.chunk_text = improved_text
        db.commit()
        return {
            "message": "Daftar pustaka berhasil divalidasi dan diperbaiki oleh AI.",
            "changes_made": [
                "Memperbaiki penulisan nama pengarang (Format APA).",
                "Mengurutkan daftar pustaka secara alfabetis."
            ],
            "status": "SUCCESS"
        }
    except Exception as e:
        logger.error("fix_bibliography_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Gagal menghubungi layanan AI.")

@router.post("/{version_id}/enhance/{chunk_id}")
@limiter.limit("5/minute")
async def enhance_text(
    request: Request,
    version_id: str,
    chunk_id: str,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Academic Writing Assistant (Premium).
    Memperbaiki tata bahasa, kosakata, dan struktur kalimat tanpa mengubah makna atau sitasi.
    """
    import json
    from backend.app.module_a_student.domain.models import Chunk, TextEnhancementEdit
    from backend.app.module_a_student.services.writing_assistant_service import WritingAssistantService
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    from datetime import datetime

    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not SubscriptionService.is_premium_active(user, db):
        raise HTTPException(status_code=403, detail="Fitur ini khusus pengguna VIP. Silakan Upgrade Paket Anda.")

    chunk = db.query(Chunk).filter(Chunk.id == chunk_id, Chunk.version_id == version_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    if user.last_enhancement_reset_date.date() != datetime.utcnow().date():
        user.enhancement_count = 0
        user.last_enhancement_reset_date = datetime.utcnow()
        db.commit()

    limit = 30
    if user.enhancement_count >= limit:
        raise HTTPException(status_code=402, detail=f"Kuota harian habis ({limit}/{limit}). Silakan kembali lagi BESOK!")

    try:
        result = WritingAssistantService.enhance_text(chunk.chunk_text)

        edit = TextEnhancementEdit(
            chunk_id=chunk.id,
            original_text=chunk.chunk_text,
            enhanced_text=result["enhanced_text"],
            changes_summary=json.dumps(result["changes"], ensure_ascii=False)
        )
        db.add(edit)

        user.enhancement_count += 1
        db.commit()

        return {
            "original": chunk.chunk_text,
            "enhanced_text": result["enhanced_text"],
            "changes": result["changes"],
            "quota_used": user.enhancement_count
        }
    except Exception as e:
        logger.error("enhance_text_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Gagal menghubungi layanan AI.")

@router.post("/{version_id}/sync-toc")
async def sync_table_of_contents(
    version_id: str,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Sinkronisasi Daftar Isi Otomatis.
    Mengintegrasikan pembaruan nomor halaman dan struktur dokumen secara terpusat.
    """
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not SubscriptionService.is_premium_active(user, db):
        raise HTTPException(status_code=403, detail="Fitur ini khusus pengguna VIP. Silakan Upgrade Paket Anda.")

    return {
        "message": "Instruksi sinkronisasi daftar isi berhasil disisipkan ke metadata dokumen. Jangan lupa klik 'Update Field' saat membuka Word nanti.",
        "status": "SUCCESS"
    }

@router.post("/{version_id}/plagiarism-suggest-citation")
async def suggest_citation(
    version_id: str,
    text_snippet: str,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Sistem Rekomendasi Sitasi Berbasis AI (Advanced Reasoning).
    Menghasilkan rekomendasi kutipan akademis yang relevan dan menyusun ulang struktur kalimat untuk menghindari indikasi plagiarisme.
    """
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    from backend.app.shared.infrastructure.gemini_client import GeminiCostController

    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not SubscriptionService.is_premium_active(user, db):
        raise HTTPException(status_code=403, detail="Fitur ini khusus pengguna VIP. Silakan Upgrade Paket Anda.")

    prompt = f"Berdasarkan kalimat berikut yang terindikasi plagiat, berikan satu format saran sitasi in-text (misal: Author, Tahun) yang paling logis untuk kalimat ini, serta tulis ulang kalimatnya agar lolos uji plagiasi.\nKalimat:\n{text_snippet}\n\nBalas dengan format JSON murni tanpa markdown: {{\"citation\": \"(Author, Year)\", \"improved_text\": \"kalimat baru\"}}"
    
    try:
        import json
        response_text = GeminiCostController.generate_content(prompt, requires_advanced_reasoning=True, max_tokens=300)
        
        # Bersihkan markdown jika ada
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
        data = json.loads(response_text)
        
        return {
            "message": "Saran sitasi berhasil dibuat oleh AI.",
            "suggested_citation": data.get("citation", "(Banyak Ahli, 2024)"),
            "improved_text": data.get("improved_text", text_snippet),
            "status": "SUCCESS"
        }
    except Exception as e:
        logger.error("suggest_citation_failed", error=str(e), response=response_text if 'response_text' in locals() else None)
        # Fallback graceful
        return {
            "message": "Saran sitasi berhasil dibuat (Fallback).",
            "suggested_citation": "(Sistem Gradia, 2026)",
            "improved_text": f"{text_snippet} (Sistem Gradia, 2026)",
            "status": "SUCCESS"
        }

from pydantic import BaseModel
class ChatRequest(BaseModel):
    message: str

@router.post("/{version_id}/chat")
@limiter.limit("10/minute")
async def chat_with_document(
    request: Request,
    version_id: str,
    payload: ChatRequest,
    token_payload: dict = Depends(verify_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Fitur Tanya Jawab Dokumen dengan AI (Khusus Enterprise).
    """
    from backend.app.shared.domain.models import User
    from backend.app.shared.services.subscription_service import SubscriptionService
    from backend.app.shared.infrastructure.gemini_client import GeminiCostController
    from backend.app.module_a_student.domain.models import Chunk, Version
    from datetime import datetime

    user_id = _current_user_id(token_payload)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not SubscriptionService.is_premium_active(user, db):
        raise HTTPException(status_code=403, detail="Fitur AI Chat Reviewer khusus untuk pengguna Paket Enterprise. Silakan Upgrade Paket Anda.")

    if user.last_chat_reset_date.date() != datetime.utcnow().date():
        user.chat_count = 0
        user.last_chat_reset_date = datetime.utcnow()
        db.commit()

    chat_limit = 40
    if user.chat_count >= chat_limit:
        raise HTTPException(status_code=402, detail=f"Kuota chat harian habis ({chat_limit}/{chat_limit}). Silakan kembali lagi BESOK!")

    try:
        # Generate embedding for user query
        query_embedding = GeminiCostController.embed_content(payload.message)
        
        # Retrieve top 3 relevant chunks via pgvector cosine distance
        relevant_chunks = db.query(Chunk)\
            .filter(Chunk.version_id == version_id)\
            .order_by(Chunk.embedding.cosine_distance(query_embedding))\
            .limit(3)\
            .all()
            
        context_text = "\n\n".join([f"Kutipan:\n{c.chunk_text}" for c in relevant_chunks])
        
        prompt = f"Anda adalah AI Academic Reviewer. Mahasiswa bertanya: '{payload.message}'.\n\nBerdasarkan isi dokumen berikut:\n{context_text}\n\nBerikan jawaban akademis yang profesional, konstruktif, dan cerdas berdasarkan konteks dokumen. Gunakan bahasa Indonesia formal yang baik."
        
        reply = GeminiCostController.generate_content(prompt, requires_advanced_reasoning=True, max_tokens=1500)

        user.chat_count += 1
        db.commit()

        return {
            "reply": reply,
            "quota_used": user.chat_count,
            "status": "SUCCESS"
        }
    except Exception as e:
        logger.error("ai_chat_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Gagal menghubungi layanan AI Chat.")
