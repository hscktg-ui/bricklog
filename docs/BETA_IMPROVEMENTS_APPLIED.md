# 베타 개선 적용 목록 (2026-05-21)

감사·UI 안정성·제품 감리에서 도출된 **기능 추가 없이** 적용한 수정입니다.

## 온보딩·5분 미션

| 항목 | 파일 |
|------|------|
| 랜딩 인트로 세션 1회만 | `LandingPage.jsx` + `landingSession.js` |
| 환영 오버레이 2.5초 | `WelcomeOverlay.jsx` |
| 채널 선택 생략(개발·`FAST_ONBOARDING`) | `Dashboard.jsx`, `productFlags.js` |
| 가입 SMS 선택(개발·플래그) | `AuthForm.jsx`, `productFlags.js` |
| 「예시로 빠르게 채우기」 | `BlogEditor.jsx`, `firstWriteSeed.js` |

## 인터랙션·성능

| 항목 | 파일 |
|------|------|
| 브랜드명 등 입력 디바운스 | `useBufferedObjectPatch.js` |
| form draft 600ms | `formDraft.js` |
| 생성 즉시 로딩 UI | `ContentContext.jsx` |
| BrandSwitcher 검색 state | `BrandSwitcher.jsx` |
| overlay 비차단 | `WelcomeOverlay`, `GenerationLoadingOverlay`, `ConfirmModal`, `TermsConsentModal`, 로그인 모달 |
| 네트워크 오류 문구 | `clientAuth.js` |
| 생성 대기 안내(30초~2분) | `GenerationLoadingOverlay.jsx` |

## UI 통일

| 항목 | 파일 |
|------|------|
| `.briclog-btn-primary` / `secondary` | `globals.css`, `GenerateButton`, `BlogEditor`, 랜딩 CTA |
| 로딩 스피너 | `PageLoadingState.jsx`, `page.js` |

## 운영자 `.env.local` 권장 (프로덕션 베타)

```env
NEXT_PUBLIC_BRICLOG_FAST_ONBOARDING=true
NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL=true
OPENAI_API_KEY=...
```

결제·Supabase SQL·실서버 헬스는 [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) 참고.
