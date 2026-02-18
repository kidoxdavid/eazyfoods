"""
Verify Google OAuth2 ID token and return payload (email, sub, name, etc.).
"""
import logging
import httpx
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


async def verify_google_id_token(id_token: str) -> Optional[dict]:
    """
    Verify Google ID token via tokeninfo endpoint.
    Returns payload with email, sub (google id), name, given_name, family_name, or None if invalid.
    """
    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)
    if not client_id:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
                timeout=10.0,
            )
            if r.status_code != 200:
                logger.warning("Google tokeninfo returned %s: %s", r.status_code, r.text[:200])
                return None
            data = r.json()
            # Verify audience (required: token must be for this app)
            if data.get("aud") != client_id:
                logger.warning("Google token audience mismatch: aud=%s expected=%s", data.get("aud"), client_id)
                return None
            return {
                "email": data.get("email"),
                "sub": data.get("sub"),
                "name": data.get("name") or "",
                "given_name": data.get("given_name") or "",
                "family_name": data.get("family_name") or "",
            }
    except Exception as e:
        logger.warning("Google token verification failed: %s", e)
        return None
