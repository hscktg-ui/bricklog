# Changelog

All notable autonomous improvement cycles for BRICLOG.

---

## [2026-06-07 overnight] — Quality Engine Overnight Mode

### Added

- `lib/product/briclogDeleteEngine.js` — sentence-level delete engine (hollow/redundant/placeholder)
- `lib/product/overnightQualityPipeline.js` — Research→Delete→Explain→Experience→Gate SSOT
- `scripts/test-overnight-quality-samples.mjs` — 4 canonical samples (flower/chair/cafe/agency)
- `OVERNIGHT-REPORT.md` — full overnight cycle report

### Changed

- `contentQualityDelivery.js` — overnight pass; EQS packs skip destructive polish/safe-edit/revise
- `editorialQualityStandard.js` — cafe 신메뉴·marketing 블로그 EQS bodies + routing
- `briclogResearchFirstPipeline.js` — 신메뉴·블로그 운영 research checklist
- `contentGateSystem.js` — 6 additional placeholder FAIL patterns
- `InstaMarketerForm.jsx` / `PlaceMarketerForm.jsx` — brand/region/topic first UX

### Test results

- `test:overnight-quality` — avg score 94, all 4 samples pass
- `test:mission-prose-route` — flower/chair eval 98, SQV A
- `npm run build` — PASS

### Remaining

- Agency explain rate still low (eval 85, pass false on explain hard rule)
- Prod category 500s

---

## [2026-06-07] — Quality Gate Alignment & Audit Cycle

### Added

- `lib/product/blogApiDeliveryGate.js` — SSOT for aligning blog API `ok`/`withheld` with pack `_meta` after delivery finalize
- `audit-report.md` — full codebase audit findings
- `priority-roadmap.md` — ranked improvement backlog
- `NEXT_TASK.md` — next 20 high-value tasks

### Changed

- `app/api/content/blog/route.js` — calls `alignBlogApiDeliveryResponse` before JSON response so sub-90 eval / `outputWithheld` cannot return `ok: true`
- `lib/product/contentQualityDelivery.js` — mission catalog path uses real `assessGoldenQualityGate`, `resolveGoldenPublishOk`, and `resetQualityGate.shouldWithhold` instead of hardcoded pass stamps
- `components/AuthForm.jsx` — optional phone no longer disables signup while availability is checking (only when phone required or number already registered)
- `lib/brand/seo.js` — removed non-functional `SearchAction` JSON-LD (no site search endpoint)

### Impact

- **Product quality:** Closes primary bypass where `draft_fallback` or failing eval reached users as deliverable
- **UX:** Signup friction reduced for users who optionally enter phone
- **SEO:** Avoids Google rich-result penalty for fake search action schema
- **Conversion:** Withheld content now returns consistent API shape for retry UI

### Remaining

- Production category 500s (salon/flower/shop) — needs live repro
- Durable rate limits for serverless
- Email verification on generate
- Gate consolidation across `lib/product/`

### Files modified

`lib/product/blogApiDeliveryGate.js` (new), `app/api/content/blog/route.js`, `lib/product/contentQualityDelivery.js`, `components/AuthForm.jsx`, `lib/brand/seo.js`, `audit-report.md` (new), `priority-roadmap.md` (new), `NEXT_TASK.md` (new), `CHANGELOG.md` (new)
