"""
Shared rate limiter instance.
Dipisahkan dari main.py untuk menghindari circular import.
"""
import os
import structlog

logger = structlog.get_logger(__name__)

from slowapi import Limiter
from slowapi.util import get_remote_address

redis_url = os.getenv("REDIS_URL")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url if redis_url else "memory://"
)
