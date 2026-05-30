#!/usr/bin/env bash
#
# pg_backup.sh — Own-your-data backup of the ValueTempo Supabase Postgres DB.
#
# WHY THIS EXISTS:
#   The Supabase project is currently in Lovable's org. This script is the
#   no-regrets "control & ownership" move: a scheduled, compressed, verified
#   pg_dump landed in a bucket YOU own. It decouples "my data is safe" from
#   "I've migrated off Lovable." See memory: project_data_architecture.md.
#
# WHAT IT DOES:
#   1. Dumps the full database (schema + data) as a compressed custom-format file.
#   2. Verifies the dump is non-empty and structurally valid (pg_restore --list).
#   3. Optionally uploads to S3 (or any aws-cli-compatible endpoint).
#   4. Optionally prunes local dumps older than RETENTION_DAYS.
#
# WHAT IT DOES NOT DO:
#   - It does NOT migrate auth.users password hashes / OAuth identities in a form
#     that re-imports cleanly elsewhere. This is a SAFETY BACKUP, not a cutover
#     tool. Full migration auth handling is a separate, deliberate decision.
#
# REQUIREMENTS:
#   - postgresql client tools (pg_dump, pg_restore) matching the server major version
#   - aws cli (only if BACKUP_S3_URI is set)
#
# USAGE:
#   cp tools/backup/.env.backup.example tools/backup/.env.backup
#   # fill in SUPABASE_DB_URL (and optionally BACKUP_S3_URI)
#   ./tools/backup/pg_backup.sh
#
# SCHEDULING (example — daily at 03:00 via cron):
#   0 3 * * * cd /path/to/repo && ./tools/backup/pg_backup.sh >> /var/log/vt_backup.log 2>&1
#
set -euo pipefail

# ── Resolve paths ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.backup"

# ── Load config (never hardcode credentials) ────────────────────────────────
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL in tools/backup/.env.backup (the Postgres connection string from Supabase dashboard → Project Settings → Database → Connection string → URI)}"

# Local output dir (default: repo-local, gitignored). Override with BACKUP_DIR.
BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/dumps}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_S3_URI="${BACKUP_S3_URI:-}"   # e.g. s3://my-vt-backups/supabase  (optional)

mkdir -p "${BACKUP_DIR}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/vt_supabase_${TS}.dump"

echo "==> [$(date -u +%H:%M:%S)] Starting backup → ${OUT}"

# ── Dump (custom format = compressed, parallel-restorable, selective-restorable) ──
# --no-owner / --no-acl keep the dump portable into a different project/role later.
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --verbose \
  --file="${OUT}" \
  "${SUPABASE_DB_URL}" 2> "${OUT}.log" || {
    echo "!! pg_dump FAILED. Last lines of log:" >&2
    tail -n 20 "${OUT}.log" >&2
    exit 1
  }

# ── Verify: non-empty + valid archive (a silent empty backup is worse than none) ──
if [[ ! -s "${OUT}" ]]; then
  echo "!! Backup file is empty — aborting." >&2
  exit 1
fi

OBJECT_COUNT="$(pg_restore --list "${OUT}" | grep -c ';' || true)"
SIZE_HUMAN="$(du -h "${OUT}" | cut -f1)"

if [[ "${OBJECT_COUNT}" -lt 1 ]]; then
  echo "!! Dump contains no restorable objects — aborting." >&2
  exit 1
fi

echo "==> Verified: ${SIZE_HUMAN}, ${OBJECT_COUNT} archive entries."

# ── Optional: upload to a bucket YOU own ────────────────────────────────────
if [[ -n "${BACKUP_S3_URI}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "!! BACKUP_S3_URI set but aws cli not found. Skipping upload (local copy kept)." >&2
  else
    echo "==> Uploading to ${BACKUP_S3_URI%/}/$(basename "${OUT}")"
    aws s3 cp "${OUT}" "${BACKUP_S3_URI%/}/$(basename "${OUT}")" \
      ${BACKUP_S3_ENDPOINT:+--endpoint-url "${BACKUP_S3_ENDPOINT}"}
    echo "==> Upload complete."
  fi
fi

# ── Optional: prune old local dumps ─────────────────────────────────────────
if [[ "${RETENTION_DAYS}" -gt 0 ]]; then
  find "${BACKUP_DIR}" -name 'vt_supabase_*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete \
    | sed 's/^/==> Pruned old dump: /' || true
  # also prune orphaned logs
  find "${BACKUP_DIR}" -name 'vt_supabase_*.dump.log' -type f -mtime "+${RETENTION_DAYS}" -delete || true
fi

echo "==> [$(date -u +%H:%M:%S)] Backup complete: ${OUT}"
echo ""
echo "    Restore into a NEW project later with:"
echo "    pg_restore --no-owner --no-acl --dbname=\"\$TARGET_DB_URL\" \"${OUT}\""
