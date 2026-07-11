import os
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
from backend.app.shared.domain.models import UserRole

logger = structlog.get_logger(__name__)

# Development defaults (must be overridden in production)
_JWT_SECRET_ENV = os.getenv("JWT_SECRET")
if not _JWT_SECRET_ENV:
    logger.warning(
        "jwt_secret_not_set_using_dev_fallback",
        detail="JWT_SECRET env var is not set - falling back to a well-known dev secret. "
               "Anyone who reads this source code can forge valid tokens, including admin tokens. "
               "Set JWT_SECRET in your environment before exposing this service to the internet."
    )
SECRET_KEY = _JWT_SECRET_ENV or "super-secret-gradia-key-do-not-use-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class AuthHandler:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

def verify_admin_role(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to enforce Admin RBAC.
    Extracts JWT from the Bearer token and checks the role.
    """
    token = credentials.credentials
    payload = AuthHandler.decode_token(token)
    
    role = payload.get("role")
    if role != UserRole.ADMIN.value:
        logger.warning("unauthorized_admin_access_attempt", user_id=payload.get("sub"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin role required."
        )
    return payload


def verify_authenticated_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to validate any authenticated user and return the JWT payload.
    """
    token = credentials.credentials
    return AuthHandler.decode_token(token)
