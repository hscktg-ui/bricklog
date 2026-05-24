# UI Interaction Stability Audit

증거 기반 점검·수정 기록 (최종 업데이트: 2026-05-21).

## 1. 발견한 오류 목록

| # | 증상 | 심각도 |
|---|------|--------|
| 1 | 버튼 hover 시 포인터 깜빡임 | 높음 |
| 2 | 브랜드명 입력 시 전역 리렌더·localStorage 저장 과다 | 높음 |
| 3 | `BrandSwitcher` 검색창 `localSearch` / `filteredBrands` 미정의 | 높음 (런타임) |
| 4 | 모달 백드롭이 `button` + 전체 `inset-0`로 커서·히트 영역 간섭 | 중간 |
| 5 | `transition-all`로 패널 레이아웃 흔들림 가능 | 낮음 |
| 6 | 로그인 후 전체 화면 overlay 잔류 (약관·환영·로딩) | 조건부 |

## 2. 실제 원인

### 커서 깜빡임 (이전·이번 확인)

- **WelcomeOverlay / GenerationLoadingOverlay / BriclogAssistant**: `fixed inset-0` 셸이 `pointer-events`·`cursor`로 실제 버튼 위 hover를 가로챔 → 셸은 `pointer-events-none`, 카드만 `auto` (이미 적용됨).
- **ConfirmModal**: 닫기용 `<button class="absolute inset-0">` 백드롭이 z 스택에서 커서를 `pointer`↔`default`로 바꿈 → div `role=presentation` + 셸 `pointer-events-none` 패턴으로 수정.
- **globals.css**: `button:enabled { cursor: pointer }` + 자식 `svg` `pointer-events: none`으로 아이콘 위 커서 불안정 완화.

### 입력 렉

- `useBufferedObjectPatch`의 `BUFFERED_FORM_TEXT_KEYS`에 **`brandName`, `region`, `topic`, `mainKeyword`, `subKeyword` 미포함** → `patch()`가 매 키 입력마다 `setBlogInput` 즉시 호출 → `ContentProvider` 전체 구독 컴포넌트 리렌더 + `scheduleSaveFormDraft` 400ms마다 localStorage.
- 수정: 위 필드를 버퍼 키에 추가, 디바운스 280ms, draft 저장 600ms.

### BrandSwitcher

- 검색 input이 `localSearch` state 없이 렌더 → 목록 열 때 ReferenceError 가능.

## 3. 수정한 파일

- `lib/hooks/useBufferedObjectPatch.js`
- `lib/formDraft.js`
- `components/BrandSwitcher.jsx`
- `components/assistant/BriclogAssistant.jsx`
- `app/globals.css`
- `components/ConfirmModal.jsx`
- `components/auth/TermsConsentModal.jsx`
- `scripts/ui-interaction-stability.mjs` (신규)
- `tests/ui-interaction-stability.spec.ts` (신규)
- `playwright.config.ts` (신규)
- `lib/dev/uiInteractionDiagnostics.js` (신규)
- `package.json` (`test:ui-stability`)

## 4. 수정 내용 (요약)

- 핵심 텍스트 필드: 상위 `blogInput` 갱신 280ms 디바운스.
- form draft localStorage: 600ms 디바운스.
- BrandSwitcher: 로컬 검색 state + `filteredBrands` memo.
- 모달: 비차단 셸 패턴 통일.
- BriclogAssistant: `transition-all` → `transition-[transform,opacity]`.

## 5–7. 테스트

```bash
# 서버 (코드 반영 후)
npm run build && npm run start:3005

# 클릭 차단 진단
npm run test:click-blockers

# UI 안정성 (로그인 시 .env.local 계정 필요)
npm run test:ui-stability

# Playwright spec (선택, @playwright/test 필요 시 npm i -D @playwright/test)
npx playwright test tests/ui-interaction-stability.spec.ts
```

리포트: `config/ui-interaction-stability-report.json`, `config/click-blocker-report.json`

## 8. 남은 리스크

- **약관 미동의** 시 `TermsConsentModal` z-[250]은 의도적으로 전면 차단.
- **환영/생성 로딩** overlay가 `open`/`active`로 stuck 되면 클릭 불가 — dev 패널 「클릭 진단」으로 `elementFromPoint` 확인.
- **post-login E2E**는 `BRICLOG_TEST_EMAIL` / `BRICLOG_TEST_PASSWORD` 없으면 대시보드 단계 스킵.
- Dashboard 전체를 Context에서 분리하는 대규모 리팩터는 하지 않음(최소 수정 원칙).
