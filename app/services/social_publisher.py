"""
Social media publishing service.
Publishes posts to Facebook, Instagram, Twitter/X, and LinkedIn using
stored OAuth tokens. Credentials for each platform must be configured
via environment variables (FACEBOOK_APP_ID/SECRET, TWITTER_CLIENT_ID/SECRET,
LINKEDIN_CLIENT_ID/SECRET) and admin users must connect their accounts through
the marketing portal OAuth flow first.
"""
import hashlib
import os
import secrets
import logging
from typing import Optional, Tuple

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

FACEBOOK_GRAPH = "https://graph.facebook.com/v19.0"
TWITTER_API = "https://api.twitter.com/2"
LINKEDIN_API = "https://api.linkedin.com/v2"


# ── OAuth URL builders ───────────────────────────────────────────────────────

def facebook_oauth_url(state: str) -> Optional[str]:
    if not settings.FACEBOOK_APP_ID:
        return None
    redirect = _callback_url("facebook")
    scope = "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,pages_show_list"
    return (
        f"https://www.facebook.com/v19.0/dialog/oauth"
        f"?client_id={settings.FACEBOOK_APP_ID}"
        f"&redirect_uri={redirect}"
        f"&scope={scope}"
        f"&state={state}"
        f"&response_type=code"
    )


def twitter_oauth_url(state: str) -> Tuple[Optional[str], str]:
    """Returns (auth_url, code_verifier). code_verifier must be stored in DB."""
    if not settings.TWITTER_CLIENT_ID:
        return None, ""
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = (
        hashlib.sha256(code_verifier.encode()).digest().hex()
    )
    # Twitter needs base64url, not hex — recalculate properly
    import base64
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()

    redirect = _callback_url("twitter")
    scope = "tweet.read tweet.write users.read offline.access"
    url = (
        f"https://twitter.com/i/oauth2/authorize"
        f"?response_type=code"
        f"&client_id={settings.TWITTER_CLIENT_ID}"
        f"&redirect_uri={redirect}"
        f"&scope={scope.replace(' ', '%20')}"
        f"&state={state}"
        f"&code_challenge={code_challenge}"
        f"&code_challenge_method=S256"
    )
    return url, code_verifier


def linkedin_oauth_url(state: str) -> Optional[str]:
    if not settings.LINKEDIN_CLIENT_ID:
        return None
    redirect = _callback_url("linkedin")
    scope = "w_member_social r_liteprofile"
    return (
        f"https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={settings.LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={redirect}"
        f"&scope={scope.replace(' ', '%20')}"
        f"&state={state}"
    )


def _callback_url(platform: str) -> str:
    base = (settings.MARKETING_PORTAL_BASE_URL or "").rstrip("/")
    # Callback hits the backend so we can exchange the code server-side
    api_base = (settings.API_PUBLIC_URL or "http://localhost:8000").rstrip("/")
    return f"{api_base}/admin/marketing/social-auth/{platform}/callback"


# ── Token exchange helpers ───────────────────────────────────────────────────

async def facebook_exchange_code(code: str) -> dict:
    redirect = _callback_url("facebook")
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{FACEBOOK_GRAPH}/oauth/access_token",
            params={
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "redirect_uri": redirect,
                "code": code,
            }
        )
        r.raise_for_status()
        data = r.json()

        # Exchange short-lived for long-lived token
        lr = await client.get(
            f"{FACEBOOK_GRAPH}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "fb_exchange_token": data["access_token"],
            }
        )
        lr.raise_for_status()
        long_data = lr.json()
        long_token = long_data.get("access_token", data["access_token"])

        # Get first managed page
        pr = await client.get(
            f"{FACEBOOK_GRAPH}/me/accounts",
            params={"access_token": long_token, "fields": "id,name,access_token"}
        )
        pr.raise_for_status()
        pages = pr.json().get("data", [])
        page = pages[0] if pages else {}

        # Resolve Instagram business account
        ig_id = None
        if page.get("id"):
            igr = await client.get(
                f"{FACEBOOK_GRAPH}/{page['id']}",
                params={"fields": "instagram_business_account", "access_token": page.get("access_token", long_token)}
            )
            ig_id = igr.json().get("instagram_business_account", {}).get("id")

        return {
            "access_token": long_token,
            "page_id": page.get("id"),
            "page_name": page.get("name"),
            "page_access_token": page.get("access_token"),
            "ig_business_id": ig_id,
        }


