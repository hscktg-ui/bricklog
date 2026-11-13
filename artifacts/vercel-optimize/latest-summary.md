# Vercel optimize — 2026-11-13

## Before
- `next.config.mjs` empty (no headers/cache/import optimize)
- Static brand/favicon `Cache-Control: max-age=0`
- Home always `private, no-store` (no revalidate)
- Functions edge Korea (`icn1`) → compute US East (`iad1`)
- No Speed Insights / Analytics

## Applied
1. next.config — security headers, brand/static cache, optimizePackageImports, AVIF/WebP
2. vercel.json — `regions: ["icn1"]`, static cache headers, heavy API memory/duration
3. Home `revalidate = 300` (trend catalog cadence)
4. `@vercel/analytics` + `@vercel/speed-insights` in root layout
