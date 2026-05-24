# BRICLOG 최종 베타·출시 체크리스트

**작성일:** 2026-05-22  
**범위:** 코드베이스 정적 감사 + `npm run build` (로컬 `.env.local` 기준)  
**참고:** [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) · [DIRECTOR_NORTH_STAR.md](./DIRECTOR_NORTH_STAR.md) · [AGENTS.md](../AGENTS.md)

---

## 요약

BRICLOG은 **베타 출시 가능 수준**입니다. `npm run build`는 통과했고(Next 16.2.6, 56 라우트), 인증·작업 공간·콘텐츠 파이프라인·한국어 오류 메시지·로딩 피드백·법무 페이지·랜딩 CTA는 제품 경로에 잘 갖춰져 있습니다. **치명적 런타임 버그는 고객 경로에서 확인되지 않았습니다.**

다만 **운영·결제·크론·DB 마이그레이션**은 저장소만으로 검증할 수 없어, 프로덕션 DB 적용·토스 라이브·일일 크론 1회 성공 전까지는 “정식 출시(Production)”로 보기 어렵습니다. 내부 품질 90점 목표는 스크립트·오케스트레이터에만 있고, 고객 UI는 **숫자 점수 없이** “발행 전 검수·피드백 반영” 루프로 설계되어 있어 전략과 일치합니다.

국내 앱(토스·카카오·네이버·헤이딜러) 대비 **편의성 갭**은 주로 SEO·고객 문의 채널·배포 문서·첫 방문 인트로 피로·CI 테스트 동기화입니다. 이번 주는 큰 기능 없이 **운영 체크리스트·문서·스모크·테스트 문자열 수정** 위주로 닫는 것을 권장합니다.

---

## 오류·버그 (있음/없음)

| 항목 | 상태 | 근거/파일 |
|------|------|-----------|
| 프로덕션 빌드 | **없음** | `npm run build` 통과 (middleware→proxy deprecation 경고만) |
| 고객 경로 TODO/FIXME | **없음** | `app/`·`components/`·`lib/` 소스에 미해결 TODO 없음 (품질 엔진은 placeholder **탐지용** 정규식만) |
| 고객 UI에 「90점」 노출 | **없음** | `app/admin/AdminPageClient.js` 관리자만; `components/QualityPanel.jsx`는 `N/5 충족`·자수; `QualityScorePanel.jsx`는 미사용(orphan) |
| 깨진 `href="#"` | **없음** | `app/`·`components/` 검색 결과 없음 |
| 법무·푸터 링크 | **없음** | `/terms` `/privacy` `/refund` — `components/layout/SiteFooter.jsx` |
| OAuth/이메일 콜백 | **없음** | `app/auth/callback/page.js` + `lib/auth/messages.js` 한국어 매핑 |
| `test:quality` | **없음** | `npm run test:quality` 통과 |
| `test:director` | **확인필요** | **실패:** `lib/billing/plans.js`의 brand가 `image` 포함 4채널인데, `scripts/test-director-scenarios.mjs`는 3채널 문자열만 검사 |
| 일일 크론 실제 실행 | **확인필요** | `docs/daily-run-latest.md` 아직 placeholder — `docs/DAILY_CRON_SETUP.md` |
| 프로덕션 DB 마이그레이션 | **확인필요** | v9b·v10·v11·v12·billing — [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) §2 |
| 토스 라이브 결제 | **확인필요** | 코드 완비, 키·웹훅·SQL 적용은 운영자 — `docs/TOSS_PAYMENTS_SETUP.md` |
| 전역 에러 화면 기술 메시지 | **확인필요** | `app/error.jsx`가 `error.message`를 그대로 표시 — 프로덕션에서 드물게 영문 스택성 문구 노출 가능 |
| 피드백 저장 실패 메시지 | **확인필요** | `components/feedback/ContentFeedbackPanel.jsx` — `err.message` 직접 표시 (`mapServiceError` 미사용) |
| `CreateWorkspace` + `EMPTY_STATE` | **없음**(미사용) | `components/CreateWorkspace.jsx`는 어디에서도 import 안 됨 — 런타임 영향 없음 |
| `console.error` 고객 UI | **없음** | API·결제·SMS 서버 로그 위주; 클라이언트는 `TossCheckout.jsx` 1곳(사용자 토스트 병행) |

---

## 편의성 — 국내 앱 기준 갭

