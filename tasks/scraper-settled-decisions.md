# Scraper — Settled Design Decisions

These decisions were reached after live QA across Miro, Gamma, and Lovable scans
(Entries 034–039). Do not revert without a new debug log entry explaining the regression.

---

## URL Filter Decisions

### `/terms` — EXCLUDED (not a priority pattern)
**Rationale:** Terms of Use / Terms of Service pages are legal boilerplate. Per AVS
methodology v2, Terms & Conditions was removed from the source list and replaced by
Help center / Knowledge base, Billing & plan documentation, and Trust center.
Refund conditions are captured from `/pricing` and `/billing` pages instead.
**Rule 8 also applies:** legal pages are not valid safety-rail evidence.
**Implementation:** `exclusionPatterns` contains `/\/terms\b/i`. It is NOT in `priorityPatterns`.

### `/collections/` — EXCLUDED
**Rationale:** Zendesk `/collections/` pages are category navigation pages that list
article titles. They contain no actual help content — only titles and summaries linking
to the real articles. Including them provides zero evidence signal.
**Implementation:** `exclusionPatterns` contains `/\/collections\//i`.

### `/partners` — EXCLUDED
**Rationale:** Partner agreement / partner terms pages are legal content (same exclusion
class as `/terms`). Not the company's own product or pricing documentation.
**Implementation:** `exclusionPatterns` contains `/\/partners\b/i`.

### `/explore` — EXCLUDED
**Rationale:** Gallery/showcase pages display user-created content (presentations,
sites, docs). They are not the company's own product, pricing, or trust documentation.
**Implementation:** `exclusionPatterns` contains `/\/explore\b/i`.

### `developer` / `developers` subdomains — NOT in `helpSubdomains`
**Rationale:** `developers.company.com` serves API reference documentation (endpoint
listings, SDK guides). Not user-facing product evidence. Including it adds API endpoint
pages (e.g. "GET /folders") which have zero AVS dimension value.
**Implementation:** `helpSubdomains = ['help', 'support', 'docs', 'kb', 'knowledge', 'community']`.
`developer` and `developers` are intentionally absent.

### `/what-is-`, `/how-to-`, `/guide-to-` paths — EXCLUDED
**Rationale:** Educational content marketing articles. A page explaining a concept does
not document how the company's product is priced, secured, or operationalised.
**Note:** This applies to main-domain paths only. Help subdomain Zendesk articles that
happen to embed "how-to" within a numeric slug (`7834324-how-to-do-x`) are NOT affected
because the exclusion regex requires a literal `/how-to-` path separator, which does not
appear when the phrase is embedded inside a longer segment.

### `/marketplace/[^/]+` — EXCLUDED (single listing pages only)
**Rationale:** Individual marketplace integration listings describe a third-party tool,
not the company's own pricing or trust posture. The parent `/marketplace` page (if it
exists) may still be included.

### `/integrations/[^/]+` — EXCLUDED (single integration pages only)
Same principle as marketplace above.

---

## Resource-Instance ID Filter (three rules)

These rules block URLs that point to user-generated content instances
(boards, docs, files) rather than informational product pages.

### Rule A — Mixed-case base64 (catches Miro board URLs)
`uXjVGArvT-g=`, `uXjVG05WR5Q=`
≥8 chars, alphanumeric+hyphen+underscore+optional `=`, has BOTH upper and lowercase letters.

### Rule B — Digit-leading random slugs (catches Gamma doc URLs)
`2007-p39rtn8slkfwkbe`, `6--2uoyy8nkses2lbj`, `2026-04--e3e4deqagopvucq`
Starts with a digit, ≥8 chars, contains letters.
**ZENDESK EXCEPTION (do not remove):** Zendesk help-center article slugs also start
with a numeric ID but are followed by a human-readable hyphenated title where the
**word portion is purely lowercase letters and hyphens — no digits**.
**Implementation:** `const isZendeskArticleSlug = /^[0-9]+-[a-z][a-z-]*$/.test(lastSeg);`
Rule B only fires when `!isZendeskArticleSlug`.

Test cases:
- `7834324-how-do-credits-work-in-gamma` → word part `how-do-credits-work-in-gamma` = `[a-z][a-z-]*` → ALLOWED ✓
- `8022861-what-s-the-easiest-way-to-export-my-gamma` → word part = `[a-z][a-z-]*` → ALLOWED ✓
- `2007-p39rtn8slkfwkbe` → word part `p39rtn8slkfwkbe` has digits → no match → BLOCKED ✓
- `2026-04--e3e4deqagopvucq` → word part `04--e3e4...` starts with `0` (digit) → no match → BLOCKED ✓
- `6--2uoyy8nkses2lbj` → first char after `6-` is `-` → no match → BLOCKED ✓

**DO NOT revert to normHyphens-based approach:** `2026-04--e3e4deqagopvucq` has 2 normalized
hyphens (the date `2026-04` contributes one) and incorrectly passes the hyphen threshold.
The regex test is the correct implementation (Entry 039).

### Rule C — All-lowercase opaque IDs (catches Gamma doc URLs without hyphens)
`avu2xyfyhrqm75f`, `8nmk3jj496525b6`
≥10 chars, only `[a-z0-9]` (no hyphens), ≥3 digits.
Human-readable slugs like `enterprise`, `planning-delivery` fail on either the
no-hyphens constraint or the digit count.

---

## Locale Filter Exception for Help Subdomains

The locale filter blocks paths whose first segment is an ISO 639-1 language code
(`/en/`, `/fr/`, `/de/`, etc.) on the main domain — these are translated duplicates.
**Exception:** Zendesk-style help subdomains (`help.company.com`, `support.company.com`)
use `/en/` as a structural URL element, not a locale variant. The English help center
articles ARE the primary content. The locale filter is skipped for any URL whose
hostname matches a `helpSubdomains` entry.
**Do not remove this exception** — it is required for `help.gamma.app/en/articles/...`
and any other Zendesk-hosted help center.

---

## Fix 1 — Secondary Discovery Admits Help Subdomains Only (Not All Subdomains)

When the scraper extracts links from a scraped pricing page's markdown, it follows
links to discover additional evidence pages (FAQ tabs, billing modals, help articles).
**The check is `helpSubdomains.some(s => resolvedHost === s + '.' + registrableDomain)`,
plus the exact same-hostname check.**

**DO NOT use `resolvedHost.endsWith(registrableDomain)`** — this admits ALL subdomains
(e.g. `developers.gamma.app`) if they appear as links on the pricing page.
We discovered this regression in Entry 039: Fix 1 was letting in API reference pages.

**DO NOT revert to `isSameDomain` (exact hostname)** — that drops all help subdomain
links (`help.gamma.app` ≠ `gamma.app`).

The correct implementation admits only:
- Same hostname as the scanned URL (`gamma.app`)
- Known help subdomains: `help.*`, `support.*`, `docs.*`, `kb.*`, `knowledge.*`, `community.*`

---

## Billing Keyword Scoring — Three Tiers for Help Subdomain Content

When scoring help subdomain URLs, three tiers apply:
1. **+700** — billing keyword as a dedicated path segment (`/credits`, `/billing`, `/overage`)
2. **+500** — billing keyword embedded anywhere in the path (catches Zendesk slugs like
   `7834324-how-do-credits-work-in-gamma` where "credits" is in the article title)
3. **−200** — generic deep help article with no billing keyword (prevents non-evidence
   articles like "how-to-present-slides" from consuming evidence slots)

**Do not collapse tiers 1 and 2** — without tier 2, the credits article at
`help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma` scores −100 (subdomain
+100, generic article −200) and loses its evidence slot.
