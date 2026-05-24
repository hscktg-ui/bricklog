# 배포 전 점검 보고서

**일시:** 2026-05-22  
**환경:** 로컬 `.env.local` + `http://localhost:3000`  
**실행:** `npm run build`, `test:quality`, `test:director`, API 스모크, 코드 감사

---

## 1. `npm run build`

| 항목 | 결과 |
|------|------|
| 컴파일 | **PASS** |
| TypeScript | **PASS** |
| 정적 페이지 (57) | **PASS** |
| API Route (빌드 목록 53 dynamic) | **PASS** |
| 경고 | middleware → proxy deprecation (Next 16, 기능 영향 없음) |

---

## 2. API Route 점검

**총 53개 `route.js` 파일** (빌드 출력 53 dynamic + 정적 페이지 별도)

| 구분 | 개수 | 인증 |
|------|------|------|
| 공개 (status, stats, check-email 등) | ~10 | 없음 / IP rate limit |
| 사용자 JWT (`requireUser` / `requireVerifiedUser`) | ~35 | Bearer |
| 관리자 (`requireAdminApi` + middleware) | 12 | allowlist + 404 |
| Cron | 2 | `Bearer BRICLOG_CRON_SECRET` |
| Toss webhook | 1 | HMAC (프로덕션 필수) |

**로컬 스모크 (무인증/잘못된 인증)**

| 경로 | 기대 | 실제 |
|------|------|------|
| GET `/api/content/status` | 200 | 200 |
| GET `/api/public/stats` | 200 | 200 |
| GET `/api/brands` | 401 | 401 |
| GET `/api/memory/content` | 401 | 401 |
| POST `/api/cron/daily-develop` (키 없음) | 401 | 401 |

**이번 점검 중 수정 (CRITICAL)**

- `app/api/billing/toss/webhook/route.js` — 프로덕션에서 `TOSS_PAYMENTS_WEBHOOK_SECRET` 없으면 **503 거부** (이전: 서명 검증 생략 → 위조 웹훅 가능)
- `app/api/billing/usage/route.js` — try/catch + 한국어 오류 메시지

**WARN (베타 허용, 프로덕션 전 검토)**

- `/api/trends/snapshot` GET — 비인증 스냅샷 읽기
- `/api/auth/check-email`, `check-nickname` — 등록 여부 탐색 가능 (rate limit 일부)
- `/api/assistant/chat` — 비로그인 IP 제한만으로 OpenAI 호출 가능

---

## 3. 환경변수

**로컬 `.env.local` 키 존재 여부 (값 미노출)**

| 변수 | 로컬 | 프로덕션 필수 |
|------|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | SET | **필수** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SET | **필수** |
| `OPENAI_API_KEY` | SET | **필수** (본문 생성) |
| `NEXT_PUBLIC_APP_URL` | **MISSING** | **필수** (OAuth·결제 리다이렉트) |
| `SUPABASE_SERVICE_ROLE_KEY` | SET | 권장 (닉네임·통계·cron) |
| `BRICLOG_ADMIN_EMAILS` | MISSING (로컬) | **필수** (/admin) |
| `BRICLOG_CRON_SECRET` | MISSING (로컬) | **필수** (일일 크론) |
| `TOSS_PAYMENTS_WEBHOOK_SECRET` | (미확인) | **필수** (라이브 결제 시) |

**Vercel 배포 전:** `.env.example` 전 항목 대조 + `NEXT_PUBLIC_APP_URL=https://<도메인>`

---

## 4. Supabase 인증

| 항목 | 상태 |
|------|------|
| 클라이언트 PKCE + sessionStorage | 코드 OK (`lib/supabaseClient.js`) |
| 콜백 `/auth/callback` | 라우트 존재 |
| API `requireUser` / `requireVerifiedUser` | 이메일·휴대폰 검증 게이트 |
| Placeholder URL 감지 | `isSupabaseConfigured` |

**운영 확인 필요 (DB 콘솔):** Redirect URL에 `https://<도메인>/auth/callback` 등록

---

## 5. 모바일 반응형

| 항목 | 코드 기준 |
|------|-----------|
| `MobileBottomNav` | 하단 고정, safe-area |
| 랜딩 sticky CTA | 48px 터치 영역 |
| 워크스페이스 | `pb-[calc(var(--workspace-mobile-nav-h)+safe-area)]` |
| 블로그 폼 | `max-lg:max-h-[52dvh]` 분할 |

**수동:** 실기기 또는 DevTools 390px — 랜딩 CTA, 사이드바, 녹색 「이야기 쓰기」, 하단 nav 겹침 없음

---

## 6. OpenAI 호출

| 항목 | 결과 |
|------|------|
| GET `/api/content/status` | `llmAvailable: true`, `mode: openai`, `clientReady: true` |
| `operatorHint` | `NODE_ENV !== development` 시 **null** (비노출) |
| `test:quality` | **PASS** |
| `test:director` | **PASS** (5 scenarios) |

---

## 7. RLS (저장소 SQL 기준)

`supabase/schema-v2-saas.sql`, `schema-v3-memory.sql` 등:

- `brands` — RLS ON, `auth.uid() = user_id`
- `content_items`, `content_versions`, `user_templates`, `brand_assets` — 동일 패턴
- `usage_logs` — 본인 조회/삽입만

**운영 확인 필요:** 프로덕션 DB에 v2→v14 마이그레이션 **전체 적용** 여부 ([MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md))

---

## 8. 콘솔 오류

| 항목 | 상태 |
|------|------|
| `ContentFormContext is not defined` | **수정 완료** (이전 세션) |
| 프로덕션 `app/error.jsx` | 기술 메시지 **비노출** (dev만) |
| 빌드/테스트 | 오류 없음 |

**수동:** 로그인 → 블로그 탭 → 지역 입력 시 React/콘솔 에러 없음

---

## 9. 보안

| 항목 | 상태 |
|------|------|
| Admin API | middleware + `requireAdminApi` → 비관리자 **404** |
| 서비스 롤 | 서버 전용 env (NEXT_PUBLIC 금지) |
| Toss webhook | 프로덕션 시크릿 **필수** (이번 수정) |
| 하드코드 API 키 | 소스 내 미발견 (정적 감사) |
| 고객 UI 품질 90점 | 미노출 (관리자만) |

---

## 10. 출시 가능 여부

### 베타 (제한 사용자·내부/초대)

**가능** — 다음만 프로덕션에 맞추면 됨:

1. Vercel env: Supabase, OpenAI, `NEXT_PUBLIC_APP_URL`, `BRICLOG_ADMIN_EMAILS`
2. Supabase SQL 마이그레이션 적용
3. OAuth Redirect URL 등록
4. 스모크: 가입 → 블로그 생성 → 복사

결제·크론·SMS는 베타 정책에 따라 선택.

### 정식 출시 (Production)

**조건부 보류** — 아래 미완 시:

- [ ] `NEXT_PUBLIC_APP_URL` 프로덕션 도메인
- [ ] `BRICLOG_CRON_SECRET` + cron 1회 성공
- [ ] `TOSS_PAYMENTS_WEBHOOK_SECRET` + 라이브 PG 스모크
- [ ] 프로덕션 DB 마이그레이션 전체
- [ ] `BRICLOG_ADMIN_EMAILS` 운영자 메일

---

## 재검사 (수정 후)

- [x] `npm run build` — PASS
- [x] Toss webhook 프로덕션 가드
- [x] `test:quality` / `test:director` — PASS
