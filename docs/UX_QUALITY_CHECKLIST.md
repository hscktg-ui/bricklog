# UX 품질 체크리스트 (10항목)

코드·구조 기준 점검. **✅** = 구현·수정 완료, **⚠️** = 부분·환경 의존, **❌** = 미충족·수동 검증 필요.

| # | 항목 | 상태 | 근거 |
|---|------|------|------|
| 1 | 모든 버튼 클릭 즉시 반응 | ⚠️ | `touch-action: manipulation`, `active:scale`, 전역 `cursor: pointer`, overlay 비차단 패턴. 네트워크·LLM 대기는 별도. |
| 2 | 입력창 렉 없음 | ✅ | `brandName` 등 핵심 필드 `useBufferedObjectPatch` 디바운스(280ms), draft 600ms. |
| 3 | 페이지 이동 1초 이하 | ⚠️ | 메뉴 전환은 클라이언트 `setActiveMenu`(즉시). 초기 `getSession` 최대 4s, 로딩 escape 3s. |
| 4 | 생성 시작 즉시 피드백 | ✅ | `generateBlog`에서 `startTransition` 제거 → 오버레이·`generating.blog` 동기 반영. |
| 5 | 모바일 완벽 동작 | ⚠️ | `MobileBottomNav`, `100dvh` 사이드바, safe-area. E2E는 서버 기동 후 `npm run test:ui-stability`. |
| 6 | 빈 화면 없음 | ✅ | `PageLoadingState` 스피너 + 안내 문구(준비 중·계정 확인). |
| 7 | 브랜드 기억 정상 | ⚠️ | `BrandWorkspaceContext`, `ensureBrandFromForm`, `brandMemory`·Supabase. DB 마이그레이션·서버 연동 필요. |
| 8 | 폰트/간격/버튼 통일 | ⚠️ | `briclog-btn-primary`·`secondary`, `briclog-surface`. 전 화면 일괄 적용은 점진적. |
| 9 | 로딩상태 표시 | ✅ | `GenerationLoadingOverlay`, 버튼 내 스피너, `generating.*`, `PageLoadingState`. |
| 10 | 에러메시지 이해 가능 | ✅ | `mapAuthError`, API `userMessage`, 토스트 2.8s. 기술 용어 필터링. |

## 이번 수정 (2026-05-23)

- 사용자 카피: `craft.js` SERVICE_STATUS·WELCOME·EDITOR_IMPROVE 단일 소스, 환영·상태 배너 간결화
- 커서: 사이드바·FAB `active:scale` 제거, FullCopyButton 내부 span
- 스모크: `npm run test:eight-users` (8 페르소나 경로 + quality)

## 이전 (2026-05-21)

- 생성 피드백: `ContentContext` `generateBlog` 동기 로딩 상태
- 빈 화면: `components/ui/PageLoadingState.jsx`
- CTA 통일: `app/globals.css` `.briclog-btn-primary`
- 초기 로딩: auth 4s 타임아웃, escape 3s, 스피너 UI
- 로그인 모달: 비차단 overlay 패턴

## 수동 확인 권장

1. 로그인 → 블로그 → 「이야기 쓰기」 → 0.5초 내 오버레이·버튼 스피너
2. 브랜드명 빠른 입력 → 글자 누락 없음
3. 모바일 390px → 하단 탭·사이드바 백드롭 닫힘
4. 약관·환영 모달 닫은 뒤 대시보드 클릭 가능
