# SMS 인증 설정 (가입)

## 1. Supabase SQL + service_role 키

1. SQL Editor에서 **`supabase/schema-v14-phone-sms.sql`** 실행.
2. **Project Settings → API → Secret keys** (또는 Legacy → `service_role`)에서
   **service_role** 키 복사 → `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx
```

- `NEXT_PUBLIC_*` anon/publishable 키와 **다릅니다**. 절대 브라우저·Git에 올리지 마세요.
- 로컬에서 **문자만** 테스트할 때는 비워도 OTP가 동작할 수 있습니다(서버 메모리).
  이메일 중복 확인·운영 배포에는 **필수**입니다.

## 2. 로컬 개발 (문자 없이 테스트)

`.env.local`:

```env
BRICLOG_SMS_DEV_MODE=true
BRICLOG_SMS_OTP_SECRET=긴-랜덤-문자열
# SUPABASE_SERVICE_ROLE_KEY=  ← 없어도 인메모리로 가입 테스트 가능
```

1. **`npm run dev` 재시작** (env 반영 필수)
2. 가입 화면 → **인증번호 받기** → 노란/파란 안내에 **개발 모드 인증번호 6자리** 표시
3. 점검: 브라우저에서 `GET /api/auth/sms/status` → `ok: true`, `devMode: true`

`SUPABASE_SERVICE_ROLE_KEY` 없으면 OTP는 서버 메모리에만 저장됩니다(재시작 시 초기화). 운영 전에는 service role + schema-v14 적용을 권장합니다.

## 3. 운영 (Solapi)

### API 키 — 허용 IP 뭘 넣나요?

Solapi 콘솔에서 API 키 만들 때 **호출하는 서버의 공인 IP**를 등록합니다 (브릭로그 서버 → Solapi로 나가는 IP).

| 환경 | 넣을 IP | 비고 |
|------|---------|------|
| **로컬 PC** (`npm run dev`) | 지금 PC 공인 IP 1개 | [https://api.ipify.org](https://api.ipify.org) 또는 PowerShell: `(Invoke-RestMethod https://api.ipify.org?format=json).ip` — 재부팅·통신사 바뀌면 IP도 바뀔 수 있음 |
| **Vercel / 서버리스** | 고정 IP 없음 | IP 제한 **끄기(모든 IP 허용)** 또는 Vercel Pro **Static IPs** 받아서 그 대역 등록. 비밀키·Rate limit으로 보완 |
| **고정 IP VPS** (AWS EC2 등) | 그 서버의 Elastic IP 1개 | 운영에 가장 깔끔 |

- 로컬만 문자 테스트할 때: Solapi IP에 **집/사무실 공인 IP** 추가.
- 배포까지 같이 쓰려면: Solapi에서 **IP 제한 없음** 키를 쓰거나, 배포 플랫폼 고정 IP를 따로 받아 등록.
- 로컬은 `BRICLOG_SMS_DEV_MODE=true`만 켜 두면 Solapi·IP 설정 없이도 가입 테스트 가능.

### 발신번호 vs 가입 시 입력 번호 (헷갈리기 쉬움)

| 구분 | 설정 위치 | 누구 번호? | 노출 |
|------|-----------|------------|------|
| **발신번호** | `SOLAPI_SENDER_PHONE` + Solapi 콘솔 등록 | **회사·서비스** 번호 (예: `070-8844-7209`) | 이용자 휴대폰 **문자함에 “보낸 사람”**으로만 표시 |
| **수신(인증)** | 가입 화면에서 이용자가 입력 | **본인 휴대폰** (인증번호 받을 번호) | **다른 회원·공개 페이지에 표시 안 함**, DB·프로필 API는 `010-****-1234` 형태 |

→ **대표 개인 010을 발신번호로 쓰지 마세요.** Solapi에 **회사 번호**를 발신번호로 등록하고 `.env`의 `SOLAPI_SENDER_PHONE`에 그 번호를 넣으면 됩니다.

→ 가입 시 입력하는 번호는 “문자 받을 본인 폰”이라 **회사 대표번호(02·1588)로는 인증 문자 수신이 안 되는 경우가 많습니다.** 사업용 휴대폰·본인 010 중 SMS 받을 수 있는 번호를 쓰세요.

### 설정 순서

1. [Solapi](https://solapi.com) 가입 · **회사 발신번호** 등록 (개인 폰 발신 비권장)
2. API Key / Secret 발급 (IP: 위 표 참고)
3. `.env.local` 또는 배포 환경:

```env
SOLAPI_API_KEY=...
SOLAPI_API_SECRET=...
SOLAPI_SENDER_PHONE=07088447209
NEXT_PUBLIC_SMS_SENDER_DISPLAY=070-8844-7209
BRICLOG_SMS_OTP_SECRET=긴랜덤문자열
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. 가입 흐름

1. 휴대폰 번호 입력 → **인증번호 받기**
2. 6자리 입력 → **인증 확인**
3. 이메일·비밀번호·약관 → **가입하기**
4. 이메일 인증 링크 클릭 (Supabase Confirm email ON)
5. 글 생성 · 브랜드 추가 가능

## 5. 차감됐는데 휴대폰에 문자가 안 올 때

1. **수신번호 형식** — 코드는 `01012345678` 형식으로 Solapi에 보냅니다 (`82` 접두 사용 안 함).
2. **발신번호** — Solapi 콘솔 → [발신번호 관리](https://console.solapi.com/senderids)에서 `07088447209`(표시: `070-8844-7209`) 등 **승인 완료** 상태인지 확인.
3. **발송 내역** — [문자 발송 내역](https://console.solapi.com/message-log)에서 해당 건 `statusCode` 확인 (2000=접수, 3040=미등록 발신번호 등).
4. **스팸·야간** — 인증 문자도 통신사/단말 스팸함·수신거부에 걸릴 수 있습니다.

## 6. 기존 회원

연락처가 없던 계정은 글 생성이 가능할 수 있습니다. 연락처가 있으나 `phone_verified_at`이 없으면 상단 배너에서 인증합니다.
