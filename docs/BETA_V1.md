# BRICLOG 1차 베타 (Beta v1)

## Shipped in this beta

- **Brand Memory AI (Phase 1)** — USER / BRAND / CONTENT memory blocks injected before `【이번 입력】` in blog prompts (`lib/memory/*`, `loadBrandMemoryBundle`).
- **Personalization** — account brief, user writing profile, brand habits, feedback continuity.
- **UX** — channel welcome overlays, profile completion modal, usage meter.
- **Paste review API** — `/api/content/review` loads brand memory for blog, place, and instagram improve flows (same bundle as blog generation).

## Test commands

```bash
npm run build
npm run test:quality && npm run test:director && npm run test:channels
npm run test:users && npm run test:brand-memory-journey && npm run test:persona-journey
```

Optional: `npm run test:persona` for channel-only persona simulation.

## Local smoke test

1. Copy `.env.local` with Supabase + OpenAI (and optional image provider) keys.
2. `npm run dev` → http://localhost:3000 — if blank or lock error: quit old `node` on port 3000, remove `.next/dev`, restart
3. Sign up → complete minimal profile → create/select brand → generate blog → derive place/insta → check memory panels.

## Human blockers (not automated)

- **Supabase** — run migrations including `schema-v8-personalization.sql` (`user_writing_profiles`, memory tables). Missing tables degrade gracefully but server memory stays thin.
- **Credentials** — `OPENAI_API_KEY` for LLM blog/review; Toss/billing keys only if testing payments.
- **Image generation** — optional provider env; pipeline still produces `thumbnailPrompt` without API.
