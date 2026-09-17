# Vision 2030 UI — 30인 개발자 + Jobs/Cook 피드백 반영

Date: 2026-09-18

## Jobs
- 「메뉴판이 아니라 한 장면」 → `TodayWorkspaceScene` + 웰컴 1 CTA
- 「한 문장으로 말해라」 → `오늘 「주제」를 쓰세요.`
- 어드민 「한 줄 판결」 → CommandCenter verdict = nowAction/topAlert/headline

## Cook
- 공개 홈과 같은 density → vision2030 tokens on Today
- 30초 KPI → default menu `today`, logo home → today

## 30인 합의 (FE/UX/QA)
Must-ship: Today one-scene, welcome collapse, admin verdict, hide rhythm/strip on Today.
Ship-without: assistant copy, EN/KO label mix.

## Files
- components/workspace/TodayWorkspaceScene.jsx (new)
- components/ChannelWelcomeScreen.jsx
- components/Dashboard.jsx / Header.jsx
- lib/auth/profilePersonalization.js (defaultMenu → today)
- components/admin/AdminCommandCenter.jsx
