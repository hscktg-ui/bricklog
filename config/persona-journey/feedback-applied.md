# 3인 페르소나 여정 — 추출 피드백 및 반영

`npm run test:persona-journey` 로 재현합니다. 최신 수치는 `last-run-report.json` 을 참고하세요.

**최근 실행 결과 (3/3 연계·피드백 통과)**

| 페르소나 | 시작점 | 연계 | 피드백 반영 |
|----------|--------|------|-------------|
| 민지(카페) | 이야기 | place·insta·image ← blog | place 담백, insta 이모지↓ |
| 박원장(의료) | 붙여넣기 검수 | insta·image·blog ← place | 키워드·의료 가드, 검수 95→77(과장 완화) |
| 수아(꽃집) | 인스타 | place·image ← blog 프록시 | 정보형 톤, 로컬 해시 힌트 |

템플릿(비-LLM) 생성은 training 65~67점대로 80점 미만 경고만 표시됩니다. 실제 LLM·검수 개선본은 UI/API 경로에서 80점+ 목표를 유지합니다.

## 페르소나

| ID | 고객군 | 시작점 | 시나리오 |
|----|--------|--------|----------|
| journey_cafe_gangnam | 카페·F&B | 이야기(블로그) | 봄 브런치 시즌 → 플레이스·인스타 파생 |
| journey_clinic_songdo | 의료·클리닉 | 붙여넣기 검수(플레이스) | 과장 공지 초안 → 검수·피드백 → 인스타 연계 |
| journey_flower_haeundae | 꽃집 | 인스타 단독 | 어버이날 캡션 → 블로그·플레이스 연계 |

## 추출 피드백 → 코드 반영

| 피드백 (인물) | 반영 위치 |
|---------------|-----------|
| 플레이스 더 짧고 담백하게 | `applyChannelFeedbackPatch` → place `tone: informative` |
| 인스타 이모지 조금만 | `emojiDensity: low` (조금/만 키워드) |
| 의료 광고·키워드 과다 | `sensitiveCategory`, `excludePhrases`, `keywordRepeatGuard` |
| 블로그 정보형·로컬 해시 | blog `informative`, `instaLocalTagsHint` |
| 검수 개선본도 연계 | `channelHintCopy` 초안 안내 문구 |

## 연계 검증

- **이야기 우선**: blog → place / insta / image (`resolveDerivationSource`)
- **검수 우선**: place pack + `paste_review` 메타 → insta 파생
- **인스타 우선**: insta → blog 프록시 → place 파생

## 관련 파일

- `lib/persona/customerJourneyPersonas.js`
- `scripts/simulate-three-persona-journeys.mjs`
- `lib/content/blogDerive.js` — `applyChannelFeedbackPatch`
