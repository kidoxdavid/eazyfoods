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
    """Execute SQL script using psycopg2. Keeps function bodies ($$...$$) intact so PL/pgSQL is not split."""
    import psycopg2
    url = database_url
    if url.startswith("postgres://"):
        url = "postgresql://" + url[11:]
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()

    # Protect function/trigger bodies: replace AS $$ ... $$ with a placeholder so we don't split inside them
    bodies: list[str] = []
    def save_body(m: re.Match) -> str:
        bodies.append(m.group(1))
        return f"AS $BODY${len(bodies)-1:05d}$BODY$;"
    protected = re.sub(r"AS\s+\$\$(.*?)\$\$;", save_body, sql_content, flags=re.DOTALL)

    # Protect COPY ... FROM stdin; ... \. blocks (data rows must not be split and executed as SQL)
    copy_blocks: list[str] = []
    def save_copy(m: re.Match) -> str:
        copy_blocks.append(m.group(0))
        return f"$COPY${len(copy_blocks)-1:05d}$COPY$;"
    protected = re.sub(
        r"COPY\s+[^;]+FROM\s+stdin;\s*\n.*?\n\\.\s*(?:\n|$)",
        save_copy,
        protected,
        flags=re.DOTALL,
    )

    raw = re.split(r";\s*\n", protected)
    statements = []
    for chunk in raw:
        stmt = chunk.strip()
        if not stmt or stmt.startswith("--"):
            continue
        # Restore protected COPY blocks
        for i in range(len(copy_blocks)):
            stmt = stmt.replace(f"$COPY${i:05d}$COPY$", copy_blocks[i])
        # Restore protected function bodies
        for i, body in enumerate(bodies):
            stmt = stmt.replace(f"AS $BODY${i:05d}$BODY$", f"AS $${body}$$")
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
