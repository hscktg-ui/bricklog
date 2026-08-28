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
- **Writer GPT-5.6 Sol 고정·지배** — alias `gpt-5.6` → Sol. `isGpt55WriterDominant()` 시 Mission·Experience 카탈로그 패딩 금지, Writer Engine 항상 ON. Tri-AI max: Naver 12쿼리·Gemini·조사 2라운드·45s. 0824: 5.5 Instant 대체 세대. PTC·multi-agent·pro mode 미사용(2분 SLA).
- **비상 수동 실행** — 로컬/dev만 `BRICLOG_ALLOW_MANUAL_EVOLUTION_RUN=1`.
<!-- END:briclog-ops -->

<!-- BEGIN:briclog-reset -->
## BRICLOG VISION — Brand Content OS

**브릭로그는 AI Writer가 아니다.** GPT·Claude·Gemini와 경쟁하지 않는다.
**대한민국 최고의 브랜드 블로그 운영 AI** — `lib/product/briclogBrandContentOS.js`

| 가치 | 내용 |
|------|------|
| 사용자가 얻는 것 | 「글을 받았다」❌ → **「이번 달 운영 계획이 생겼다」** ✅ |
| 우선순위 | 기획 30 · 조사 30 · 설명 20 · 글쓰기 10 · 검수 10 |

## BRICLOG EMERGENCY REBUILD — 평가 우선

생성 성공률보다 **글 신뢰도**를 KPI로 한다.
**문제는 GPT가 아니라 파이프라인 오염** — `lib/product/pipelineContaminationRootCause.js` 참고.

### 개발 동결 (품질 KPI 달성 전)

- 신규 기능·이미지·요금제 개발 **중단** — `lib/config/devFreeze.js`, `BRICLOG_DEV_FREEZE`
- 품질 게이트·업종 분리·placeholder 제거·재검수(Safe Edit)만 허용

### KPI

- 목표: **글 100개 중 90개 이상** 사람이 읽을 수 있는 수준 (`lib/quality/qualityTrustKpi.js`)
- 측정: `npm run test:quality-trust-kpi`
- 90점 미만·placeholder·업종 오염 → 사용자 노출 금지 (`lib/product/briclogResetQualityGate.js`)

### 브릭로그 상세 성공 기준

`lib/product/detailPageSuccessStandard.js` — 「카피를 받았다」❌ → **「고르는 화면이 생겼다」** ✅

엔진 95점(글자·구성)은 성공이 아님. 기획30 · 조사30 · 설명20 · 글10 · 검수10.
검수는 디자이너 30인 패널(`lib/qa/detailPageDesignerPanel30.js`). 하드: 사실·약한 CTA · 문장 한 번 · 패딩 금지 · 패널 평균 90 · 상세 디자이너 비전 90 · 기획 먼저(Planned Generation).
국내 1위는 슬로건이 아니라 이 출고 기준(`DETAIL_PAGE_KOREA_FIRST`). 챗봇 글·대행사 롱페이지·가짜 후기를 이긴다.
지는 축 3개: 연출컷은 **컷별 상품 사진 생성**(올린 사진 우선, 가짜 모델컷 아님) · 예쁜 롱페이지는 첫눈 화면 · 멀티몰은 스마트스토어·쿠팡에 섹션 이미지(통이미지)를 올린다 (`lib/product/detailPageCompeteWins.js`). 상세페이지 AI의 핵심은 사진까지 있는 붙일 화면. 화면 순서는 네이버 쇼핑 랭킹 상세, 붙이는 형식은 리스트 공개 샘플의 섹션 PNG 스택이다 (`lib/product/detailPageRankingPlaybook.js`). **Planned Generation** (`lib/product/detailPagePipeline.js`) — 상품 분석·기획 JSON을 먼저 확정하고, 이미지 모델은 제품 연출컷만 그린다. 한글·가격·스펙은 HTML 엔진이 올린다. 맛보기 주출고는 편집 가능한 HTML(제목·표·FAQ·CTA). 없는 값은 `[자료 필요]`. 통이미지 one-shot 금지. 가짜 후기·모델컷·GIF·9몰은 가져오지 않는다. 텍스트 나열은 `lib/product/detailPageCategoryFlow.js` — 범용 히트상품 5포인트 금지. 그 카테고리 상위 상세 순서(쌀: 산지→햅쌀→도정→중량→포장, 원두: 원산지→로스팅→분쇄→중량). 없는 품종·등급은 안 씀. **상세페이지는 이미지** — 860 PNG를 상세 디자이너가 본다 (`lib/qa/detailPageDesignerVision.js`). HTML 마커 점수만으로 출고하지 않는다.

