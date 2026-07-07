# BRICLOG 명사 Council 브리프

**용도:** 업종별 패치가 아닌 **엔진 축(axis) 진화**를 위한 외부·내부 피드백 수집 SSOT  
**갱신:** 2026-07-07 · **측정:** `npm run test:council-brief` · `npm run test:writing-contract` · `lib/content/writingContract.js`

---

## 0. 원칙 (읽고 시작)

| 하지 말 것 | 할 것 |
|------------|--------|
| 「꽃집은 이렇게, 가구는 이렇게」 업종 룰 추가 | 같은 불만이 **3회 이상**이면 **엔진 레이어 1개**만 수정 |
| 유명인 취향·문장 미학만 수집 | **독자 계약**·**송출 가능 여부**·**채널 일관성**만 채점 |
| 피드백 → 즉시 프롬프트 한 줄 패치 | 피드백 → **축 태그** → **원칙** → **회귀 테스트 1개** |

**North Star 질문 (모든 리뷰어 공통):**  
> 「이 출력을 그대로 네이버·플레이스·인스타에 붙여넣을 수 있는가? 브랜드가 이번 달 운영 계획을 세우는 데 도움이 되는가?」

---

## 1. 표준 브리프 (리뷰어에게 그대로 전달)

아래 3케이스만 사용한다. **업종을 바꿔 20개 만들지 않는다.**  
(케이스는 엔진 축 검증용 샘플이지, 제품 범위가 아님.)

### Case A — 정보·제품 소개 (segmented)

| 항목 | 값 |
|------|-----|
| 브랜드 | 그랩앤고플라워 |
| 지역 | 평택 |
| 업종 | 꽃집 |
| 주제 | 여름에 사야 할 꽃 소개 |
| 기대 글 유형 | 제품·라인업 소개 · 항목별 설명 |
| 금지 | 방문 후기 톤, 「다녀왔어요」「진열대에서」 |

### Case B — 자사·SaaS 소개 (segmented)

| 항목 | 값 |
|------|-----|
| 브랜드 | 브릭로그 |
| 지역 | (비움) |
| 업종 | SaaS |
| 주제 | 작업실과 채널별 초안 기능 소개 |
| 기대 글 유형 | 제품·기능 소개 |
| 금지 | 철학만 반복, Brand Content OS 슬로건 나열 |

### Case C — 명시 방문 후기 (narrative)

| 항목 | 값 |
|------|-----|
| 브랜드 | 동네카페 |
| 지역 | 홍대 |
| 업종 | 카페 |
| 주제 | 홍대 브런치 카페 방문 후기 |
| 기대 글 유형 | 방문·체험 후기 |
| 허용 | 1인칭 체험, 현장 묘사 |

**리뷰어에게 요청할 출력:** 각 케이스당 **3문장**만.

1. 이 글을 **쓸 수 / 못 쓸** 것인가 (Y/N)  
2. 못 쓴다면 **한 가지 이유** (아래 축 태그 1개)  
3. 고친다면 **한 가지** (기능 요청 말고 **독자가 얻어야 할 것** 기준)

---

## 2. 렌즈별 리뷰어 (역할 카드)

같은 브리프, **질문만** 다르게 한다.

| 렌즈 | 대표 질문 | 엔진 레이어 |
|------|-----------|-------------|
| **시장·베팅** (틸) | 이걸로 10년 회사가 되나? GPT와 싸우나? | [6] 운영·포지셔닝 |
| **브랜드·신뢰** (고딘) | AI 냄새·광고 냄새 없이 브랜드만 기억되나? | [1] 독자 계약 · [5] 검수 |
| **Jobs** (크리스텐슨) | 「글 받음」인가 「이번 달 계획 생김」인가? | [6] 운영 단위 |
| **편집·문장** (편집장) | 맥락만 있고 **항목별 설명**이 있나? | [3] 밀도·구조 |
| **플랫폼** (네이버 맥락) | 블로그·플레이스·인스타가 **같은 브랜드**인가? | [5] 채널 송출 |
| **시스템** (데밍) | 같은 입력이면 항상 같은 **글 유형**인가? | [1] writingContract |
| **Dogfood** (내부 직원) | 우리 제품 소개를 **우리 제품**으로 쓸 수 있나? | 전 레이어 |

---

## 3. 축 태그 표 (피드백 → 코드 매핑)

리뷰어 코멘트를 **아래 코드 하나**로만 분류한다. 업종명 태그 금지.

| 태그 | 의미 | 수정 레이어 | 회귀 |
|------|------|-------------|------|
| `contract_wrong` | 글 유형 오판 (정보인데 후기 등) | [1] `writingContract` | `test:writing-contract` |
| `visit_leak` | 방문 톤·허구 체험 유출 | [2] mission pads · persona | flower info routing |
| `macro_only` | 거시·철학만, 항목 설명 없음 | [3] outline · segmented | contract + outline |
| `segment_missing` | 라인업·기능·메뉴가 안 쪼개짐 | [3] density=segmented | writing-contract case |
| `reader_gain_weak` | 독자가 뭘 얻는지 불명확 | [1] readerGain · UI 미리보기 | WritingContractPreview |
| `research_thin` | 조사·팩트 부족, 추정 문장 | [4] research first | `test:research-first-pipeline` |
| `channel_drift` | 블로그 vs 플레이스 vs 인스타 불일치 | [5] channel derive | `test:probe-prod-channel-sla` |
| `quality_gate` | placeholder·업종 오염·90점 미만 | [5] quality gate | `test:quality-trust-kpi` |
| `input_confusing` | 주제·키워드·칩이 어렵다 | UI · context beat | employee-feedback |
| `ops_not_plan` | 글 1편만 있고 운영 계획 없음 | [6] Brand Content OS | (제품 기획) |

