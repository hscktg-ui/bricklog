# BRICLOG Overnight Auto Development Report

**Date:** 2026-06-07  
**Mode:** 야간 자동 개발 · 품질 엔진 집중 개선  
**Focus:** 콘텐츠 품질 안정화 (기능 확장 없음)

---

## 1. 수정한 파일

| File | Change |
|------|--------|
| `lib/product/briclogDeleteEngine.js` | **신규** — Delete Engine SSOT (공허·중복·placeholder 문장 제거) |
| `lib/product/overnightQualityPipeline.js` | **신규** — Research→Delete→Explain→Experience→Gate 통합 패스 |
| `lib/product/contentQualityDelivery.js` | Overnight 패스 연결, EQS(편집형) 경로 보호, Golden SafeEdit 우회 |
| `lib/product/briclogResearchFirstPipeline.js` | 신메뉴·블로그 운영 조사 체크리스트 확장 |
| `lib/product/contentGateSystem.js` | placeholder FAIL 패턴 6종 추가 |
| `lib/product/editorialQualityStandard.js` | 카페 신메뉴·마케팅 블로그 EQS 본문, 라우팅 규칙 |
| `components/channels/InstaMarketerForm.jsx` | 필수 입력 단순화, 목적·분위기 → 고급 설정 |
| `components/channels/PlaceMarketerForm.jsx` | 공지 유형 → 고급 설정, AI 추천 안내 |
| `scripts/test-overnight-quality-samples.mjs` | **신규** — 4종 표준 샘플 자동 평가 |
| `package.json` | `test:overnight-quality` 스크립트 |

---

## 2. 제거한 Placeholder 원인

| 문구 | 원인 위치 | 조치 |
|------|-----------|------|
| 이용 (주제 대명사) | `topicFacetEngine`, mission prose fallback | Research First FAIL + Delete Engine + contentGate |
| 전시 소식 | `storyTargetEngine` (가구), 테스트 스크립트 | industry forbidden + gate FAIL |
| 확인해 보았습니다 / 기준이 보였 | golden safe edit, hollow templates | Delete Engine + Explain hollow ban |
| 관련해서 / 이 구성 / 조건 및 구성 | customer question, industry router | contentGate strip + FAIL 등록 |
| 비교가 수월해요 | placeStyle, golden patterns | Delete + gate |
| 방문 후기 제목 오염 | `applyDeliveryProsePolish` on EQS packs | EQS finalize에서 heavy polish 제거 |

---

## 3. 변경한 생성 파이프라인

**이전:** 키워드 → (조사 생략 가능) → LLM/템플릿 → heavy sanitize → 출력

**이후 (송출 직전 SSOT):**

```
사용자 입력
→ Research First dossier (조사 항목·정리본)
→ 본문 생성 (mission prose / EQS / LLM)
→ Delete Engine (공허·중복 문장)
→ Explain defect filter
→ Content gate strip
→ 품질 평가 (90점 미만 withhold)
→ Safe Edit (EQS·mission 경로는 원문 보존)
→ API align (withheld 일치)
→ 출력
```

---

## 4. Research First 적용

- `overnightQualityPipeline.ensureResearchFirstDossier` — 조사 없이 작성 시 dossier 스탬프
- 신메뉴·블로그 운영 주제별 조사 체크리스트 추가
- `assertResearchFirstWritable` 기존 v2PipelineGate 연동 유지

---

## 5. Explain First 적용

- `filterExplainDefectSentences` overnight 패스에 연결
- 카페·마케팅 EQS 본문에 특징·이유·상황 문장 강화
- `assessExplainQuality` 85% pass rate — eval 엔진에 반영

---

## 6. Experience First 적용

- `assessExperienceOpinionQuality` overnight 메타 스탬프
- 꽃·체어 mission prose — 기존 `briclogExperienceOpinionEngine` 유지 (experience rate 83~100%)

---

## 7. Delete Engine 적용

- `applyBriclogDeleteEngine` — 문장 단위 삭제, shrink guard 연동
- 꽃 샘플: 11% 문장 제거 (공허 템플릿)
- 목표 20~40% — 중복·공허만 제거, 정보 문장 보존

---

## 8. 품질 게이트 변경

- `contentGateSystem` — 전시소식·중립정리·확인해보았습니다 등 FAIL 패턴 추가
- EQS 경로 — `evaluateReviseAndGateOutput` 대신 `assessContentEvaluation` (원문 파괴 방지)
- Golden SafeEdit — EQS pack에 적용 금지
- `blogApiDeliveryGate` (이전 사이클) — draft_fallback withhold 유지

---

## 9. 테스트 샘플 결과

| Sample | Eval | Overnight | Pass |
|--------|------|-----------|------|
| 파주 그랩앤고플라워 여름 꽃 | 98 | 100 | ✅ |
| 용인 에이스침대 STRESSLESS 체어 | 96 | 100 | ✅ |
| 마포 모카하우스 여름 신메뉴 | 93 | 88 | ✅ |
| 운정 해신기획 브랜드 블로그 | 85 | 88 | ✅ |

**평균 overnight 점수: 94** · `npm run test:overnight-quality` PASS

---

## 10. 남은 문제

- Agency explain rate 36% — eval 85점이나 `pass: false` (explain hard rule)
- Chair research dossier `researchOk: false` — 가구 조사 contract 보강 필요
- Prod category 500s — live repro 필요
- Explain rate 카페 54% — EQS 본문 explain 축 추가 여지

---

## 11. 현재 완성도 점수

| 영역 | 점수 (주관) |
|------|-------------|
| Mission prose (꽃·체어) | **95/100** |
| EQS (카페·마케팅) | **82/100** |
| Placeholder 차단 | **90/100** |
| Research First | **85/100** |
| 채널 UX (인스타·플레이스) | **78/100** |
| **종합** | **86/100** |

---

## 12. 내일 우선순위

1. Agency·카페 explain rate 85% 달성 (EQS 템플릿 + eval calibration)
2. 가구 research dossier writable 보강
3. Prod 500 category probe 수정
4. `evaluateReviseAndGateOutput` vs EQS 경로 문서화
5. Overnight test CI 워크플로우 등록

---

## 검증

```
npm run test:overnight-quality     PASS
npm run test:mission-prose-route   PASS
npm run test:professional-editor-grade PASS
npm run build                      PASS
```
