"""
One-time DB setup: create tables from app models, or restore from a backup URL.
Use init-db to build an empty DB like local; use restore-from-url to copy data.
"""
import os
import subprocess
import tempfile
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()


@router.post("/init-db")
async def init_db(x_init_db_secret: str = Header(None, alias="X-Init-DB-Secret")):
    """
    Create all tables on DATABASE_URL from the app's SQLAlchemy models (no data).
    No buildpack or backup needed. Then add data via the app or restore-from-url.
    Requires env: INIT_DB_SECRET (send same value in header X-Init-DB-Secret).
    """
    secret = os.environ.get("INIT_DB_SECRET")
    if not secret:
        raise HTTPException(
            status_code=400,
            detail="Set INIT_DB_SECRET in Render env, then call with header X-Init-DB-Secret: <INIT_DB_SECRET>",
        )
    if x_init_db_secret != secret:
        raise HTTPException(status_code=403, detail="Invalid X-Init-DB-Secret")

    # Import so every table is registered on Base.metadata (same as copy_local_db_to_render.py)
    from app.models import (  # noqa: F401
        vendor, customer, product, order, admin, inventory, payout,
        promotion, recipe, review, support, driver, chef, cuisine,
        store, coupon, chat, marketing, meal_plan, platform_settings,
    )
    from app.core.database import Base, engine

    Base.metadata.create_all(engine)
    tables = [t.name for t in Base.metadata.sorted_tables]
    return {
        "status": "ok",
        "message": "Tables created. Add data via the app or use restore-from-url to load a backup.",
        "tables_created": len(tables),
        "tables": tables,
    }


@router.post("/restore-from-url")
async def restore_from_url(x_restore_secret: str = Header(None, alias="X-Restore-Secret")):
    """
    One-time: download backup from RESTORE_BACKUP_URL and run it with psql.
    Requires env: RESTORE_BACKUP_URL (e.g. raw GitHub Gist URL), RESTORE_SECRET (same as X-Restore-Secret header).
    """
    url = os.environ.get("RESTORE_BACKUP_URL")
    secret = os.environ.get("RESTORE_SECRET")
    database_url = os.environ.get("DATABASE_URL")

    if not url or not secret:
        raise HTTPException(
            status_code=400,
            detail="Set RESTORE_BACKUP_URL and RESTORE_SECRET in Render env, then call with header X-Restore-Secret: <RESTORE_SECRET>",
        )
    if x_restore_secret != secret:
        raise HTTPException(status_code=403, detail="Invalid X-Restore-Secret")
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not set")

    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=120) as r:
            sql_content = r.read().decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write(sql_content)
        tmp = f.name

    try:
        result = subprocess.run(
            ["psql", database_url, "-v", "ON_ERROR_STOP=1", "-f", tmp],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"psql failed: {result.stderr or result.stdout or 'unknown'}",
            )
        return {"status": "ok", "message": "Restore completed. Remove RESTORE_BACKUP_URL and RESTORE_SECRET from env."}
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="psql not found. Add buildpack: https://github.com/heroku/heroku-buildpack-apt and Aptfile with 'postgresql-client' in repo root, then redeploy.",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Restore timed out")
    finally:
        try:
            os.unlink(tmp)
        except Exception:
            pass
