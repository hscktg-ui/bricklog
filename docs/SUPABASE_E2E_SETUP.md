# Supabase — E2E·저장 기능 적용 순서

브랜드·콘텐츠·플레이스/인스타 DB 저장을 쓰려면 Supabase SQL Editor에서 **아래 순서대로** 실행하세요.

1. `supabase/schema.sql` — generations (생성 기록)
2. `supabase/schema-v2-saas.sql` — brands + RLS
3. `supabase/schema-v3-memory.sql` — content_items, content_versions
4. `supabase/schema-v7-auth-profiles.sql` — profiles
5. `supabase/schema-v10-research.sql` — 조사 컬럼 (선택)

적용 후:

```bash
npm run test:auth-persistence
```

`.env.local`에 `BRICLOG_TEST_EMAIL`, `BRICLOG_TEST_PASSWORD`(이메일 인증 완료 계정)가 있어야 합니다.

**재로그인 후 편집본 복원:** 브랜드 선택 시 `content_items`에서 블로그·플레이스·인스타 최신본을 자동 불러옵니다. 브랜드 작업실 「저장한 글」에서 **작업실에서 열기**로 채널 편집 화면으로 이동할 수 있습니다.
