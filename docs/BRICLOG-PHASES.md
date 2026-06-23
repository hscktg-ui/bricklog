# BRICLOG Phase Map (SSOT)

**북극성 KPI:** 「이 글, 그대로 네이버에 붙여넣을 수 있나?」

| Phase | 목표 | 종료 조건 | 상태 |
|-------|------|-----------|------|
| **0** | 복붙 엔진 출시 | publish-first ON · withhold OFF · async job · 빈 화면 5% 미만 | ✅ 완료 |
| **1** | 신뢰 MVP | usage 갱신 · 히스토리 SSOT · async Supabase · 랜딩 카피 | ✅ 완료 |
| **2** | 월간 운영 OS | 4주 캘린더 · publish-ready 50%+ · 제품점수 85+ | 🔄 거의 완료 |
| **3** | 성장·수익 | publish-ready 70%+ · 결제·SEO · 품질 90% 게이트 | ⏳ 대기 |

## 자동 게이트 (야간/배포 전)

```bash
npm run test:phase-gate          # 로컬 회귀 (5~15분)
npm run test:phase-gate:prod     # prod HTTP + 제품점수
```

## Phase 2 남은 것

- [ ] Supabase `blog_generation_jobs` 마이그레이션 적용 (SQL Editor 수동)
- [ ] prod publish-ready 실측 (`PUBLISH_READY_API=1`)
- [ ] 채널 SLA 4/4 회복 (E2E workspace 감지 수정 중)

## Phase 2 달성 (로컬 야간 배치)

- publish-ready **118/120 (98%)** — `artifacts/overnight-growth/latest-summary.json`
- 제품점수 **93.1** production band
- phase-gate prod **10/10** PASS

## Phase 3 (품질 50%+ 안정 후)

- 결제(Toss) 라이브
- 월간 운영 → 추천 주제 자동 반영
- `test:quality-trust-kpi` 90% 목표

## 하지 말 것 (Phase 3 전)

- 신규 엔진·게이트 레이어
- 야간 evolution이 고객 경로 규칙 변경
- 「30초 SLA」 마케팅