측정: `npm run test:detail-page-success-standard` · `npm run test:detail-page-type-pairing` · `npm run test:detail-page-pipeline` · `npm run test:detail-page-commerce`

카테고리 글꼴: `lib/product/detailPageTypePairing.js` — 한글 제목체+영문 디스플레이 / 한글 본문+영문 산세리프. Pretendard는 글리프 구멍만.

### EXPLAIN V3 (Research → Explain → Write)

`lib/product/briclogExplainEngine.js` — 키워드→문장 금지 · 설명·이유·활용 필수 · 브랜드 연결

KPI: **Planning 30 · Research 30 · Explain 20 · Writing 10 · Review 10** · 설명률 85%+

측정: `npm run test:explain-engine-v3`

### EXPERIENCE + OPINION (정보 → 설명 → 관찰 → 의견)

`lib/product/briclogExperienceOpinionEngine.js` — 주요 정보에 관찰·경험·의견 중 최소 1개 연결

금지: 건조 사실 나열 (`~특징입니다`, `~조절할 수 있습니다` 등 스펙만 있는 문장)

목표: 독자가 정보를 읽는 느낌이 아니라 **실제 경험을 듣는 느낌**

측정: `npm run test:experience-opinion-engine`

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

- `BRICLOG_EXPERIENCE_OPINION=true` — 관찰·경험·의견 연결·건조 사실 금지 (기본: RESET 품질과 연동)
- `BRICLOG_RESEARCH_FIRST=true` — 조사 dossier 없으면 글 생성 금지 (기본: RESET 품질과 연동)
- `BRICLOG_RESET_QUALITY=true` — 90점 게이트·파이프라인 정화
- `BRICLOG_DEV_FREEZE=true` — 기능 동결 (기본: RESET 품질 모드와 연동)
- `BRICLOG_RESET_PAYMENT_PAUSED=true` / `BRICLOG_RESET_SIGNUP_LIMIT=true`
<!-- END:briclog-reset -->

<!-- BEGIN:briclog-core-rules — 내부 SSOT, 공개 선언 아님 -->
## BRICLOG 코어 룰 (엔진·배치·에이전트)

`lib/product/briclogCoreRules.js` — 모든 생성·송출 조정의 내부 기준.

| 코어 | 정의 | SSOT·측정 |
|------|------|-----------|
| **Core1** | 사람이 쓴 것 같은, 잘 쓰인 글 | `humanBeliefEngine` · SQV(`contentQualityValue`) · `humanVoiceMet` · `assertCore1DeliveryStamped` |
| **Core2** | 브랜드별 사용자 피드백·습관 기억 | `brandLearningProfile` · `personalizationBrief` · `brandFirstPrewriteGate` · `stampCoreRulesOnInput` |

- **송출**: `stampCoreEngineDeliveryMeta` → `stampCoreRulesOnDelivery` (blog·place·instagram 공통)
- **입력**: `stampCoreRulesOnInput` — `brandFirstPrewriteGate` · `contentPipeline.normalizePipelineInput` · `stampCoreEngineOnInput`
- **#1 버그**: 어떤 채널이든 `sqv`·`contentQualityValue` 누락 → 즉시 수정 (`test:channel-sqv-delivery`)
- **회귀**: `npm run test:core-rules` · `npm run test:channel-sqv-delivery`
- **비활성**: `BRICLOG_CORE_RULES=false` (mission off와 별도)
<!-- END:briclog-core-rules -->

<!-- BEGIN:briclog-quality-north-star -->
## 대원칙 SSOT (`lib/product/qualityNorthStar.js`)

| 원칙 | SSOT·측정 |
|------|-----------|
| 사람이 쓴 글 | `humanBeliefEngine` · `qualityLeapFinish` · columnist 프롬프트 humanBelief 블록 |
| 2분 SLA | `briclogFastPipeline` · async run 300s · poll 180s |
| 무조건 결과·우수 | `sovereignAlwaysDeliver` — columnist 실패 → 조사 기반 leap (quota/rate-limit만 withhold) |
| Vision 2030 UX | `vision2030Styles.js` · `DeliveryValueBlocks` · `GenerationContextBeatPanel` |
| 송출 판정 단일화 | `unifiedDeliveryGate.js` |

**회귀:** `npm run test:quality-leap-finish` · `test:core-rules` · `test:unified-delivery-gate` · `test:probe-async-signup-sla` (phase-gate prod)

**Cursor 미활용 → 권장:** Bugbot/Security Review on PR · Canvas for quality KPI · `.cursor/rules` quality-north-star · GitHub Actions phase-gate · nightly cross-channel artifact → cron evolution
<!-- END:briclog-quality-north-star -->
