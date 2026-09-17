# Post-Login Editorial Refresh — 개발자 50인 역할 서환 피드백

Date: 2026-09-18
Scope: Brief / Create / Review / Library / System IA + guest anchors + gate + admin Today order

## Consensus (50 roles: FE / QA / PM / a11y / mobile)

### Must-fix → applied
1. `#landing-pricing` hash dead → panel id restored to `landing-pricing`; SEO keeps `#landing-pricing-seo` fallback
2. Brand gate blocked mobile sidebar (z-0 trap) → removed wrapper `z-0`, sidebar `z-[60]`
3. `test:channels` review→plan assertion stale → review first-class; MAIN_CHANNEL_IDS allows review
4. `e2eAuth.navigateWorkspaceChannel` Korean-only Plans labels → Plans/Review/Library/Briefs patterns

### Admin pass gap (follow-up 2026-09-18) → applied
5. Today tab was inflow-first → **할 일 → Trend strip → 유입** order
6. CommandCenter card grid → editorial sentence + inline metrics + 품질/유입/시스템/RUN NOW buttons
7. Trend buried in System only → `AdminTrendStrip` on Today tab
8. Section hints: Quality=배치·품질, System=트렌드·운영

### Nice-to-have (ship without)
- Mixed EN journey labels + KO create channels (intentional product language)
- Plans not on mobile bottom tabs (More / Brief shortcuts cover)
- Assistant knowledge copy still mentions old tab names
- Standalone `/admin` without workspace shell chrome

## Verdict
**ship** after admin Today narrative fix. Prod smoke: `test:hundred-users` 100/100.
