/**
 * 8명의 실사용자 페르소나 — E2E·스모크 테스트 공유 정의
 * @see tests/eight-user-journeys.spec.ts
 * @see scripts/eight-user-smoke.mjs
 */

export const EIGHT_USER_PERSONAS = [
  {
    id: "p1_first_visit",
    label: "첫 방문자 — 랜딩·인트로·가입 CTA",
    journey: [
      "랜딩 진입",
      "BRICLOG 소개 오버레이 해제",
      "로그인/시작 CTA 클릭",
      "인증 폼 노출",
    ],
    paths: ["LandingPage", "LandingIntroOverlay", "app/page.js authMode"],
    painPoints: ["intro z-100 클릭 차단", "pointer-events 오버레이"],
    needsAuth: false,
  },
  {
    id: "p2_returning_guest",
    label: "재방문 게스트 — 인트로 스킵·랜딩 스크롤",
    journey: [
      "landingSession 인트로 완료 플래그",
      "인트로 없이 히어로·샘플 섹션",
      "샘플 앵커 스크롤",
    ],
    paths: ["lib/landing/landingSession.js", "LandingPage"],
    painPoints: ["landing intro 중복", "헤더 pointer-events-none"],
    needsAuth: false,
    prep: "markLandingIntroDone",
  },
  {
    id: "p3_mobile_only",
    label: "모바일 전용 — 하단 네비·터치 타깃",
    journey: [
      "390×844 뷰포트",
      "인트로 해제",
      "CTA·카드 터치",
      "클릭 차단 진단",
    ],
    paths: ["MobileBottomNav", "useViewport", "globals.css ::after slab"],
    painPoints: ["커서 깜빡임", "오버레이 전체 화면"],
    needsAuth: false,
    viewport: { width: 390, height: 844 },
  },
  {
    id: "p4_signup_fast",
    label: "빠른 온보딩 가입 — FAST_ONBOARDING",
    journey: [
      "회원가입 폼",
      "채널 웰컴 스킵(플래그)",
      "대시보드 블로그 기본 메뉴",
    ],
    paths: ["lib/config/productFlags.js", "Dashboard fast onboarding"],
    painPoints: ["채널 웰컴·웰컴 오버레이 겹침", "auth 4s timeout"],
    needsAuth: true,
  },
  {
    id: "p5_email_unverified",
    label: "이메일 미인증 — 생성 차단",
    journey: [
      "로그인(미인증 계정)",
      "이야기 쓰기 시도",
      "EmailVerifyBanner·토스트",
    ],
    paths: [
      "ContentContext generateBlog",
      "lib/auth/emailVerification.js",
      "EmailVerifyBanner",
    ],
    painPoints: ["생성 버튼 지연", "프로필 로딩"],
    needsAuth: true,
    note: "미인증 전용 테스트 계정 필요",
  },
  {
    id: "p6_new_brand",
    label: "신규 브랜드 — 폼 입력·병렬 ensure",
    journey: [
      "브랜드명 순차 입력",
      "ensureBrandFromForm 병렬",
      "localStorage draft",
    ],
    paths: [
      "BrandWorkspaceContext",
      "ContentContext generateBlog",
      "lib/formDraft.js",
    ],
    painPoints: ["입력 re-render", "draft 메인 스레드"],
    needsAuth: true,
  },
  {
    id: "p7_channel_switch",
    label: "채널 전환 — 블로그↔인스타↔플레이스",
    journey: [
      "사이드바 메뉴 전환",
      "생성 중 오버레이 시 사이드바",
      "startTransition 네비",
    ],
    paths: ["Dashboard handleMenuNavigate", "GenerationLoadingOverlay"],
    painPoints: ["메뉴 프리즈", "loadingOverlayBlocking"],
    needsAuth: true,
  },
  {
    id: "p8_history_research",
    label: "기록·리서치 — 히스토리·자료조사 모드",
    journey: [
      "히스토리 메뉴",
      "리스트·상세 로드",
      "researchEnabled 폼",
    ],
    paths: ["Dashboard history", "ResearchModePanel", "fetchGenerations"],
    painPoints: ["history useEffect 연쇄", "프로필 8s timeout"],
    needsAuth: true,
  },
];