**엔진 이슈로 승격 조건:** 동일 태그가 **서로 다른 렌즈 2명+** 또는 **서로 다른 케이스 A/B 2개+** 에서 반복.

---

## 4. 엔진 레이어 맵 (산업 파일 추가 금지)

```
[1] 독자 계약     lib/content/writingContract.js
                  components/product/WritingContractPreview.jsx
[2] 화자·톤       lib/persona/* · lib/product/missionProseEngine.js
[3] 밀도·구조     lib/content/blogLengthControl.js · outline
[4] 조사·사실     lib/product/briclogResearchFirstPipeline.js
[5] 검수·송출     lib/product/contentEvaluationEngine.js · channel derive
[6] 운영 OS       lib/product/briclogBrandContentOS.js · UI 작업실
```

**업종별 칩** (`generationContextBeat`) 은 [1]의 **보조 입력**일 뿐, 라우팅 SSOT가 아님.

---

## 5. 세션 진행 (90분)

| 시간 | 내용 |
|------|------|
| 0–10분 | North Star + 3케이스 브리프 설명 |
| 10–40분 | 리뷰어 독립 채점 (Y/N + 태그 1개) |
| 40–60분 | 태그 빈도 집계 — **상위 3개만** 토론 |
| 60–80분 | 각 태그 → **레이어 1개** · **테스트 1개** 할당 |
| 80–90분 | 이번 스프린트 **하지 않을 것** 명시 (업종 패치 금지) |

---

## 6. 기록 템플릿 (복사용)

### 세션 메타

```
날짜:
참여 렌즈:
Prod HEAD:
```

### 케이스별

```
Case A / B / C:
  송출 가능 Y/N:
  축 태그:
  한 줄 코멘트:
```

### 스프린트 결정 (최대 3줄)

```
P0 엔진:
P1 UI:
금지 (이번 스프린트):
회귀 테스트:
```

---

## 7. 최근 반영 예시 (참고)

| 피드백 | 태그 | 조치 (업종 아님) |
|--------|------|------------------|
| 브릭로그 써봤는데 철학·방문후기 | `contract_wrong` + `visit_leak` | `writingContract` SSOT · visit 명시 시만 |
| 키워드·주제 어려움 | `input_confusing` | 글 유형 미리보기 · 가이드 분기 |
| 꽃집 정보형인데 매장 방문 문장 | `visit_leak` | mission pads · `visitToneAllowed` |

---

## 8. 다음 Council 전 체크리스트

- [ ] `npm run test:council-brief` green (Case A/B/C)
- [ ] `npm run test:writing-contract` green  
- [ ] `npm run test:council-wedge-batch` green (20 wedge · 축만)
- [ ] `npm run test:north-star-kpi` green (붙여넣기·월간 계획)
- [ ] `npm run test:channel-bundle-consistency` green
- [ ] `npm run test:council-session` green (위 일괄)
- [ ] `npm run test:prod-health` green  
- [ ] Case B(브릭로그) dogfood — 직원 1명 송출 Y/N  
- [ ] 태그 집계에 **업종명** 없음 (축만)  
- [ ] 스프린트에 **신규 업종 파일** 없음  

---

## 9. 가상 Council 평가 요약 (2026-07-07 · 합성)

> 실제 인터뷰가 아닌, North Star·축 기준으로 정리한 **내부 합성 평가**. 외부 Council 세션 전 참고용.

### 공통으로 맞다고 본 것

| 관점 | 평가 |
|------|------|
| **Brand Content OS** | 「글 생성기」가 아니라 **운영 계획 + 채널 송출** 포지셔닝이 일관됨 |
| **writingContract** | 제품 소개·정보형·방문 후기를 **입력·미션·톤**에서 한 축으로 묶은 것이 맞음 |
| **visit 명시 시만** | 정보형·SaaS에 방문 톤이 새는 문제를 **업종 패치 없이** 줄인 방향 |

### 아직 약하다고 본 것 → 이번 스프린트 조치

| 약점 | 조치 |
|------|------|
| 「이번 달 운영 계획」이 결과에 안 보임 | `MonthlyOperatingPlanPreview` · `assessPreGenerationNorthStar` |
| 붙여넣기율 KPI 미측정 | `northStarDeliveryKpi` · `test:north-star-kpi` |
| 채널 3종 **내용** 일관성 | `channelBundleConsistency` · prod probe 번들 검사 |
| 20업종 wedge 증명 부족 | `test:council-wedge-batch` (축만, 업종 룰 없음) |
| Council 회귀 분산 | `test:council-session` 일괄 리포트 |

### Thiel 축 (0→1)

- **좋음:** 좁은 wedge(한국 로컬 브랜드·네이버 생태계) + 운영 OS 내러티브  
- **리스크:** 아직 **20고객 송출 증명**·실제 Council 녹음 없음 → wedge batch·브리프로 대체 측정

### 측정 명령

```bash
npm run test:council-session
npm run test:probe-prod-channel-sla   # SLA + 번들 일관성(derived)
```

---

*BRICLOG — 글 생성기가 아니라 브랜드 콘텐츠 운영 OS. Council은 방향을 정하고, 진화는 contract·측정·테스트가 한다.*
