import json
import os
from functools import wraps
import redis
from typing import Optional
import hashlib

redis_url = os.getenv("REDIS_URL")
redis_client: Optional[redis.Redis] = None

if redis_url:
    try:
        redis_client = redis.from_url(redis_url, decode_responses=True)
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")

def cache_response(expire_seconds: int = 300):
    """
    Decorator untuk melakukan caching response endpoint FastAPI.
    Hanya jalan jika redis_client tersedia.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not redis_client:
                return await func(*args, **kwargs)

            # Generate cache key
            kwargs_str = str(sorted(kwargs.items()))
            key_hash = hashlib.md5(kwargs_str.encode()).hexdigest()
            cache_key = f"gradia_cache:{func.__name__}:{key_hash}"
            
            try:
                cached_val = redis_client.get(cache_key)
                if cached_val:
                    return json.loads(cached_val)
            except Exception:
                pass # Ignore cache read errors

            # Eksekusi fungsi jika belum ada di cache
            result = await func(*args, **kwargs)
            
            # Jika result adalah dictionary atau list
            if isinstance(result, (dict, list)):
                try:
                    redis_client.setex(cache_key, expire_seconds, json.dumps(result))
                except Exception:
                    pass # Ignore cache write errors
                
            return result
        return wrapper
    return decorator
