# BRICLOG 운영 런북

**한 줄:** 제품은 “브랜드 글 한곳에서 쓰고 복사” — 운영은 **DB · env · 크론 · 결제** 네 가지만 매일 확인하면 됩니다.

**진입:** [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md) (5분) → 이 문서 (상세) → [FINAL_LAUNCH_CHECKLIST.md](./FINAL_LAUNCH_CHECKLIST.md) (출시 게이트)

---

## 1. 역할 분담

| 역할 | 담당 |
|------|------|
| 제품·카피·UX | `lib/brand/copy.js` 단일 소스 |
| 품질 90점 (내부) | `npm run test:quality` — **고객 UI에 점수 노출 금지** |
| 배포 | Vercel + Supabase |
| 결제 | 토스 — [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md) |
| 일일 배치 | [DAILY_CRON_SETUP.md](./DAILY_CRON_SETUP.md) |
| 관리자 | [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) |

---

## 2. 매일 아침 (5분)

1. https://<도메인> 열기 — 랜딩 → (세션당 1회) 인트로 → 로그인 스모크  
2. Vercel **Deployments** 최근 빌드 성공  
3. `docs/daily-run-latest.md` — 오늘 날짜·에러 없음  
4. 토스 대시보드 — 전일 결제 실패 0건 (라이브 후)

실패 시 → §6 장애 대응

---

## 3. 배포 절차

### 3.1 배포 전 (로컬)

```powershell
cd D:\briclog
npm run build
npm run test:quality
npm run test:director
```

### 3.2 Supabase SQL (스키마 변경 시만)

순서는 [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md) · [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) 참고.  
**한 번에 전체 붙여넣기 금지** — 파일별 실행.

### 3.3 Vercel 환경 변수 (필수)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 인증·DB |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버·관리자·크론 |
| `OPENAI_API_KEY` | 본문 생성 |
| `NEXT_PUBLIC_APP_URL` | OAuth·토스 리다이렉트 |
| `BRICLOG_ADMIN_EMAILS` | `/admin` |
| `BRICLOG_CRON_SECRET` | 일일 크론 Bearer |
| `TOSS_PAYMENTS_SECRET_KEY` | 결제 (라이브 시) |
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | 결제 UI |
| `NEXT_PUBLIC_BRICLOG_CONTACT_EMAIL` | 푸터 문의 |

전체 목록: `.env.example`

### 3.4 배포 후 스모크

- [ ] 랜딩 · `/terms` · `/privacy` · `/refund`  
- [ ] 가입 또는 로그인  
- [ ] 블로그 1회 생성 → 복사  
- [ ] (플러스) 플레이스·인스타 파생  
- [ ] `/api/public/stats` 200  

---

## 4. 크론 (일일 개발·다이제스트)

- 설정: [DAILY_CRON_SETUP.md](./DAILY_CRON_SETUP.md)  
- 수동: `npm run daily:develop` (로컬 `.env.local` 필요)  
- 프로덕션: `POST https://<도메인>/api/cron/daily-develop`  
  - Header: `Authorization: Bearer <BRICLOG_CRON_SECRET>`  
- 결과: `docs/daily-run-latest.md` 갱신 확인  

---

## 5. 결제·베타

- 토스: [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md)  
- 베타 전체 개방: `BETA_FULL_ACCESS_UNTIL=2026-06-01` (팀 합의 후)  
- 고객 문구: “구독은 **매월 결제일**에 갱신” — 앱 요금 모달·랜딩 요금 섹션  

---

## 6. 장애 대응

| 증상 | 확인 | 조치 |
|------|------|------|
| 가입 안 됨 | Supabase Auth 로그 · Redirect URL | `/auth/callback` 등록 |
| 생성 실패 | Vercel 로그 · `OPENAI_API_KEY` | 키·한도·`BRICLOG_DAILY_GENERATION_LIMIT` |
| 결제 실패 | 토스 웹훅 · success/fail URL | [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md) |
| 통계 0 | `BRICLOG_STATS_MODE` | `seed` vs `live` |
| 고객 영문 에러 | `app/error.jsx` | 서버 로그 — UI는 한국어 고정 메시지 |

고객에게는 **기술 스택 이름·점수·90점** 노출하지 않습니다.

---

## 7. 디자인·카피 원칙 (Jobs)

1. 한 화면 CTA 하나  
2. 슬로건·시작 버튼 문구 중복 금지  
3. 인트로: 세션당 1회 (같은 탭 재방문 피로 감소)  
4. 「쌓인 글」 숫자: 인트로 끝난 뒤 섹션이 보일 때 롤링  
5. 상세: [DESIGN_JOBS_AUDIT.md](./DESIGN_JOBS_AUDIT.md)  

---

## 8. 문서 맵

| 문서 | 용도 |
|------|------|
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | 이 파일 — 운영 전반 |
| [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md) | 출근 5분 |
| [FINAL_LAUNCH_CHECKLIST.md](./FINAL_LAUNCH_CHECKLIST.md) | 베타/출시 게이트 |
| [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) | 프로덕션 점수·SQL |
| [SMS_SETUP.md](./SMS_SETUP.md) | 가입 SMS |
| [DIRECTOR_NORTH_STAR.md](./DIRECTOR_NORTH_STAR.md) | 제품 방향 |

---

*마지막 점검: 코드와 함께 `npm run build` · `test:quality` · `test:director` 통과 후 배포.*
