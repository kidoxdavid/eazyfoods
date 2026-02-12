"""
Verify Google OAuth2 ID token and return payload (email, sub, name, etc.).
"""
import httpx
from typing import Optional
from app.core.config import settings


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
            r.raise_for_status()
            data = r.json()
            # Verify audience (optional but recommended)
            if data.get("aud") != client_id:
                return None
            return {
                "email": data.get("email"),
                "sub": data.get("sub"),
                "name": data.get("name") or "",
                "given_name": data.get("given_name") or "",
                "family_name": data.get("family_name") or "",
            }
    except Exception:
        return None
