#!/usr/bin/env bash
# Apply the Drizzle schema to a (Neon or any) Postgres, and optionally copy the
# current local DB's data up. Idempotent: re-running only applies new migrations.
#
# Usage:
#   DATABASE_URL='<neon-DIRECT-url>' ./scripts/migrate-to-neon.sh
#   DATABASE_URL='<neon-DIRECT-url>' ./scripts/migrate-to-neon.sh --with-data
#
# Notes:
#   - Use Neon's DIRECT connection string (host WITHOUT "-pooler") here — schema
#     migrations and bulk COPY don't play well with the pooled endpoint.
#   - --with-data dumps the LOCAL docker Postgres (data only) and loads it into
#     the target. Safe to repeat: it truncates+reloads via --clean on data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"

: "${DATABASE_URL:?Set DATABASE_URL to the TARGET (Neon DIRECT) url}"
TARGET_URL="$DATABASE_URL"

WITH_DATA=0
[ "${1:-}" = "--with-data" ] && WITH_DATA=1

# Local source DB (docker-compose) — only needed for --with-data.
LOCAL_CONTAINER="${LOCAL_PG_CONTAINER:-tennis-postgres}"
LOCAL_DB="${LOCAL_PG_DB:-tennis}"
LOCAL_USER="${LOCAL_PG_USER:-tennis}"

echo "==> 1/2 Applying Drizzle migrations to target"
( cd "$REPO/packages/db" && DATABASE_URL="$TARGET_URL" pnpm migrate )
echo "    schema is up to date."

if [ "$WITH_DATA" = "1" ]; then
  echo "==> 2/2 Copying data from local '$LOCAL_DB' -> target"
  command -v psql >/dev/null 2>&1 || { echo "FATAL: psql not on PATH (brew install libpq)"; exit 127; }
  # Data-only dump from the local container; --disable-triggers so FK order is
  # irrelevant; --column-inserts is slower but robust across PG versions. We use
  # COPY (default) for speed and rely on truncate-before-load.
  echo "    truncating target tables (data only, keep schema)…"
  psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '__drizzle_migrations') LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', r.tablename);
  END LOOP;
END $$;
SQL
  echo "    dumping + loading…"
  docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_USER" -d "$LOCAL_DB" \
      --data-only --disable-triggers --no-owner --no-privileges \
      --exclude-table=__drizzle_migrations \
    | psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q
  echo "    data copied."
else
  echo "==> 2/2 Skipped data copy (pass --with-data to include it)."
fi

echo "Done. Point the web app (pooled url) and worker (direct url) at Neon."
