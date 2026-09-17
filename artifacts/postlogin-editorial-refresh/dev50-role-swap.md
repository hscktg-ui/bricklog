# Post-Login Editorial Refresh — 개발자 50인 역할 서환 피드백

Date: 2026-09-18
Scope: Brief / Create / Review / Library / System IA + guest anchors + gate

## Consensus (50 roles: FE / QA / PM / a11y / mobile)

### Must-fix → applied
1. `#landing-pricing` hash dead → panel id restored to `landing-pricing`; SEO keeps `#landing-pricing-seo` fallback
2. Brand gate blocked mobile sidebar (z-0 trap) → removed wrapper `z-0`, sidebar `z-[60]`
3. `test:channels` review→plan assertion stale → review first-class; MAIN_CHANNEL_IDS allows review
4. `e2eAuth.navigateWorkspaceChannel` Korean-only Plans labels → Plans/Review/Library/Briefs patterns

### Nice-to-have (ship without)
- Mixed EN journey labels + KO create channels (intentional product language)
- Plans not on mobile bottom tabs (More / Brief shortcuts cover)
- Assistant knowledge copy still mentions old tab names
- In-panel copy still says 「브랜드 작업실」「초안 기록」 in places

## Verdict
**ship-after-fixes** → fixes landed. Re-run `test:hundred-users` then deploy.
