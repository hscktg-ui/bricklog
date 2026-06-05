# BRICLOG

네이버 **이야기 · 플레이스 · 인스타** 글을 한곳에서 쓰고, 확인한 뒤 각 앱에 붙여 넣는 브랜드 글쓰기 SaaS입니다.

## 빠른 시작 (개발)

```bash
npm install
cp .env.example .env.local   # Supabase · OpenAI 등 채우기
npm run dev
```

http://localhost:3000

## 배포·운영 (10줄)

1. Supabase SQL 적용 — [docs/MORNING_CHECKLIST.md](docs/MORNING_CHECKLIST.md)  
2. Vercel env = `.env.example` 대조 (`BRICLOG_CRON_SECRET` 포함)  
3. `npm run build` && `npm run test:quality` && `npm run test:director`  
4. Redirect: `https://<도메인>/auth/callback`  
5. 크론 1회 — [docs/DAILY_CRON_SETUP.md](docs/DAILY_CRON_SETUP.md)  
6. 전체 운영: **[docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)**  
7. 출시 게이트: [docs/FINAL_LAUNCH_CHECKLIST.md](docs/FINAL_LAUNCH_CHECKLIST.md)  
8. UX 원칙: [docs/DESIGN_JOBS_AUDIT.md](docs/DESIGN_JOBS_AUDIT.md)  

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run test:quality` | 품질 엔진 회귀 |
| `npm run test:director` | 시나리오·요금제 검증 |
| `npm run daily:develop` | 일일 크론 (로컬) |

## 스택

Next.js 16 · Supabase · OpenAI · 토스페이먼츠

## 문의

운영: `.env`의 `NEXT_PUBLIC_BRICLOG_CONTACT_EMAIL` (기본 `support@briclog.ai`)
