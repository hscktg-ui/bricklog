/**
 * BRICLOG 고객-facing 카피 — 단일 소스
 * 짧고, 한국어로 자연스럽게. 「쌓다」만 은유. AI·OS·운영도구 표현 금지.
 */

export const BRAND_VOICE = {
  metaphor:
    "오늘의 주제로 이야기 · 플레이스 · 인스타가 쌓입니다. 채널은 달라도 브랜드 목소리는 이어집니다.",
  promise:
    "조사하고 확인한 뒤, 복사해 각 앱에 붙이면 됩니다.",
  freeHook:
    "지금은 전 기능 무료입니다. AI 트렌드를 찾고, 샘플로 운영 흐름을 먼저 맞춰 본 뒤 작업실에서 이어가세요.",
};

/** 공개 제품 두 줄. 한 주제로 네 채널이 아니다. */
export const BRICLOG_PUBLIC_LINES = {
  operating: "이야기 · 플레이스 · 인스타",
  detail: "",
  chips: ["이야기", "플레이스", "인스타"],
  oneLiner: "운영 글 세 채널을 한 흐름으로 맞춥니다.",
};

/** 최상단·로고 옆 — 한 줄 */
export const BRICLOG_SLOGAN = "AI 시대, 중요한 것은 의도다";
export const BRICLOG_SLOGAN_SHORT = BRICLOG_SLOGAN;

export const BRAND_TAGLINE = BRICLOG_SLOGAN;

/** 푸터 보조 — 짧게 */
export const BRAND_PHILOSOPHY =
  "Discover. Understand. Apply. Create.";

/** 검색·OG·구조화 데이터 */
export const BRAND_META_TITLE =
  "브릭로그 | AI 트렌드 검색 · 브랜드 콘텐츠 운영";
export const BRAND_META_TITLE_SHORT = "BRICLOG";
export const BRAND_META_TITLE_KO = "브릭로그";
export const BRAND_META_DESCRIPTION =
  "AI 트렌드를 찾고, 왜 중요한지 이해한 뒤, 브랜드·지역·주제로 블로그·스마트플레이스·인스타 초안을 만듭니다. 자동발행이 아니라 확인 후 복사해 게시하는 BRICLOG 콘텐츠 작업실입니다.";
export const BRAND_META_DESCRIPTION_EN =
  "BRICLOG helps teams discover AI trends, understand why they matter, and turn them into on-brand blog, Smart Place, and Instagram drafts.";
export const BRAND_META_KEYWORDS =
  "브릭로그, BRICLOG, briclog.ai, AI 트렌드, AI 도구, AI 모델, AI 검색, AI 뉴스, 브랜드 콘텐츠, 블로그 운영, 네이버 블로그, 스마트플레이스, 인스타그램, 지역 브랜드, 운영 계획, 발행 준비도, 콘텐츠 캘린더";

/** 검색·랜딩 SSR에 노출 — 최신 업데이트 한 줄 */
export const BRAND_LATEST_UPDATE = {
  label: "2026년 9월 업데이트",
  headline: "AI Trend Search · 전 기능 무료 · 블로그 · 플레이스 · 인스타 연결",
  bullets: [
    "AI 트렌드 검색과 맥락 이해를 홈에서 먼저 확인",
    "스튜디오 전 기능 무료 개방",
    "맛보기 후 내 브랜드 그대로 작업실 이어가기",
    "한 주제로 블로그 · 플레이스 · 인스타 연결",
    "채널 간 문맥은 잇고 채널 말투는 분리",
    "발행 준비도 확인 후 복사",
  ],
};

export const SITE_FOOTER_TAGLINE = BRICLOG_SLOGAN;
export const SITE_FOOTER_DESCRIPTION = BRAND_PHILOSOPHY;

/** 요금제 표시명 (id: free | brand | studio) */
export const PLAN_DISPLAY_NAMES = {
  free: "무료",
  brand: "플러스",
  studio: "스튜디오",
};