| 영역 | 현재 상태 | 토스/카카오/네이버/헤이딜러 수준 대비 | 우선순위 | 개선 제안 (최소) |
|------|-----------|--------------------------------------|----------|------------------|
| **온보딩** | 랜딩 인트로·데모·`무료 시작` CTA, 가입 시 약관·이메일 중복·SMS(설정 시) | 카카오/토스: 가입 단계 짧고 “나중에” 명확 — **프로필 모달·3일 미루기**는 유사(`ProfileCompletionModal.jsx`) | P1 | 첫 방문 **매번** `LandingIntroOverlay` — 재방문은 session/local로 1회만 또는 스킵 버튼 강조 |
| **첫 성공 경험** | `ChannelStartScreen`·`WelcomeOverlay`·샘플 프리셋·블로그 1회 생성 플로우 | 헤이딜러: 첫 액션 1개에 집중 — 워크스페이스 메뉴·채널 다수 | P1 | 신규 사용자 기본 메뉴를 **블로그 1개**로 고정 안내(기존 `defaultMenuFromProfile` 활용) |
| **로딩/피드백** | `GenerationLoadingOverlay` 단계 문구·완료 사운드·`Toast`·스켈레톤 | 토스: 단계+완료 메시지 — **충족** | P2 | 장시간 생성 시 **취소** 버튼만 추가 검토(기능 확장 최소) |
| **모바일** | 하단 `MobileBottomNav` `min-h-11`, 랜딩 sticky CTA `48px`, safe-area | 네이버/카카오: 44px+ 탭 — **대체로 충족** | P2 | 일부 폼 `text-[10px]` 라벨 — 터치 영역만 `min-h-11` 점검 |
| **복사/발행 흐름** | `ResultToolbar` 복사·다운로드, 채널별 결과, 직접 업로드 안내(북스타) | 네이버 블로그: 붙여넣기 중심 — **적합** | P2 | 복사 성공 시 토스트 1회 통일(이미 대부분 있음) |
| **결제/베타** | `PricingModal`·토스 SDK·실패/성공 페이지·베타 한도 우회 env | 토스: 결제 실패 사유·돌아가기 — **fail 페이지 있음** | P0(운영) | 라이브 PG 전 **테스트 결제 1회** + `billingStatus.userMessage` 프로덕션 확인 |
| **고객지원/문의** | 푸터 사업자 정보·법무 링크, FAB 어시스턴트 | 카카오/토스: 채팅·이메일·FAQ 링크 명시 — **전용 문의 채널 없음** | P1 | 푸터에 `mailto:` 또는 카카오 채널 1줄 추가(문서만 아닌 UI) |
| **신뢰 카피** | 약관·개인정보·환불·랜딩 `LANDING_HERO_MOBILE_TRUST` | 헤이딜러: 요금·환불 upfront — 요금 섹션 **있음** | P2 | 결제 모달에 “언제 과금되는지” 한 줄 고정 표기 |
| **뒤로가기/스킵** | 프로필 나중에·OAuth 취소 한국어·모달 backdrop 스킵 | **양호** | P2 | — |
| **폼 검증/비밀번호·휴대폰** | `mapAuthError`, 비밀번호 필드, SMS 쿨다운 60초 | **양호** | P1 | SMS 미설정 시 가입 경로 **사전 안내** 배너(`docs/SMS_SETUP.md` 링크) |
| **빈 상태** | `HistoryList`·작업 공간 채널 웰컴 | **양호** | P2 | — |
| **접근성 기초** | `lang="ko"`, 일부 `aria-label`·`role="status"` | OG 앱 수준 전면 a11y는 아님 | P2 | 주요 CTA·모달 포커스 트랩 1회 점검 |
| **SEO/공유** | root title/description만 | 네이버 검색·카톡 미리보기 — **robots/sitemap/OG 없음** | P1 | `app/layout.js`에 openGraph 3필드 + `public/robots.txt` |
| **배포·env 문서** | `.env.example` 상세, `README.md`는 CRA 기본 | 토스 개발자센터식 단일 체크리스트 부족 | P1 | README에 “베타 배포 10줄” + `.env.example`에 `BRICLOG_CRON_SECRET` 추가 |

---

## 품질·개인화 (내부 90점 + 사용자 개선 루프)

- **내부 QA:** `lib/quality/coreQualityEngine.js`·`contentOrchestrator`에서 90점 미만 최대 5회 재작성. `npm run test:quality`로 회귀 확인. 이 점수는 **운영·스크립트 전용**이며 고객에게 노출하지 않습니다.
- **고객 UI:** `components/QualityPanel.jsx` — 「발행 전 검수」「N/5 충족」·채널별 자수/키워드 횟수. `components/feedback/ContentFeedbackPanel.jsx` — 반응·태그·메모 후 **즉시 반영** 가능. 숫자 품질 점수 UI는 넣지 않는 것이 맞습니다.
- **전략 정합:** 사용자는 피드백·개인화로 만족할 때까지 다듬고, 복사·직접 발행합니다. 내부 90점은 “출하 최소선”이지 마케팅 지표가 아닙니다.

