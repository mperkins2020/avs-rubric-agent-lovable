#!/usr/bin/env npx tsx
/**
 * check-live-version.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-deployment safety check. Answers two questions:
 *   1. What ANALYSIS_VERSION is in your local source file?
 *   2. Is that version committed to git? (safe to deploy)
 *   3. Are there any uncommitted changes to protected scraper/engine files?
 *
 * Run this BEFORE giving Lovable a deploy prompt.
 * If it says "safe to deploy", you can trust the deployment will run new code.
 * If it says "UNCOMMITTED CHANGES", run: git add <files> && git commit && git stash && git pull --rebase origin main && git push && git stash pop
 *
 * Usage:
 *   npx tsx tools/scraper-dev/check-live-version.ts
 *   npm run check-version
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../..');

// Protected files that must be committed before a deploy
const PROTECTED_FILES = [
  'supabase/functions/analyze-company/index.ts',
  'supabase/functions/scrape-website/index.ts',
  'src/lib/api/scraper.ts',
];

// ─── 1. Read ANALYSIS_VERSION from local source ───────────────────────────────

const analyzeCompanyPath = join(repoRoot, 'supabase/functions/analyze-company/index.ts');
let localVersion = '(not found)';
try {
  const src = readFileSync(analyzeCompanyPath, 'utf-8');
  const m = src.match(/ANALYSIS_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (m) localVersion = m[1];
} catch {
  console.warn('Could not read analyze-company/index.ts');
}

// ─── 2. Read ANALYSIS_VERSION from last git commit ────────────────────────────

let committedVersion = '(unknown)';
try {
  const gitShow = execSync(
    'git show HEAD:supabase/functions/analyze-company/index.ts',
    { cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const m = gitShow.match(/ANALYSIS_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (m) committedVersion = m[1];
} catch {
  committedVersion = '(could not read from git)';
}

// ─── 3. Check for uncommitted changes in protected files ──────────────────────

const uncommittedFiles: string[] = [];
const unstagedFiles: string[] = [];

for (const file of PROTECTED_FILES) {
  try {
    // Check staged changes (index vs HEAD)
    const stagedDiff = execSync(`git diff --cached --name-only HEAD -- "${file}"`, {
      cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (stagedDiff) uncommittedFiles.push(`${file} (staged, not committed)`);

    // Check unstaged changes (working tree vs index)
    const unstagedDiff = execSync(`git diff --name-only -- "${file}"`, {
      cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (unstagedDiff) unstagedFiles.push(`${file} (modified, not staged)`);
  } catch { /* skip */ }
}

const dirtyFiles = [...unstagedFiles, ...uncommittedFiles];

// ─── 4. Check if local is ahead of remote ────────────────────────────────────

let aheadCount = 0;
let remoteBranch = '';
try {
  remoteBranch = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
    cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  const ahead = execSync(`git rev-list --count ${remoteBranch}..HEAD`, {
    cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  aheadCount = parseInt(ahead, 10) || 0;
} catch { /* no remote or not tracking */ }

// ─── 5. Output ────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(62));
console.log('  Pre-Deploy Version Check');
console.log('─'.repeat(62));
console.log(`\n  ANALYSIS_VERSION (local source):  ${localVersion}`);
console.log(`  ANALYSIS_VERSION (last commit):   ${committedVersion}`);

const versionsSynced = localVersion === committedVersion;
if (versionsSynced) {
  console.log('  Version status: ✅ local matches last commit');
} else {
  console.log('  Version status: ⚠️  local differs from last commit — commit first');
}

console.log('');

if (dirtyFiles.length > 0) {
  console.log('  ❌ UNCOMMITTED CHANGES in protected files:');
  for (const f of dirtyFiles) console.log(`    • ${f}`);
  console.log('');
  console.log('  Run before deploying:');
  console.log('    git add supabase/functions/analyze-company/index.ts \\');
  console.log('            supabase/functions/scrape-website/index.ts');
  console.log('    git commit -m "chore: bump to <version>"');
  console.log('    git stash && git pull --rebase origin main && git push && git stash pop');
} else {
  console.log('  ✅ No uncommitted changes in protected files');
}

if (aheadCount > 0) {
  console.log(`\n  ⚠️  ${aheadCount} commit(s) ahead of ${remoteBranch} — push before deploying`);
  console.log('    git stash && git pull --rebase origin main && git push && git stash pop');
} else if (remoteBranch) {
  console.log(`\n  ✅ In sync with ${remoteBranch}`);
}

const safeToDepoy = dirtyFiles.length === 0 && aheadCount === 0 && versionsSynced;
console.log('\n' + '─'.repeat(62));
if (safeToDepoy) {
  console.log('  ✅ SAFE TO DEPLOY — code matches remote\n');
} else {
  console.log('  ❌ NOT SAFE TO DEPLOY — resolve issues above first\n');
}
