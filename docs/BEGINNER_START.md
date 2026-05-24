# 브릭로그 — 초보자 3단계

개발 지식 없이 **로컬에서 사이트 켜기**만 하면 됩니다.

## 1단계: 한 번만 준비

PowerShell을 열고 프로젝트 폴더로 이동:

```powershell
cd D:\briclog
npm run setup:local
```

(이미 `.env.local`에 Supabase·OpenAI 키가 있으면 그대로 사용합니다.)

## 2단계: 서버 켜기

```powershell
npm run start:3005
```

`Ready` 가 보이면 성공입니다.

## 3단계: 브라우저

주소창에 입력:

**http://localhost:3005**

---

## 자주 묻는 것

| 문제 | 해결 |
|------|------|
| 페이지가 안 열림 | `npm run local:status` → `OK` 인 포트로 접속 |
| 스타일 없이 글자만 | 서버 끄기(Ctrl+C) → `npm run setup:local` → `npm run start:3005` |
| 가입이 복잡함 | 개발 모드에서는 휴대폰 인증 생략됨 (이미 설정됨) |
| 글 생성이 안 됨 | 이메일 인증 링크 클릭 후 새로고침 · OpenAI 키 확인 |

## 끄는 방법

서버 켠 터미널에서 **Ctrl + C**

---

더 자세한 운영: [LOCAL_ACCESS.md](./LOCAL_ACCESS.md) · [BETA_IMPROVEMENTS_APPLIED.md](./BETA_IMPROVEMENTS_APPLIED.md)
