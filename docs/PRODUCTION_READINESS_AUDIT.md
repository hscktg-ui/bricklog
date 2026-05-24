# BRICLOG Production Readiness Audit

**Audited:** 2026-05-22 (codebase inspection, not live Supabase/Vercel state)  
**Build:** `npm run build` — pass  
**Tests:** `npm run test:quality` · `npm run test:director` — pass  
**Reference:** Director launch bar in [DIRECTOR_NORTH_STAR.md](./DIRECTOR_NORTH_STAR.md) (no numeric score there; this doc adds one)

---

## Readiness score: **74 / 100** (beta-ready · production billing/cron ops pending)

| Band | Score | Meaning |
|------|-------|---------|
| 85+ | Production | Live PG, cron proven, DB migrations applied, SEO/deploy checklist done |
| 70–84 | **Beta** | Core app shippable; operator must close SQL/env/cron/payment gaps |
| &lt;70 | Pre-beta | Build/tests or auth/legal blockers |

Scoring weights (~10 pts each): env docs, DB/RLS, auth, billing, cron, admin, legal, landing, quality scripts, SEO, Vercel ops.

---

## Summary table

| Area | Status | Notes |
|------|--------|-------|
| Env vars | **PARTIAL** | `.env.example` is strong; no `BRICLOG_CRON_SECRET`; README is CRA default |
| Supabase RLS & SQL | **PARTIAL** | RLS in SQL files; v6–v12 + v9b + billing exist; deploy docs omit v10–v12 |
| Auth | **YES** | Email + env-gated OAuth + `/auth/callback` |
| Billing / Toss | **PARTIAL** | Full scaffold; needs keys, webhook, SQL, live PG |
| Cron `daily-develop` | **PARTIAL** | Route + `vercel.json`; secret/docs gap; no successful run in repo |
| Admin hardening | **YES** | Allowlist, 404 gate, rate limit, DB role trigger |
| Legal pages | **YES** | `/terms` `/privacy` `/refund` + `content/legal/*.md` |
| Landing | **YES** | Stats ticker, samples, dual CTAs |
| Quality test scripts | **YES** | `test:quality` + `test:director` pass |
| SEO / metadata | **PARTIAL** | Root title/description only |
| Vercel deploy | **PARTIAL** | `vercel.json` crons; env + middleware deprecation |

---

## 1. Environment variables

| Check | Status |
|-------|--------|
| `.env.example` documents Supabase, OpenAI, OAuth flags, stats seeds, admin, billing, Toss | **YES** |
| Redirect URLs documented (`/auth/callback`) | **YES** |
| `BRICLOG_CRON_SECRET` / `CRON_SECRET` in `.env.example` | **NO** — only in [DAILY_CRON_SETUP.md](./DAILY_CRON_SETUP.md) |
| Dedicated `.env.local` template in repo | **NO** (by design; use `.env.example`) |
| Project `README.md` deploy/env guide | **NO** — stock `create-next-app` text |

**Operator action:** Copy `.env.example` → `.env.local`, set production `NEXT_PUBLIC_APP_URL`, add `BRICLOG_CRON_SECRET` (or shared `CRON_SECRET`) on Vercel.

---

## 2. Supabase RLS & required SQL scripts

### Scripts present (`supabase/`)

| Script | Purpose | RLS in file |
|--------|---------|-------------|
| `schema.sql` | `generations` | **YES** |
| `schema-v2-saas.sql` | `brands`, usage/error logs | **YES** |
| `schema-v3-memory.sql` | content memory, templates, assets | **YES** |
| `schema-v4-quality-training.sql` | admin quality runs (optional) | **YES** |
| `schema-v5-billing.sql` | subscriptions, monthly usage | **YES** |
| `schema-v5b-plans-brand-studio.sql` | plan enum `brand`/`studio` | alter only |
| `schema-v5c-toss-billing.sql` | checkouts, billing keys | **YES** (user-scoped) |
| `schema-v5d-subscription-management.sql` | plan change / cancel schedule | schema |
| `schema-v6-feedback-learning.sql` | feedback, learning, insights | **YES** |
| `schema-v7-auth-profiles.sql` | profiles, contents | **YES** |
| `schema-v8-personalization.sql` | writing profiles | **YES** |
| `schema-v9-signup-profile.sql` | nickname / signup | schema |
| `schema-v9b-signup-personalization.sql` | extended profile fields | schema |
| `schema-v10-daily-cron.sql` | `daily_usage_snapshots` | **YES** (no user policies — service role) |
| `schema-v11-admin-role-guard.sql` | `profiles.role` trigger | **YES** (trigger) |
| `schema-v12-data-assets.sql` | `data_asset_registry` | **YES** |

### Documented apply order (in repo)

