# 콘텐츠 품질 검수 엔진 (Content Quality Review)

## 개요

이야기(블로그) 생성 **직후** 자동 실행됩니다.

- 4관점 평가: 브랜드 전문가 · 마케팅 실무자 · 블로거 · 일반 독자 (LLM 연결 시)
- 10개 항목 0~100점 + 가중 최종 점수
- **95점 미만**: 자동 수정 최대 2회
- **95점 이상**: 출고 승인

## 가중치

| 항목 | 비율 |
|------|------|
| 브랜드 일관성 | 25% |
| 독자 관점 | 20% |
| 정보 가치 | 20% |
| 가독성 | 15% |
| 신뢰성 | 10% |
| SEO | 5% |
| 플랫폼 적합성 (네이버·인스타·플레이스 평균) | 5% |

`AI 흔적`은 별도 표시·개선 루프에 반영되며, 가중 합산에는 포함하지 않습니다.

## UI

결과 화면 상단 **콘텐츠 품질 검수** 패널 → 아래 **최종 콘텐츠** 구분.

자료조사(Research Mode) 결과는 `ResearchResultPanel`로 별도 표시됩니다.

## 코드

| 경로 | 역할 |
|------|------|
| `lib/quality/scoreContentQualityHeuristics.js` | 휴리스틱 점수 |
| `lib/llm/runContentQualityReview.js` | LLM 검수·수정 |
| `lib/quality/runContentQualityReviewPipeline.js` | 95점 루프 |
| `lib/llm/contentOrchestrator.js` | 생성 후 연동 |
| `app/api/content/quality-review/route.js` | 수동 재검수 API |
| `components/quality/ContentQualityReviewPanel.jsx` | 결과 UI |

## 환경

- OpenAI 미연결 시 휴리스틱만 사용 (자동 수정 LLM 없음)
- `BRICLOG_QUALITY_REVIEW_RATE_LIMIT_PER_MIN` (기본 12)

## Brand Memory 연동 (향후)

`pack._meta.contentQualityReview` JSON을 `content_items` 메타 또는 별도 테이블에 저장하면 피드백·학습 루프와 연결할 수 있습니다.
