from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import structlog
import os
import asyncio
from email.message import EmailMessage
import aiosmtplib
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.app.shared.infrastructure.database import get_db
from backend.app.shared.infrastructure.auth import AuthHandler
from backend.app.shared.domain.models import User, UserRole
import random
import string

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Shared - Authentication"]
)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.STUDENT

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyRequest(BaseModel):
    email: EmailStr
    otp: str

@router.post("/register")
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user (Student or Admin).
    """
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pw = AuthHandler.get_password_hash(payload.password)
    
    # Generate 6-digit OTP
    otp = ''.join(random.choices(string.digits, k=6))
    
    new_user = User(
        email=payload.email,
        password_hash=hashed_pw,
        role=payload.role,
        is_verified=False,
        verification_otp=otp
    )
    
    db.add(new_user)
    db.commit()
    logger.info("user_registered", email=payload.email, role=payload.role)
    
    # ---------------------------------------------------------
    # PRODUCTION EMAIL SYSTEM (aiosmtplib)
    # ---------------------------------------------------------
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 465))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    if smtp_user and smtp_pass:
        message = EmailMessage()
        message["From"] = smtp_user
        message["To"] = payload.email
        message["Subject"] = "Kode Verifikasi Gradia Anda"
        message.set_content(f"Kode OTP Anda adalah: {otp}\n\nJangan beritahukan kode ini kepada siapa pun.")
        
        # We spawn a background task so it doesn't block the API response
        async def send_email():
            try:
                await aiosmtplib.send(
                    message,
                    hostname=smtp_host,
                    port=smtp_port,
                    username=smtp_user,
                    password=smtp_pass,
                    use_tls=True
                )
                logger.info("otp_email_sent", email=payload.email)
            except Exception as e:
                logger.error("otp_email_failed", error=str(e))
        
        asyncio.create_task(send_email())
    else:
        # Fallback only if the user hasn't configured .env yet
        logger.warning("smtp_credentials_missing", detail="Printing OTP to console instead")
        print(f"\n{'='*50}\n📧 [MOCK EMAIL] OTP untuk {payload.email}: {otp}\n{'='*50}\n")
    
    return {"message": "User registered successfully. Please verify your email.", "user_id": str(new_user.id)}

@router.post("/verify-otp")
async def verify_otp(payload: VerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies the email using OTP.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_verified:
        return {"message": "Email already verified"}
        
    if user.verification_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    user.is_verified = True
    user.verification_otp = None
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.post("/login")
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user and returns a JWT token.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not AuthHandler.verify_password(payload.password, user.password_hash):
        logger.warning("failed_login_attempt", email=payload.email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
        
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value
    }
    
    token = AuthHandler.create_access_token(token_data)
    logger.info("user_logged_in", email=payload.email)
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

class GoogleLoginRequest(BaseModel):
    id_token: str

@router.post("/google/login")
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Verifies Google ID Token and authenticates the user.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured in .env")
        
    try:
        # Verify the token against Google's servers
        idinfo = id_token.verify_oauth2_token(payload.id_token, google_requests.Request(), client_id)
        email = idinfo.get('email')
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Auto-register if not exists
            user = User(
                email=email,
                password_hash="GOOGLE_SSO_NO_PASS",
                role=UserRole.STUDENT,
                is_verified=True # Automatically verified if from Google
            )
            db.add(user)
            db.commit()
            
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
        token = AuthHandler.create_access_token(token_data)
        logger.info("google_sso_success", email=email)
        
        return {
            "access_token": token,
            "token_type": "bearer"
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google ID Token")
