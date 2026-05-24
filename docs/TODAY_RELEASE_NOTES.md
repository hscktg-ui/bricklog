# BRICLOG — 오늘 배포 노트 (운영자)

집에서 **5분** 점검용. 상세 결제는 [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md).

## 1. Supabase SQL (신규/미적용 시 — 순서 고정)

SQL Editor에 **파일 전체** 붙여넣기 (경로 문자열 X).

| 순서 | 파일 | 용도 |
|------|------|------|
| (최초 1회) | `schema-v2-saas.sql` | 브랜드·generations |
| (최초 1회) | `schema-v3-memory.sql` | 브랜드 작업실 |
| 1 | `schema-v6-feedback-learning.sql` | 피드백·학습 이벤트 |
| 2 | `schema-v7-auth-profiles.sql` | 프로필·약관·contents |
| 3 | `schema-v8-personalization.sql` | 맞춤 개인화 |
| 4 | `schema-v9-signup-profile.sql` | 닉네임 중복·가입 완료 |
| 5 | `schema-v5-billing.sql` | 플랜·구독 (없을 때) |
| 6 | `schema-v5c-toss-billing.sql` | 토스 결제·checkout |
| 7 | `schema-v5d-subscription-management.sql` | 플랜 변경·해지 예약 |

선택: `schema-v4-quality-training.sql` (관리자 품질 테스트 DB)

## 2. `.env.local` 필수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
BRICLOG_ADMIN_EMAILS=hscktg@gmail.com
```

**OAuth** (Supabase Provider 활성화 후에만):

```env
NEXT_PUBLIC_OAUTH_GOOGLE=true
# NEXT_PUBLIC_OAUTH_KAKAO=true
# NEXT_PUBLIC_OAUTH_NAVER=true
```

Redirect: `http://localhost:3000/auth/callback` (+ 프로덕션 도메인)

**토스** (유료 플랜): `docs/TOSS_PAYMENTS_SETUP.md`

```env
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_BILLING_MODE=payment
```

## 3. 로컬 실행

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd D:\briclog
npm run dev
```

검증:

```powershell
npm run build
npm run test:quality
npm run test:director
```

## 4. 스모크 체크 (2분)

| 항목 | 확인 |
|------|------|
| 랜딩 | 샘플 35종 순환·데모 미리보기 |
| 가입 | 이메일 우선·닉네임 중복 API |
| OAuth | env 없으면 버튼 숨김·`/auth/callback` |
| 대시보드 | 블로그 생성·90점 검수·복사 |
| 사이드바 | 🔊/🔇 알림음만 (미리듣기 없음) |
| 요금제 | 3단(무료/브랜드/스튜디오)·토스 테스트 결제 |
| 법무 | `/terms` `/privacy` `/refund` |
| 관리자 | `BRICLOG_ADMIN_EMAILS` 계정 → `/admin` |

## 5. 포지셔닝 (카피 일관)

- **하는 일**: 발행 **전** 초안·검수·복사
- **안 하는 일**: 네이버·인스타 **직접 업로드·예약 발행**

## 6. 오늘 폴리시 요약

- 사운드: 사이드바 **이모지 on/off**만, `previewSound` 제거
- 랜딩 샘플 풀 35세트
- 품질 목표 90점 (`test:quality` / director 시나리오 통과)
- 채널 게이트·`onToast` 의존성 정리 반영
