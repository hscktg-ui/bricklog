# BRICLOG — 집에서 돌아온 뒤 5분 체크리스트

상세 배포·SQL·env: **[TODAY_RELEASE_NOTES.md](./TODAY_RELEASE_NOTES.md)** · 결제: **[TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md)**

## 1. 개발 서버

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd D:\briclog
# 3000 포트가 멈춰 있으면: Get-NetTCPConnection -LocalPort 3000 → taskkill /PID <pid> /F
npm run dev
```

브라우저: http://localhost:3000

## 2. Supabase 스키마 (아직 안 했다면)

SQL Editor — **파일 내용 전체** 붙여넣기:

**기존 DB 없음:** `schema-v2-saas.sql` → `schema-v3-memory.sql`

**오늘 배포 순서:** `v6` → `v7` → `v8` → `v9` → **`v9b-signup-personalization`** → `v5-billing` → `v5c-toss` → `v5d-subscription`

파일: `supabase/schema-v9b-signup-personalization.sql` — `company_name`, `role_type`, `preferred_title`, `main_brand_name`, `main_industry`, `brand_count_band`, `primary_use_case`, `profile_completed_at`, `profile_setup_skipped_at`

(선택) `schema-v4-quality-training.sql`

## 3. 환경 변수 (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `BRICLOG_ADMIN_EMAILS=hscktg@gmail.com` (운영자만 — [ADMIN_ACCESS.md](./ADMIN_ACCESS.md))
- OAuth: `NEXT_PUBLIC_OAUTH_*=true` (Provider 켠 뒤만)
- 토스: `TOSS_PAYMENTS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`, `NEXT_PUBLIC_APP_URL`

## 4. 빌드·테스트 (1분)

```powershell
npm run build
npm run test:quality
npm run test:director
```

## 5. 가입·프로필 (v9b)

- **이메일 가입:** AuthForm 1단(계정·약관) → 2단(닉네임·호칭·역할 등) · 「나중에」는 `profile_setup_skipped_at` 기록
- **소셜 가입:** 로그인 후 `ProfileCompletionModal` · 닉네임 중복은 `/api/auth/check-nickname`
- **대시보드:** 프로필 미완료 시 헤더 아래 `ProfileSetupBanner` (모달과 동일 PATCH `/api/auth/profile`)
- v9b SQL 미적용 시 프로필 저장·닉네임 확인 API가 안내 메시지를 반환함

## 6. 기능별 빠른 확인

| 메뉴 | 확인 |
|------|------|
| 랜딩 | 샘플 로테이션·가입 CTA |
| 블로그 생성 | 글 생성 + 전체복사 + 90점 검수 힌트 |
| 플레이스·인스타 | 채널별 폼·모바일 간략/전체 |
| 브랜드 작업실 | 기록·템플릿·자료 |
| 생성 기록 | generations 목록 |
| 구독 | 3단 요금·토스 테스트 |
| `/admin` | 통계 + 품질 테스트(5~10건) |

## 7. 최근 정리 (폴리시)

- 사이드바 알림음: 🔊/🔇 토글만 (미리듣기·타입 라벨 없음)
- Auth: 이메일 우선, OAuth env-gated, callback 수정
- 피드백 UX·채널별 place/insta·푸터·법무·셀프서브 어시스턴트
- v8/v9 개인화·닉네임 dedup·환영 오버레이·idle hints

`npm run build` · `test:quality` · `test:director` — 통과 확인됨.