---

## 출시 전 체크리스트 (actionable)

### 기술

- [ ] `npm run build` CI/로컬 통과
- [ ] `npm run test:quality` 통과
- [ ] `npm run test:director` 통과 — **plans 4채널 반영 후 시나리오 E 문자열 수정**
- [ ] Supabase SQL 전체 적용 (v9b, billing v5*, v10, v11, v12) — [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md)
- [ ] Vercel env: `SUPABASE_*`, `OPENAI_*`, `NEXT_PUBLIC_APP_URL`, `BRICLOG_ADMIN_EMAILS`, `BRICLOG_CRON_SECRET`
- [ ] Supabase Redirect: `https://<도메인>/auth/callback`
- [ ] `POST /api/cron/daily-develop` 1회 성공 → `docs/daily-run-latest.md` 갱신
- [ ] 프로덕션 스모크: 랜딩 → 가입/로그인 → 블로그 생성 → 복사 → `/terms` `/privacy` `/refund`

### UX

- [ ] 무료 플랜 place/insta **업그레이드 안내** 동작 확인 (`context/ContentContext.jsx`)
- [ ] 모바일: 랜딩 sticky CTA + 워크스페이스 하단 nav 겹침 없음
- [ ] 생성 중 오버레이·완료 메시지 한국어 확인 (`GenerationLoadingOverlay.jsx`)
- [ ] 프로필 “나중에” / 배너 재진입 (`ProfileCompletionModal.jsx`, `ProfileSetupBanner.jsx`)
- [ ] (선택) 랜딩 인트로 재방문 스킵

### 운영

- [ ] `.env.example` ↔ Vercel 실제 값 대조 (`BRICLOG_CRON_SECRET` 포함)
- [ ] README 또는 `docs/MORNING_CHECKLIST.md`를 **배포 진입점**으로 안내
- [ ] `BRICLOG_STATS_MODE` seed/live 의도 확인 (`/api/public/stats`)
- [ ] 관리자 allowlist만 `/admin` 접근 — [ADMIN_ACCESS.md](./ADMIN_ACCESS.md)
- [ ] 푸터 **고객 문의** 1채널 추가

### 법무/결제

- [ ] `/terms` `/privacy` `/refund` 최신 본문 (`content/legal/*.md`)
- [ ] 토스 테스트→라이브 키, success/fail URL, webhook — [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md)
- [ ] 베타 기간 `BETA_FULL_ACCESS_UNTIL` 정책 팀 합의
- [ ] 결제 실패 페이지 카피 검수 (`app/billing/toss/fail/page.js`)

### 콘텐츠

- [ ] 랜딩 요금·한도 문구 = `lib/billing/plans.js`와 일치
- [ ] 의료·법률 등 민감 업종 배너/softPass 스모크
- [ ] 어시스턴트: “직접 발행 없음” 안내 유지 (`BriclogAssistant`)

---

## 이번 주 권장 작업 Top 5

1. **`test-director-scenarios.mjs` 시나리오 E 수정** — brand/studio `pipelineChannels`에 `image` 반영 (5분).
2. **프로덕션 Supabase SQL + Vercel env** — v9b·v10–v12·billing + `BRICLOG_CRON_SECRET` ([PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) Quick checklist).
3. **크론 1회 수동 실행** — `npm run daily:develop` 또는 POST 후 `daily-run-latest.md` 확인.
4. **`.env.example`에 `BRICLOG_CRON_SECRET` 주석 추가** + README 상단에 `docs/MORNING_CHECKLIST.md` 링크 3줄.
5. ~~**푸터 문의 1줄 + openGraph 최소 3필드**~~ — **반영됨** (`SiteFooter` · `app/layout.js` · `public/robots.txt`).

---

## 빌드·테스트 기록 (본 감사)

| 명령 | 결과 |
|------|------|
| `npm run build` | **통과** (middleware deprecation 경고) |
| `npm run test:quality` | **통과** |
| `npm run test:director` | **실패** — plans 4채널 vs 테스트 3채널 기대 |

---

*관련: [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) · [DIRECTOR_NORTH_STAR.md](./DIRECTOR_NORTH_STAR.md)*
