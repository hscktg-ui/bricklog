# 토스페이먼츠(Toss Payments) 연동 — BRICLOG 운영자 체크리스트

BRICLOG 유료 플랜(브랜드 19,900원/월, 스튜디오 39,000원/월)은 **토스페이먼츠 SDK v2**와 서버 API로 연동됩니다. 시크릿 키는 **절대** 클라이언트·GitHub에 노출하지 마세요.

## 1. 가맹점·계약

- [토스페이먼츠](https://www.tosspayments.com/) 가맹점 가입 및 전자결제 계약
- 개발자센터 → [API 키](https://developers.tosspayments.com/my/api-keys)
  - **테스트**: `test_ck_*` / `test_sk_*` (실제 청구 없음)
  - **라이브**: `live_ck_*` / `live_sk_*` (실제 청구)
- **자동결제(빌링)** 를 쓰려면 별도 계약·MID 필요 → `TOSS_BILLING_MODE=billing`
- 일반 카드 **일회 결제**만이면 `TOSS_BILLING_MODE=payment` (기본값, 테스트 키로 바로 시험 가능)

## 2. 환경 변수 (.env / 배포 시크릿)

| 변수 | 노출 | 설명 |
|------|------|------|
| `TOSS_PAYMENTS_SECRET_KEY` | 서버만 | `test_sk_*` 또는 `live_sk_*` |
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | 브라우저 | `test_ck_*` 또는 `live_ck_*` |
| `NEXT_PUBLIC_APP_URL` | 공개 | 예: `https://your-domain.com` (리다이렉트·웹훅 URL 기준) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버만 | 구독·결제 대기 주문 DB 갱신 필수 |
| `TOSS_BILLING_MODE` | 서버 | `payment` \| `billing` (기본 `payment`) |
| `TOSS_PAYMENTS_WEBHOOK_SECRET` | 서버 | 선택 — payout/seller 웹훅 HMAC 검증용 |

구 env 호환: `TOSS_SECRET_KEY`, `TOSS_CLIENT_KEY` 도 인식합니다.

**관리자**: `BRICLOG_ADMIN_EMAILS=hscktg@gmail.com` (쉼표 구분) — 기존과 동일, 결제와 무관하게 `/admin` 접근.

## 3. Supabase SQL

SQL Editor에서 순서대로 실행:

1. `supabase/schema-v5-billing.sql` (없을 때)
2. `supabase/schema-v5c-toss-billing.sql` — `billing_checkouts`, `toss_billing_keys`
3. `supabase/schema-v5d-subscription-management.sql` — 플랜 변경·기간·해지 예약 컬럼

## 4. 리다이렉트 URL (토스 개발자센터·결제 연동 설정)

| 용도 | URL |
|------|-----|
| 결제 성공 | `{APP_URL}/billing/toss/success` |
| 결제 실패 | `{APP_URL}/billing/toss/fail` |

로컬: `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## 5. 웹훅 URL

| 이벤트 | URL | 검증 |
|--------|-----|------|
| 결제 상태 변경 | `{APP_URL}/api/billing/toss/webhook` | 일반 결제: **서명 없음** → 서버가 `paymentKey`로 [조회 API](https://docs.tosspayments.com/reference) 재확인 후 `user_subscriptions` 갱신 |

개발자센터에서 웹훅 등록 시 `PAYMENT_STATUS_CHANGED` 등 결제 이벤트를 선택하세요.

## 6. 플랜·금액 매핑 (코드 고정)

| 플랜 | plan_id | 금액(KRW) | orderName |
|------|---------|-----------|-----------|
| 무료 | free | — | 결제 없음 |
| 브랜드 | brand | 19,900 | BRICLOG 브랜드 플랜 (월) |
| 스튜디오 | studio | 39,000 | BRICLOG 스튜디오 플랜 (월) |

별도 상품 ID 없음 — `lib/billing/toss/plans.js` 의 `TOSS_PLAN_AMOUNTS` 와 서버 `prepare` 시 저장 금액으로 검증합니다.

## 7. API 엔드포인트 (앱)

| 메서드 | 경로 | 역할 |
|--------|------|------|
| GET | `/api/billing/status` | 클라이언트 키·결제 가능 여부 (시크릿 미포함) |
| GET | `/api/billing/subscription` | 현재 플랜·갱신일·예약 변경 |
| POST | `/api/billing/plan/change` | 업/다운그레이드·해지 예약 (`timing`: `immediate` \| `next_cycle`) |
| POST | `/api/billing/toss/prepare` | 주문 생성·결제창 파라미터 |
| POST | `/api/billing/toss/confirm` | 승인·빌링키 발급 후 구독 활성화 |
| POST | `/api/billing/toss/webhook` | 비동기 결제 완료 보강 |

## 8. 테스트 카드·빌링 (토스 문서 기준)

- **테스트 키**: 실제 출금 없음
- 카드 본인인증 테스트: 인증번호 `000000`
- 테스트 환경 빌링: 카드 BIN 앞 6자리만 유효해도 등록 가능 (라이브는 전체 번호 유효 필요)
- 자동결제(빌링) 미계약 시 `NOT_SUPPORTED_METHOD` → `TOSS_BILLING_MODE=payment` 사용

## 9. 운영 점검

1. `.env` 에 테스트 키 설정 → `npm run dev` → 로그인 → **플랜 업그레이드** → 브랜드/스튜디오 **토스로 업그레이드**
2. 성공 후 `/billing/toss/success` → 대시보드, `/api/billing/usage` 에 plan 반영
3. `npm run build` 통과 확인
4. 라이브 키 전환 시 `NEXT_PUBLIC_APP_URL` HTTPS 도메인·웹훅 URL 재등록

## 10. 플랜 변경 (구현됨)

- **업그레이드**: 토스 결제 확인 후 즉시 `user_subscriptions.plan` 갱신
- **다운그레이드·해지**: `pending_plan` + `plan_effective_at` = `current_period_end` (다음 결제일부터)
- **구독 UI**: 사이드바 `SubscriptionPanel`, `PricingModal`
- **MVP 갱신**: `TOSS_BILLING_MODE=payment` 이면 매월 수동 결제 또는 추후 cron; `billing` 이면 빌링키 + 자체 cron

## 11. 미구현·추후

- 매월 자동 갱신 **cron** (빌링키 `POST /v1/billing/{billingKey}`) — 토스는 스케줄 미제공
- 업그레이드 **일할·차액** 결제
- Stripe 경로는 env 플래그만 유지, UI는 토스 우선

문의: [hscktg@gmail.com](mailto:hscktg@gmail.com)
