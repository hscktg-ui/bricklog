# BRICLOG Phase Map (SSOT)

**북극성 KPI:** 「이 글, 그대로 네이버에 붙여넣을 수 있나?」

| Phase | 목표 | 종료 조건 | 상태 |
|-------|------|-----------|------|
| **0** | 복붙 엔진 출시 | publish-first ON · withhold OFF · async job · 빈 화면 5% 미만 | ✅ 완료 |
| **1** | 신뢰 MVP | usage 갱신 · 히스토리 SSOT · async Supabase · 랜딩 카피 | ✅ 완료 |
| **2** | 월간 운영 OS | 4주 캘린더 · publish-ready 50%+ · 제품점수 85+ | ✅ KPI 달성 · 배포 확인 중 |
| **3** | 성장·수익 | publish-ready 70%+ · 결제·SEO · 품질 90% 게이트 | 🔄 준비 (배포 후 착수) |

## 서버 상태 (최근 점검)

| 항목 | 결과 |
|------|------|
| prod HTTP `/` · flags · engine-status | 200 · ok |
| `test:phase-gate:prod` | **10/10 PASS** |
| 제품점수 | **93.1** production |
| publish-ready (fixture) | **66.7%** (2/3, API 샘플은 무료 한도) |
| 로그인 작업실 | **activeBrandId 크래시 수정 커밋됨** — prod 배포 반영 필요 |
| Vercel CLI | 토큰 만료 → `vercel login` 또는 GitHub 자동 배포 |

## 자동 게이트 (야간/배포 전)

```bash
npm run test:phase-gate          # 로컬 회귀 (5~15min)
npm run test:phase-gate:prod     # prod HTTP + 제품점수
npm run test:channel-sla:prod    # BASE_URL=https://briclog.ai (배포 후)
```

## Phase 2 달성

- 4주 캘린더 UI (`ContentPlanWorkspace` · `SimpleMonthlyPlan`)
- publish-ready **118/120 (98%)** 로컬 야간 배치
- phase-gate prod **10/10**

## Phase 2 잔여 (배포·인프라)

- [ ] prod에 `185396e6` (Dashboard crash fix) 배포
- [ ] Supabase `blog_generation_jobs` — SQL Editor 수동
- [ ] 배포 후 `test:channel-sla` → 채널 SLA 4/4

## Phase 3 (배포 안정 후)

- 결제(Toss) 라이브
- publish-ready prod API 70%+
- `test:quality-trust-kpi` 90% 목표

## 하지 말 것 (Phase 3 전)

- 신규 엔진·게이트 레이어
- 야간 evolution이 고객 경로 규칙 변경
- 「30초 SLA」 마케팅
