# 로컬 접속 (접속 안 될 때)

## 빠른 확인

```bash
npm run local:status
```

응답이 있는 포트 URL로 브라우저를 엽니다.

## 자주 나는 원인

| 증상 | 원인 | 해결 |
|------|------|------|
| `localhost:3000` 타임아웃 | dev 서버 미기동 또는 다른 포트 | `npm run local:status` 로 실제 포트 확인 |
| `next dev` — lock / EPERM | `npm run start` 가 `.next` 점유 | 터미널에서 `next start` 중지 후 `npm run dev` |
| dev가 3002 등으로 뜸 | 3000 사용 중 | 해당 포트로 접속하거나 `npm run dev:3005` |
| 프로덕션만 필요 | build 후 start | `npm run build && npm run start:3005` → http://localhost:3005 |
| 글자만 보이고 스타일 없음 | `/_next/static/*.css` 가 500 (빌드·서버 불일치) | 3005 서버 중지 → `npm run build` → `npm run start:3005` → 강력 새로고침 |

## 권장 (한 가지만)

- **개발(핫 리로드):** `npm run dev` → 보통 http://localhost:3000
- **빌드 확인:** `npm run build && npm run start:3005` → http://localhost:3005

`next dev` 와 `next start` 를 동시에 켜지 마세요. `.next` 잠금으로 dev가 실패합니다.

## 클릭 진단 (로그인 후)

1. dev 접속 후 로그인
2. 왼쪽 하단 **「클릭 진단」** → **진단 실행**
3. 상세: [CLICK_BLOCKER_DIAGNOSIS.md](./CLICK_BLOCKER_DIAGNOSIS.md)