| Doc | Covers v6–v9, v9b, billing | Covers v10–v12 |
|-----|---------------------------|----------------|
| [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md) | **YES** (v9b) | **NO** |
| [TODAY_RELEASE_NOTES.md](./TODAY_RELEASE_NOTES.md) | **YES** (no v9b) | **NO** |
| [DAILY_CRON_SETUP.md](./DAILY_CRON_SETUP.md) | — | **YES** (v10, v12) |
| [DATA_ASSET_STRATEGY.md](./DATA_ASSET_STRATEGY.md) | — | **YES** (v12) |

**Status:** **PARTIAL** — SQL and RLS are implemented in repo; **production DB application cannot be verified from git**. `schema-v5b` is not listed in morning/release notes (run after `v5-billing` if plan check fails).

**Recommended full order (greenfield):**  
`schema.sql` (if needed) → v2 → v3 → v6 → v7 → v8 → v9 → **v9b** → v5-billing → **v5b** → v5c → v5d → (optional v4) → **v10** → **v11** → **v12**

---

## 3. Auth (email, OAuth gating, callback)

| Check | Status | Evidence |
|-------|--------|----------|
| Supabase email/password | **YES** | `components/AuthForm.jsx`, `app/page.js` |
| OAuth env gating | **YES** | `lib/auth/providers.js` — `NEXT_PUBLIC_OAUTH_*` |
| OAuth callback | **YES** | `app/auth/callback/page.js` — PKCE `exchangeCodeForSession` |
| Terms consent | **YES** | `TermsConsentModal`, `/api/auth/terms` |
| Profile completion (v9b) | **YES** | `ProfileCompletionModal`, `/api/auth/profile`, check-nickname |
| Server admin role from JWT email | **YES** | `lib/auth/profileServer.js` — not raw DB `role` |

**Status:** **YES**

---

## 4. Billing / Toss scaffold

| Check | Status |
|-------|--------|
| Plan model (free / brand / studio) | **YES** — `lib/billing/plans.js` |
| API routes: status, subscription, usage, prepare, confirm, webhook, plan/change | **YES** — `app/api/billing/**` |
| Client checkout SDK | **YES** — `components/billing/TossCheckout.jsx`, `@tosspayments/tosspayments-sdk` |
| Success/fail pages | **YES** — `app/billing/toss/success`, `fail` |
| Operator doc | **YES** — [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md) |
| Keys configured in repo | **UNKNOWN** — `.env.local` not audited (gitignored) |
| Live PG + webhook registered | **NO** — operator task |
| Supabase billing SQL applied | **UNKNOWN** |

**Status:** **PARTIAL** — code-complete scaffold; **production payments blocked** until SQL + `TOSS_*` + `SUPABASE_SERVICE_ROLE_KEY` + Toss dashboard redirects/webhook.

---

## 5. Cron `daily-develop`

| Check | Status |
|-------|--------|
| `POST /api/cron/daily-develop` + Bearer secret | **YES** — `app/api/cron/daily-develop/route.js` |
| Pipeline (usage, learning, v12 compound, insights, markdown summary) | **YES** — `lib/cron/dailyDevelopPipeline.js` |
| Vercel schedule | **YES** — `vercel.json` `0 15 * * *` (UTC ≈ 00:00 KST) |
| Local runner | **YES** — `npm run daily:develop`, `scripts/run-daily-develop.mjs` |
| Cron secret in `.env.example` | **NO** |
| Evidence of successful run | **NO** — [daily-run-latest.md](./daily-run-latest.md) placeholder |

**Status:** **PARTIAL**

---

## 6. Admin hardening

| Layer | Status |
|-------|--------|
| `BRICLOG_ADMIN_EMAILS` server allowlist | **YES** — [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) |
| `/api/admin/*` middleware → 404 if not allowlisted | **YES** — `middleware.js` |
| `requireAdminApi` + rate limit | **YES** — `lib/api/adminGuard.js` |
| Client `/admin` guard | **YES** — `app/admin/AdminPageClient.js` |
| `profiles` ADMIN self-promote blocked | **YES** — `schema-v11-admin-role-guard.sql` |
| Admin `robots: noindex` | **YES** — `app/admin/layout.js` |
| Data asset export admin-only | **YES** — `lib/dataAsset/guardExport.js` |

**Status:** **YES**

---

## 7. Legal pages (terms, privacy, refund)

| Route | Status | Source |
|-------|--------|--------|
| `/terms` | **YES** | `content/legal/terms.md` |
| `/privacy` | **YES** | `content/legal/privacy.md` |
| `/refund` | **YES** | `content/legal/refund.md` |
| Footer links | **YES** | `components/layout/SiteFooter.jsx` |
| Per-page metadata | **YES** | e.g. `app/terms/page.js` |

