#!/usr/bin/env bash
# Run the Google OAuth migration against Render DB using your .env REMOTE_DB_* vars.
# Usage: ./run_google_oauth_migration_local.sh
# (Or: bash run_google_oauth_migration_local.sh)
# Make sure you're in the project root and have psycopg2: pip install psycopg2-binary

set -e
cd "$(dirname "$0")"

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Use REMOTE_DB_* from .env to build DATABASE_URL for the Python script
export REMOTE_DB_HOST="${REMOTE_DB_HOST:?Set REMOTE_DB_HOST in .env}"
export REMOTE_DB_USER="${REMOTE_DB_USER:?Set REMOTE_DB_USER in .env}"
export REMOTE_DB_PASSWORD="${REMOTE_DB_PASSWORD:?Set REMOTE_DB_PASSWORD in .env}"
export REMOTE_DB_NAME="${REMOTE_DB_NAME:?Set REMOTE_DB_NAME in .env}"

echo "Running Google OAuth migration against Render DB..."
python3 run_google_oauth_migration.py
echo "Migration finished."
