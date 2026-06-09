<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:briclog-ops -->
## BRICLOG 운영 (에이전트)

- **학습·진화는 수동 Run 없음** — `/api/cron/nightly-evolution` (KST 01:30) + `/api/cron/daily-develop` + 피드백 자동 반영. 관리자 `quality-training/start`, `evolution-lab/start`는 prod에서 403.
- **커밋·배포는 즉시 자동** — 작업 마무리 시 사용자 승인 없이 바로 `git commit` → `git push` → `npm run deploy:vercel` → prod smoke. 생성 config 리포트(`config/*-report.json`)는 커밋 제외.
- **품질 배치** — `npm run test:cross-channel-batch` (210건+ blog·place·instagram) → `artifacts/cross-channel-batch/latest-summary.json` → 자동 규칙 진화.
- **커밋·배포는 즉시 자동** — 작업 마무리 시 사용자 승인 없이 바로 `git commit` → `git push` → `npm run deploy:vercel` → prod smoke. 생성 config 리포트(`config/*-report.json`)는 커밋 제외.
- **Run 허용 UI 추가 금지** — Admin에 품질/Evolution Lab 시작 버튼 되돌리지 않음. 상태 패널(`AutoEvolutionStatusPanel`)만 유지.
- **비상 수동 실행** — 로컬/dev만 `BRICLOG_ALLOW_MANUAL_EVOLUTION_RUN=1`.
<!-- END:briclog-ops -->
