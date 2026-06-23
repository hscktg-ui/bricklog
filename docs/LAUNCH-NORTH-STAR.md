# BRICLOG Launch North Star (Phase 0)

## 한 줄

**「이 글, 그대로 네이버에 붙여넣을 수 있나?」** — 이것만 1순위 KPI.

## 측정

| 지표 | 목표 |
|------|------|
| Publish-ready rate | 출시 전 50%+, 정식 70%+ |
| Time-to-copy (p90) | 60초 이내 |
| Empty / withhold (고객 화면) | 5% 미만 |

## Launch Publish-First Mode

`lib/config/launchPublishMode.js` — 기본 ON (`BRICLOG_LAUNCH_PUBLISH_FIRST=false`로 끔)

- Writer **1-pass**, 루프 **75초** 상한
- 고객 **withhold 금지** — 섹션이 있으면 항상 화면에 표시
- 후처리 **경량화** — placeholder·금지어만 제거 + GPT 화자 마감
- 클라이언트 fetch **120초** (async job 폴링 기본)

## 제품 방향

1. **복붙 엔진** — GPT 경쟁 아님, 브랜드·지역·말투 매번 붙이기 귀찮음 해소
2. **캘린더** — 이번 주 7칸 + 만든 날 체크만 (`SimpleWeeklyPlan`)
3. **UI** — 브랜드·주제·글 받기·복사. 점수·OS 문구는 접기
4. **서버** — async job (start/run/poll) + 동기 fallback 120s

## 하지 말 것 (출시 전)

- 게이트·엔진 레이어 추가
- 야간 evolution이 고객 경로 규칙 변경
- 「30초 SLA」 약속 (실측 45~60초)

## 로드맵

- **Phase 0** (완료): publish-first mode, 주간 캘린더, withhold 제거, async job
- **Phase 1** (진행): usage·히스토리 SSOT, async job Supabase 영속
- **Phase 2** (진행): 월간 4주 운영 UI, publish-ready KPI 측정
