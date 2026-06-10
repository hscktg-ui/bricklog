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

<!-- BEGIN:briclog-reset -->
## BRICLOG EMERGENCY REBUILD — 평가 우선 (최우선)

**브릭로그는 글 생성기가 아니라 글 평가기다.** 생성 성공률보다 **글 신뢰도**를 KPI로 한다.
**문제는 GPT가 아니라 파이프라인 오염** — `lib/product/pipelineContaminationRootCause.js` 참고.

### 개발 동결 (품질 KPI 달성 전)

- 신규 기능·이미지·요금제 개발 **중단** — `lib/config/devFreeze.js`, `BRICLOG_DEV_FREEZE`
- 품질 게이트·업종 분리·placeholder 제거·재검수(Safe Edit)만 허용

### KPI

- 목표: **글 100개 중 90개 이상** 사람이 읽을 수 있는 수준 (`lib/quality/qualityTrustKpi.js`)
- 측정: `npm run test:quality-trust-kpi`
- 90점 미만·placeholder·업종 오염 → 사용자 노출 금지 (`lib/product/briclogResetQualityGate.js`)

### 12단계 프로세스 (평가 우선)

`lib/product/briclogEvaluateFirstPipeline.js` — STEP1–7 컨텍스트 · STEP10–12 평가·문단수정·출력

### 100점 평가 엔진

`lib/product/contentEvaluationEngine.js` — 검색20·업종20·브랜드15·밀도15·문체10·반복10·placeholder10 · **90 미만 출력 금지**

### 파이프라인 SSOT

| 축 | 모듈 |
|----|------|
| Placeholder 추적·제거 | `lib/content/placeholderTraceEngine.js` |
| 업종 엔진 분리 | `lib/product/industryPipelineRouter.js` |
| 브랜드 정보 강제 주입 | `lib/content/brandFactInjectionEngine.js` |
| 재검수 (문단·85% 보존) | `lib/golden/paragraphSafeEditEngine.js` |
| 품질 게이트 | `lib/product/contentEvaluationEngine.js` |

### env

- `BRICLOG_RESET_QUALITY=true` — 90점 게이트·파이프라인 정화
- `BRICLOG_DEV_FREEZE=true` — 기능 동결 (기본: RESET 품질 모드와 연동)
- `BRICLOG_RESET_PAYMENT_PAUSED=true` / `BRICLOG_RESET_SIGNUP_LIMIT=true`
<!-- END:briclog-reset -->
