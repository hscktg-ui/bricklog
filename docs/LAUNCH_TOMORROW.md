# 내일 출시 — 운영 체크리스트

**우선순위:** (1) 앱이 켜지고 클릭·입력·생성이 된다 → (2) 글 품질

## 출시 전 10분 (운영자)

1. `.env.local` 확인:
   - `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`
   - `OPENAI_API_KEY` (없으면 구성안만 — 사용자에게 안내)
   - `NEXT_PUBLIC_APP_URL` = 실제 도메인
   - `NEXT_PUBLIC_BRICLOG_LAUNCH=true`
   - `NEXT_PUBLIC_BRICLOG_FAST_ONBOARDING=true` (기본 켜짐)
2. Supabase: 이메일 인증·`profiles`·`brands` 마이그레이션 적용
3. `LAUNCH.bat` 또는:
   ```bash
   npm run build
   npm run prelaunch
   npm run start:3005
   ```
4. 브라우저 **Ctrl+Shift+R** → 가입 → 브랜드·지역·주제 → **이야기 쓰기**

## 자동 검증

| 명령 | 내용 |
|------|------|
| `npm run prelaunch` | build + quality + eight-users + (서버 시) click-blockers |
| `npm run test:eight-users` | 8 페르소나 경로 |
| `BASE_URL=http://127.0.0.1:3005 npm run test:click-blockers` | 클릭 차단 |

로그인 E2E: `.env.local`에 `BRICLOG_TEST_EMAIL`, `BRICLOG_TEST_PASSWORD`

## 코드에 반영된 출시 최적화

- 생성 API 타임아웃 130초 + 사용자 메시지
- 브랜드 저장·LLM 병렬, `flushSync` 로딩
- 지역 IME 조합 중 멈춤 방지
- 커서 슬랩(`::after`), `active:scale` 제거
- 랜딩 CTA `data-briclog-cta="start"`, 인트로 건너뛰기
- 자료조사 패널 — 켠 뒤에만 마운트
- 출시 빌드 시 가입 SMS 선택적 (`isLaunchBuild`)

## 아직 수동 (코드만으로 불가)

- 토스 **실결제** 키·웹훅
- SMS Solapi 프로덕션 발신번호
- DNS·HTTPS·Vercel/호스팅 배포

## 장애 시

- 포트 점유: 작업 관리자에서 `node` 종료 후 `START.bat`
- `.next` 잠금: `next start`만 쓰거나 `dev`만 쓰기 (동시 금지)
