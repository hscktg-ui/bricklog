# 클릭 차단 진단 (증명 우선 · 코드 수정 전)

## 실행 방법

```bash
# 서버 (3000이 멈춰 있으면 3005 등 다른 포트)
npm run build && $env:PORT="3005"; npm run start

# 자동 진단 (Playwright)
$env:BASE_URL="http://127.0.0.1:3005"
npm run test:click-blockers
```

로그인 후 단계까지 자동화하려면 `.env.local`에 (값은 커밋하지 마세요):

```
BRICLOG_TEST_EMAIL=...
BRICLOG_TEST_PASSWORD=...
```

결과 JSON: `config/click-blocker-report.json`

---

## 로그인 **전** — 자동 진단으로 **증명됨** (2026-05-23, :3005)

### 1) 클릭을 막던 요소 (인트로 표시 중)

| 항목 | 값 |
|------|-----|
| **요소** | `div.fixed.inset-0.z-[100]` (`LandingIntroOverlay` 루트) |
| **파일** | `components/landing/LandingIntroOverlay.jsx` (렌더: `components/landing/LandingPage.jsx`) |
| **z-index** | 100 |
| **position** | fixed |
| **pointer-events** | **auto** (exiting 아닐 때) |
| **opacity / display** | 1 / flex |

`elementFromPoint(화면 중앙)` 경로에 위 레이어가 최상단에 있음 → 랜딩 본문·헤더 버튼 클릭 불가.

### 2) 인트로 종료 후

- **전체 화면 blocking fixed 레이어: 0**
- 중앙 hit target: 랜딩 본문 (`opacity-0` 아닌 영역)

→ 로그인 전 “먹통”이 **인트로 오버레이** 때문이면, 인트로를 닫으면(클릭·Enter·자동 종료) 정상 클릭 가능함이 재현됨.

---

## 로컬 접속 안 될 때

[LOCAL_ACCESS.md](./LOCAL_ACCESS.md) · `npm run local:status`

---

## 로그인 **후** — 브라우저 진단 패널 (테스트 계정 불필요)

`npm run dev` 후 로그인 상태에서:

1. 화면 **왼쪽 하단 「클릭 진단」** 버튼 (development 기본 표시, production은 `?debugClick=1`)
2. **진단 실행** → 콘솔 + 패널에 자동 출력
3. **다음 클릭 캡처** → 막히는 버튼을 한 번 눌러 `elementFromPoint` 경로 확인

출력 항목: 중앙 hit, fixed/inset-0 목록, z-index≥30, pointer-events:auto, opacity:0+pe:auto, Terms/Pricing/Confirm/Loading/Sidebar DOM·React flags, 버튼 좌표별 hit.

---

## 로그인 **후** — Playwright 자동 증명 (선택, 테스트 계정 필요)

아래는 **코드상 후보**이며, 로그인 후 대시보드에서의 “실제 막는 DOM”은 브라우저 콘솔 진단으로 확인해야 합니다.

### 로그인 후에만 올라올 수 있는 full-screen / high-z 후보

| 우선순위 | 조건 | 요소 | 파일 | pointer-events | 비고 |
|---------|------|------|------|----------------|------|
| A | `needsTerms` | `TermsConsentModal` 루트 `fixed inset-0 z-[100]` | `components/auth/TermsConsentModal.jsx` | **auto** | 약관 미동의 시 **전 화면 차단** |
| B | `loadingOverlay.active` | `GenerationLoadingOverlay` `z-[220] fixed inset-0` | `components/GenerationLoadingOverlay.jsx` | 바깥 **none**, 카드 **auto** | 이론상 사이드바는 통과; **카드 영역만** 가로챔 |
| C | `welcomeOpen` | `WelcomeOverlay` `z-[88]` | `components/WelcomeOverlay.jsx` | 바깥 **none** | 비차단 설계 |
| D | `showProfileModal` | `ProfileCompletionModal` `z-[100]` | `components/auth/ProfileCompletionModal.jsx` | 바깥 **none** | 비차단 설계 |
| E | `pricingOpen` / Confirm | `PricingModal` / `ConfirmModal` `z-[60~70]` | `components/billing/*`, `ConfirmModal.jsx` | backdrop **auto** | 열려 있으면 전 화면 차단 |
| F | `mobileOpen` (모바일) | Sidebar backdrop `fixed inset-0 z-40` | `components/Sidebar.jsx` | **auto** | lg 미만 |
| G | 어시스턴트 열림 | `BriclogAssistant` backdrop `z-[88]` | `components/assistant/BriclogAssistant.jsx` | **none** | 비차단 |

로그인 후에도 남으면 **안 되는** 것 (언마운트됨): `LandingPage`, `LandingIntroOverlay`, `app/page.js` 로그인 모달.

### 로그인 후 대시보드 — 브라우저 콘솔 진단 (필수)

로그인 → 클릭 안 될 때 **F12 → Console**에 붙여넣기:

```javascript
document.addEventListener('click', function(e) {
  console.log('CLICK TARGET:', e.target);
  console.log('PATH:', e.composedPath().slice(0, 15));
}, true);

console.log('CENTER ELEMENT:', document.elementFromPoint(innerWidth/2, innerHeight/2));

function describe(el) {
  if (!el) return null;
  const s = getComputedStyle(el);
  return {
    tag: el.tagName,
    id: el.id,
    className: String(el.className).slice(0, 200),
    zIndex: s.zIndex,
    position: s.position,
    pointerEvents: s.pointerEvents,
    opacity: s.opacity,
    display: s.display,
  };
}

[['center', innerWidth/2, innerHeight/2], ['sidebar', 120, 300], ['main', innerWidth*0.55, 300]].forEach(([name,x,y]) => {
  console.log(name, describe(document.elementFromPoint(x,y)));
});

[...document.querySelectorAll('*')].filter(el => {
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return (s.position === 'fixed' || s.position === 'absolute') &&
    r.width >= innerWidth*0.85 && r.height >= innerHeight*0.85 &&
    s.pointerEvents !== 'none' && s.opacity !== '0' && s.display !== 'none';
}).map(el => describe(el)).forEach((d,i) => console.log('BLOCKER', i, d));
```

**수정은** 위 로그에서 `BLOCKER` / `CLICK TARGET`으로 **한 요소가 특정된 뒤**에만 진행합니다.

---

## 환경 이슈 (클릭과 별개)

- `localhost:3000` Node(PID 18840) **응답 없음** (60s 타임아웃) — CLOSE_WAIT 다수. dev 서버 재시작 필요.
- 진단은 `http://127.0.0.1:3005` (`npm run start`) 기준으로 수행함.

---

## 수정 조건 체크리스트 (미충족 시 수정 금지)

- [x] 로그인 전: `LandingIntroOverlay` 가 클릭 막음 **증명**
- [ ] 로그인 후: 대시보드에서 막는 **단일 DOM** 콘솔/Playwright로 **증명**
- [ ] 원인 파일·로그인 후에만 남는 이유 문서화
- [ ] 그 다음 최소 수정 + 버튼 클릭 재테스트
