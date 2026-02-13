"""
One-time DB setup: create tables from app models, or restore from a backup URL.
Use init-db to build an empty DB like local; use restore-from-url to copy data.
Restore uses Python/psycopg2 only (no psql or buildpack needed).
"""
import os
import re
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


def _run_sql_with_psycopg2(database_url: str, sql_content: str) -> None:
    """Execute SQL script using psycopg2. Merges PL/pgSQL fragments (END IF, ELSE, etc.) so they run in one block."""
    import psycopg2
    url = database_url
    if url.startswith("postgres://"):
        url = "postgresql://" + url[11:]
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    # Split by semicolon + newline; then merge PL/pgSQL continuations (END IF, ELSE, END, etc.) into previous statement
    raw = re.split(r";\s*\n", sql_content)
    # PL/pgSQL fragments that must run with the previous statement (not alone)
    continuation_tokens = ("END", "ELSE", "END IF", "ELSIF", "END LOOP", "END CASE")
    statements = []
    for chunk in raw:
        stmt = chunk.strip()
        if not stmt or stmt.startswith("--"):
            continue
        stmt_upper = stmt.upper().strip()
        is_continuation = stmt_upper in continuation_tokens or (
            stmt_upper.startswith("END ") and len(stmt_upper) < 20
        )
        if is_continuation:
            if statements:
                # Append without semicolon so server runs one statement (not "stmt1;" then "END IF;")
                end = ";" if not stmt.rstrip().endswith(";") else ""
                statements[-1] = statements[-1] + "\n" + stmt + end
            continue
        statements.append(stmt)
    for stmt in statements:
        lines = [l for l in stmt.split("\n") if l.strip() and not l.strip().startswith("--")]
        if not lines:
            continue
        try:
            cur.execute(stmt)
        except Exception as e:
            if "already exists" in str(e).lower() or "does not exist" in str(e).lower():
                continue
            raise
    cur.close()
    conn.close()


@router.post("/restore-from-url")
async def restore_from_url(x_restore_secret: str = Header(None, alias="X-Restore-Secret")):
    """
    One-time: download backup from RESTORE_BACKUP_URL and run it with Python/psycopg2.
    No buildpack or psql needed. Requires env: RESTORE_BACKUP_URL (raw Gist URL), RESTORE_SECRET.
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

    try:
        _run_sql_with_psycopg2(database_url, sql_content)
        return {"status": "ok", "message": "Restore completed. Remove RESTORE_BACKUP_URL and RESTORE_SECRET from env."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {e!s}")