/** 랜딩 하단 CTA */
export const LANDING_CTA_HEADLINE = "세 채널 운영, 여기서";
export const LANDING_CTA_SUB = BRAND_VOICE.freeHook;
export const LANDING_CTA_PHILOSOPHY = "";
export const LANDING_CTA_FOOTNOTE =
  "지금은 전 기능 무료 · 결제 없이 작업실에서 이어가기";

/** 랜딩 전환 CTA — nav · hero · sticky · final 공통 */
export const LANDING_PRIMARY_CTA = "샘플로 운영 맞춰 보기";
export const LANDING_PRIMARY_SUB =
  "가입 없이 샘플 · 마음에 들면 무료로 이어가기";
export const LANDING_SECONDARY_CTA = "세 채널 샘플 보기";
export const LANDING_LOGIN_HINT = "이미 쓰는 중이에요?";
export const LANDING_LOGIN_CTA = "로그인";
export const LANDING_NAV_START_CTA = "시작하기";
export const LANDING_NAV_SIGNUP_CTA = "작업실 만들기";
export const LANDING_FOOTER_SIGNUP_CTA = "작업실 만들기";

/** 샘플 성공 후 고정 가입 유도 */
export const PUBLIC_TEST_STICKY_SIGNUP_HEADLINE =
  "무료 · 이번 달 운영 이어가기";
export const PUBLIC_TEST_STICKY_SIGNUP_CTA = "무료로 이 브랜드 작업실 열기";
export const PUBLIC_TEST_RESULT_SIGNUP_CTA =
  "무료로 이번 달 운영 이어가기";

/** 무료 테스트 결과 → 가입 설득 */
export const PUBLIC_TEST_SIGNUP_UNLOCKS = [
  "이번 달 운영 계획 초안",
  "전체 이야기·플레이스·인스타 초안",
  "브랜드 말투·지역 기억",
  "발행 준비도·맥락 점검",
];

export const LANDING_STATS_MODE_LABEL = {
  live: "실측 집계",
  seed: "베타 집계",
  fallback: "베타 집계",
};

export const LANDING_HERO_DEFAULT = {
  headline: "운영 글은 한 주제.",
  headlineBreak: "세 채널은 한 흐름.",
  sub: "이야기·플레이스·인스타를 같은 맥락으로 이어 쓰되, 각 채널에 맞는 톤으로 분리해 보여줍니다.",
  ideaFallback: "신메뉴 · 기념일 · 시즌 — 한 줄이면 됩니다.",
};

export const PUBLIC_TEST_HERO = {
  headline: "브랜드명 · 지역 · 주제",
  headlineBreak: "한 줄이면 샘플이 나옵니다",
  sub: "맥락 점검과 발행 준비도까지 포함한 미리보기입니다. 마음에 들면 이번 달 운영으로 이어가세요.",
  cta: LANDING_PRIMARY_CTA,
  signupSave: "지금 무료입니다. 이 브랜드 그대로 이번 달 운영을 작업실에서 이어가세요.",
  signupRecord: "방금 만든 샘플을 브랜드 운영 기록으로 이을까요?",
  signupPhilosophy:
    "작업실에 이으면 브랜드 말투·지난 글·운영 계획이 이어집니다. 지금은 전 기능 무료입니다.",
};

export const LANDING_PRICING_INTRO = "지금은 전 기능 무료";
export const LANDING_PRICING_SUB =
  "이야기 · 플레이스 · 인스타를 제한 없이 맞춰 보세요. 유료 플랜은 인사이트를 모은 뒤 순차 도입합니다.";

export const LANDING_HERO_MOBILE_TRUST = [
  "발행 전 점검",
  "운영 글 세 채널",
  "채널 톤 분리",
  "브랜드 기억",
];

export const LANDING_PAYMENT_BETA_NOTE =
  "지금은 스튜디오 전 기능을 무료로 이용할 수 있습니다. 유료 결제·PG 연동은 사용 인사이트를 모은 뒤 도입합니다.";

export const LANDING_STATS_TITLE = "브릭로그에 쌓인 글";
export const LANDING_STATS_SUB = "";
