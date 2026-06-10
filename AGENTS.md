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

### EXPLAIN V3 (Research → Explain → Write)

`lib/product/briclogExplainEngine.js` — 키워드→문장 금지 · 설명·이유·활용 필수 · 브랜드 연결

KPI: Research 30% · **Explain 40%** · Writing 20% · SEO 10% · 설명률 85%+

측정: `npm run test:explain-engine-v3`

### RESEARCH FIRST V2 (조사 우선 — 글쓰기 폐기)

**브릭로그는 AI Writer가 아니라 브랜드 콘텐츠 리서치 엔진.** `Research First · Writing Second · Quality Third`

`lib/product/briclogResearchFirstPipeline.js` — STEP1–9 SSOT

| STEP | 내용 |
|------|------|
| 1 | 사용자 입력 분석 (지역·브랜드·주제) |
| 2 | 검색 의도 분석 |
| 3 | 조사 항목 생성 (추정 금지) |
| 4 | 브랜드 DB 조회 |
| 5 | 지역 조회 |
| 6 | 계절·트렌드 |
| 7 | **조사 결과 정리** (글 아님) |
| 8 | 아웃라인 |
| 9 | 글 작성 — 조사 부족 시 **금지** |

FAIL: 조사 없음 · 업종 정보 부족 · 브랜드 없음 · placeholder (`이용`·`좋은내용`·`전시 소식` 등)

측정: `npm run test:research-first-pipeline`

### 12단계 프로세스 (평가 우선)

`lib/product/briclogEvaluateFirstPipeline.js` — Research dossier(STEP1–8) · STEP10–12 평가·문단수정·출력

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
| 조사 우선 파이프라인 | `lib/product/briclogResearchFirstPipeline.js` |

### env

- `BRICLOG_RESEARCH_FIRST=true` — 조사 dossier 없으면 글 생성 금지 (기본: RESET 품질과 연동)
- `BRICLOG_RESET_QUALITY=true` — 90점 게이트·파이프라인 정화
- `BRICLOG_DEV_FREEZE=true` — 기능 동결 (기본: RESET 품질 모드와 연동)
- `BRICLOG_RESET_PAYMENT_PAUSED=true` / `BRICLOG_RESET_SIGNUP_LIMIT=true`
<!-- END:briclog-reset -->
