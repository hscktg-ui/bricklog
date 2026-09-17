# Final ship — all shippable editorial improvements

Date: 2026-09-18

## Shipped
1. `buildTodayVerdict` SSOT — channel-aware Today sentence
2. Today chrome: assistant suppressed; strips/tabs already hidden
3. Admin `editorialVerdict` — fail/channel → now → alert → readiness
4. RUN NOW → 「지금 트렌드 갱신」 (Trend strip only)
5. Sidebar Today nav + mobile shortcuts; Header title → home
6. Onboarding / channel select → always Today

## Validation
- npm run build
- npm run test:channels
- probe-postlogin-journey-prod
- test:hundred-users (prod)
