# Supabase Backup — Own Your Data

The no-regrets "control & ownership" move while the Supabase project still lives
in Lovable's org. A scheduled, compressed, **verified** `pg_dump` landed in a
bucket you own. Decouples *"my data is safe"* from *"I've migrated."*

See `memory: project_data_architecture.md` for the full migration strategy.

## One-time setup

```bash
cp tools/backup/.env.backup.example tools/backup/.env.backup
# Edit .env.backup → paste SUPABASE_DB_URL (Dashboard → Project Settings →
# Database → Connection string → URI, port 5432 / direct, NOT the pooler).
```

You need the Postgres client tools installed locally:

```bash
# macOS
brew install libpq && brew link --force libpq   # provides pg_dump / pg_restore
# verify
pg_dump --version
```

> The `pg_dump` major version should match the server. Supabase is on Postgres 15+.

## Run a backup

```bash
npm run backup
# or directly:
./tools/backup/pg_backup.sh
```

Output: `tools/backup/dumps/vt_supabase_<UTC-timestamp>.dump` (custom format,
compressed). The script verifies the dump is non-empty and lists >0 restorable
objects before reporting success.

## Schedule it (daily 03:00, local cron)

```cron
0 3 * * * cd /Users/michelle/Downloads/Model\ Type\ Classifier/repo && ./tools/backup/pg_backup.sh >> /tmp/vt_backup.log 2>&1
```

## Restore (into a NEW project, e.g. your own org)

```bash
pg_restore --no-owner --no-acl --dbname="$TARGET_DB_URL" \
  tools/backup/dumps/vt_supabase_<timestamp>.dump
```

## Scope / caveats

- **This is a safety backup, not a cutover tool.** It captures the full DB
  including the `auth` schema rows, but `auth.users` password hashes / OAuth
  identities do not re-import cleanly into a different Supabase project. Full
  migration auth handling is a separate, deliberate decision.
- Credentials live only in `.env.backup` (gitignored). Never hardcode them.
- Dumps are gitignored — they contain user PII (emails in `scan_usage`,
  `report_feedback`). Treat the backup bucket as PII storage under your EU AI
  Act retention obligations.