async def twitter_exchange_code(code: str, code_verifier: str) -> dict:
    redirect = _callback_url("twitter")
    credentials = f"{settings.TWITTER_CLIENT_ID}:{settings.TWITTER_CLIENT_SECRET}"
    import base64
    auth_header = base64.b64encode(credentials.encode()).decode()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{TWITTER_API}/oauth2/token",
            headers={"Authorization": f"Basic {auth_header}"},
            data={
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect,
                "code_verifier": code_verifier,
            }
        )
        r.raise_for_status()
        token_data = r.json()
        access_token = token_data["access_token"]

        ur = await client.get(
            f"{TWITTER_API}/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        ur.raise_for_status()
        user_data = ur.json().get("data", {})

        return {
            "access_token": access_token,
            "refresh_token": token_data.get("refresh_token"),
            "username": user_data.get("username"),
            "user_id": user_data.get("id"),
        }


async def linkedin_exchange_code(code: str) -> dict:
    redirect = _callback_url("linkedin")
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        r.raise_for_status()
        token_data = r.json()
        access_token = token_data["access_token"]

        # Get LinkedIn member URN
        ur = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        ur.raise_for_status()
        ui = ur.json()

        return {
            "access_token": access_token,
            "username": ui.get("name") or ui.get("localizedFirstName", ""),
            "person_urn": f"urn:li:person:{ui['sub']}" if ui.get("sub") else None,
        }


# ── Publishing ───────────────────────────────────────────────────────────────

async def publish_to_facebook(account: dict, content: str, image_url: Optional[str], link_url: Optional[str]) -> str:
    """Post to Facebook Page. Returns the created post ID."""
    page_token = account.get("page_access_token") or account.get("access_token")
    page_id = account.get("page_id")
    if not page_id or not page_token:
        raise ValueError("Facebook page not connected")

    payload = {"message": content, "access_token": page_token}
    if link_url:
        payload["link"] = link_url

    async with httpx.AsyncClient(timeout=30) as client:
        if image_url:
            r = await client.post(
                f"{FACEBOOK_GRAPH}/{page_id}/photos",
                params={"access_token": page_token},
                json={"url": image_url, "caption": content, "published": True}
            )
        else:
            r = await client.post(f"{FACEBOOK_GRAPH}/{page_id}/feed", json=payload)
        r.raise_for_status()
        return r.json().get("id", "")


async def publish_to_instagram(account: dict, content: str, image_url: Optional[str]) -> str:
    """Two-step Instagram publish: create container → publish. Requires image."""
    page_token = account.get("page_access_token") or account.get("access_token")
    ig_id = account.get("ig_business_id") or account.get("page_id")
    if not ig_id or not page_token:
        raise ValueError("Instagram Business account not connected")
    if not image_url:
        raise ValueError("Instagram requires an image URL")

    async with httpx.AsyncClient(timeout=30) as client:
        cr = await client.post(
            f"{FACEBOOK_GRAPH}/{ig_id}/media",
            params={"access_token": page_token},
            json={"image_url": image_url, "caption": content}
        )
        cr.raise_for_status()
        container_id = cr.json()["id"]

        pr = await client.post(
            f"{FACEBOOK_GRAPH}/{ig_id}/media_publish",
            params={"access_token": page_token},
            json={"creation_id": container_id}
        )
        pr.raise_for_status()
        return pr.json().get("id", "")


async def publish_to_twitter(account: dict, content: str) -> str:
    """Post a tweet. Returns created tweet ID."""
    access_token = account.get("access_token")
    if not access_token:
        raise ValueError("Twitter account not connected")
    if len(content) > 280:
        content = content[:277] + "..."

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{TWITTER_API}/tweets",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"text": content}
        )
        r.raise_for_status()
        return r.json().get("data", {}).get("id", "")


async def publish_to_linkedin(account: dict, content: str, image_url: Optional[str], link_url: Optional[str]) -> str:
    """Post a UGC post on LinkedIn. Returns activity URN."""
    access_token = account.get("access_token")
    person_urn = account.get("person_urn")
    if not access_token or not person_urn:
        raise ValueError("LinkedIn account not connected")

    media = []
    if image_url:
        media = [{"status": "READY", "description": {"text": ""}, "media": image_url, "title": {"text": ""}}]

    share_content: dict = {
        "shareCommentary": {"text": content},
        "shareMediaCategory": "IMAGE" if image_url else ("ARTICLE" if link_url else "NONE"),
    }
    if image_url:
        share_content["media"] = media
    if link_url and not image_url:
        share_content["media"] = [{"status": "READY", "originalUrl": link_url}]
        share_content["shareMediaCategory"] = "ARTICLE"

    body = {
        "author": person_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{LINKEDIN_API}/ugcPosts",
            headers={"Authorization": f"Bearer {access_token}", "X-Restli-Protocol-Version": "2.0.0"},
            json=body
        )
        r.raise_for_status()
        return r.headers.get("x-restli-id", "")


async def publish_post(platform: str, account: dict, content: str,
                       image_url: Optional[str] = None,
                       link_url: Optional[str] = None) -> str:
    """Dispatch publish to correct platform. Returns platform post ID."""
    if platform == "facebook":
        return await publish_to_facebook(account, content, image_url, link_url)
    if platform == "instagram":
        return await publish_to_instagram(account, content, image_url)
    if platform == "twitter":
        return await publish_to_twitter(account, content)
    if platform == "linkedin":
        return await publish_to_linkedin(account, content, image_url, link_url)
    raise ValueError(f"Unsupported platform: {platform}")
