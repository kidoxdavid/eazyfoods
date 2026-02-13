#!/usr/bin/env python3
"""Run add_google_oauth_columns.sql against Render DB.
Uses DATABASE_URL if set (e.g. on Render), else REMOTE_DB_* from .env."""
import os
import sys
from pathlib import Path

# Load .env from project root (only when not on Render, where env is set by Render)
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

root = Path(__file__).resolve().parent
if load_dotenv:
    load_dotenv(root / ".env")

url = os.environ.get("DATABASE_URL")
if not url:
    # Build from REMOTE_DB_* (for local run against Render external URL)
    host = os.environ.get("REMOTE_DB_HOST")
    user = os.environ.get("REMOTE_DB_USER")
    password = os.environ.get("REMOTE_DB_PASSWORD")
    dbname = os.environ.get("REMOTE_DB_NAME")
    if not all([host, user, password, dbname]):
        print("ERROR: Set DATABASE_URL or REMOTE_DB_HOST, REMOTE_DB_USER, REMOTE_DB_PASSWORD, REMOTE_DB_NAME")
        sys.exit(1)
    from urllib.parse import quote_plus
    url = f"postgresql://{user}:{quote_plus(password)}@{host}/{dbname}?sslmode=require"
else:
    # Render sets DATABASE_URL; ensure it's postgresql:// for psycopg2
    if url.startswith("postgres://"):
        url = "postgresql://" + url.split("://", 1)[1]

sql_path = root / "migrations" / "add_google_oauth_columns.sql"
if not sql_path.exists():
    print(f"ERROR: {sql_path} not found")
    sys.exit(1)

sql = sql_path.read_text()
# Split into statements (remove comments and empty lines)
statements = []
for line in sql.split("\n"):
    line = line.strip()
    if not line or line.startswith("--"):
        continue
    statements.append(line)

# Join lines that belong to same statement (end with ;)
full_statement = " ".join(statements)
# Split by ; and keep non-empty
stmts = [s.strip() + ";" for s in full_statement.split(";") if s.strip()]

import psycopg2

print("Connecting to Render PostgreSQL...")
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

for i, stmt in enumerate(stmts, 1):
    try:
        cur.execute(stmt)
        print(f"  OK: {stmt[:60]}...")
    except Exception as e:
        # ALTER COLUMN DROP NOT NULL may fail if already nullable
        print(f"  Skip ({e!r}): {stmt[:50]}...")
conn.close()
print("Done.")