**Status:** **YES**

---

## 8. Landing (stats ticker, samples, CTA)

| Feature | Status |
|---------|--------|
| Hero + seasonal copy | **YES** — `HeroSection`, `useLandingVisit` |
| Live stats ticker | **YES** — `LiveStatsBanner` → `GET /api/public/stats` |
| Sample rotation / demo | **YES** — `DemoFlow`, `DemoPreviewSection`, `ChannelPreview` |
| Pricing + CTA | **YES** — `PricingSection`, sticky mobile CTA, dark footer CTA |
| Stats seed/live modes | **YES** — `.env.example` `BRICLOG_STATS_*` |

**Status:** **YES**

---

## 9. Quality test scripts

| Script | Status | Last run (this audit) |
|--------|--------|------------------------|
| `npm run test:quality` | **YES** | Pass — 90pt target, max 5 rewrites |
| `npm run test:director` | **YES** | Pass — 5 scenarios (cafe, medical, feedback, habit, plans) |
| Director checklist in NORTH_STAR | **YES** | build + both tests + `/` `/terms` |

**Status:** **YES**

---

## 10. SEO / metadata

| Check | Status |
|-------|--------|
| Root `metadata` title + description | **YES** — `app/layout.js`, `lib/brand/slogan` |
| `lang="ko"` | **YES** |
| Favicon | **YES** — `/favicon.svg` |
| Legal page titles | **YES** |
| `openGraph` / `twitter` | **NO** |
| `robots.txt` / `sitemap.xml` | **NO** |
| Canonical URLs | **NO** |
| Admin noindex | **YES** only |

**Status:** **PARTIAL**

---

## 11. Vercel deploy considerations

| Check | Status |
|-------|--------|
| `next build` | **PASS** (Next 16.2.6, 49 routes) |
| `vercel.json` crons (`/api/trends/collect`, `/api/cron/daily-develop`) | **YES** |
| Env vars on Vercel (all server secrets) | **OPERATOR** — mirror `.env.example` |
| Supabase redirect URLs for prod domain | **OPERATOR** |
| `maxDuration` on cron route (120s) | **YES** — within Vercel Pro limits for long jobs |
| Middleware deprecation warning | **WARN** — Next suggests `proxy` migration |
| Project-specific Vercel README | **NO** |

**Status:** **PARTIAL**

---

## Top gaps (fix before calling “production”)

1. **Apply Supabase migrations on production DB** — especially **v9b**, billing v5*, **v10**, **v11**, **v12**; reconcile [TODAY_RELEASE_NOTES.md](./TODAY_RELEASE_NOTES.md) with [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md) + cron docs.
2. **Configure and prove cron** — set `BRICLOG_CRON_SECRET` on Vercel, run once (`npm run daily:develop` or POST), confirm [daily-run-latest.md](./daily-run-latest.md) updates.
3. **Toss production path** — live keys, redirect URLs, `PAYMENT_STATUS_CHANGED` webhook, billing SQL; smoke test brand/studio checkout.
4. **SEO / discoverability** — add `robots.txt`, sitemap, Open Graph; optional legal-page metadata parity.
5. **Env & deploy docs** — add `BRICLOG_CRON_SECRET` to `.env.example`; replace or extend boilerplate `README.md` with Vercel + Supabase checklist.

---

## Director alignment (from NORTH_STAR)

| Director pre-launch item | Audit |
|--------------------------|-------|
| `npm run build` | Pass |
| `test:quality` + `test:director` | Pass |
| `/`, `/terms` 200 | Routes static in build; runtime needs deployed env |
| Free plan place/insta gate | Code present (`canUsePipelineChannel`); verify in browser |
| 4 scenario tone differences | Covered by `test:director` |

---

## Quick operator checklist (copy)

```text
[ ] Supabase: full SQL order applied (incl. v9b, v10, v11, v12, billing)
[ ] Vercel env: SUPABASE_*, OPENAI_*, BRICLOG_ADMIN_EMAILS, BRICLOG_CRON_SECRET, NEXT_PUBLIC_APP_URL
[ ] Supabase Auth redirect: https://<domain>/auth/callback
[ ] Toss: test → live keys, webhook, success/fail URLs
[ ] Cron: manual POST once, daily-run-latest.md populated
[ ] npm run build && test:quality && test:director on CI or locally before promote
[ ] Smoke: landing, signup, blog generate, /admin (allowlisted only), legal footer links
```

---

*Related: [DIRECTOR_NORTH_STAR.md](./DIRECTOR_NORTH_STAR.md) · [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md) · [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md) · [DAILY_CRON_SETUP.md](./DAILY_CRON_SETUP.md)*
