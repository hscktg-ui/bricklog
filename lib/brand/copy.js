/**
 * BRICLOG 고객-facing 카피 — 단일 소스
 * 짧고, 한국어로 자연스럽게. 「쌓다」만 은유. AI·OS·운영도구 표현 금지.
 */

export const BRAND_VOICE = {
  metaphor:
    "오늘의 주제 하나로 이야기 · 플레이스 · 인스타 문장이 차곡 쌓입니다.",
  promise:
    "조사·맥락을 맞춘 뒤 확인하고 복사해 각 앱에 붙이기만 하면 됩니다.",
  freeHook:
    "샘플로 먼저 맞춰 보시고, 채널이 늘면 플러스 · 스튜디오를 고르시면 됩니다.",
};

/** 최상단·로고 옆 — 한 줄 */
export const BRICLOG_SLOGAN = "차곡차곡, 브랜드 글을 쌓아요";
export const BRICLOG_SLOGAN_SHORT = BRICLOG_SLOGAN;

export const BRAND_TAGLINE = BRICLOG_SLOGAN;

/** 푸터 보조 — 짧게 */
export const BRAND_PHILOSOPHY =
  "쓰신 말투와 글이 작업실에 남아, 다음에도 같은 브랜드 목소리로 이어집니다.";

/** 검색·OG·구조화 데이터 */
export const BRAND_META_TITLE =
  "브릭로그 | 브랜드 콘텐츠 운영 · 이야기·플레이스·인스타";
export const BRAND_META_TITLE_SHORT = "BRICLOG";
export const BRAND_META_TITLE_KO = "브릭로그";
export const BRAND_META_DESCRIPTION =
  "브랜드·지역·주제로 이번 주·이번 달 운영 계획을 세우고, 조사·맥락 점검 후 이야기·플레이스·인스타 초안을 받습니다. 확인하고 복사해 각 채널에 올리세요. briclog.ai";
export const BRAND_META_DESCRIPTION_EN =
  "BRICLOG helps brand operators plan weekly content and draft story, Smart Place, and Instagram copy from one topic—with research checks before you publish.";
export const BRAND_META_KEYWORDS =
  "브릭로그, BRICLOG, briclog.ai, 브랜드 콘텐츠, 블로그 운영, 네이버 블로그, 스마트플레이스, 인스타그램, 지역 브랜드, 운영 계획, 발행 준비도, 콘텐츠 캘린더";

/** 검색·랜딩 SSR에 노출 — 최신 업데이트 한 줄 */
export const BRAND_LATEST_UPDATE = {
  label: "2026년 6월 업데이트",
  headline: "조사 우선 · 운영 계획 · 세 채널 초안",
  bullets: [
    "이번 주·이번 달 운영 계획 한눈에",
    "조사·맥락 점검 후 이야기 · 플레이스 · 인스타",
    "발행 준비도 확인 후 복사",
    "브랜드 말투·지역 기억",
    "채널별 톤 분리",
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
export const LANDING_CTA_HEADLINE = "이번 주 운영, 여기서 차곡 쌓기";
export const LANDING_CTA_SUB = BRAND_VOICE.freeHook;
export const LANDING_CTA_PHILOSOPHY = "";
export const LANDING_CTA_FOOTNOTE =
  "결제 없이 시작 · 요금은 작업실 플랜에서 확인";

/** 랜딩 전환 CTA — nav · hero · sticky · final 공통 */
export const LANDING_PRIMARY_CTA = "샘플로 맞춰 보기";
export const LANDING_PRIMARY_SUB =
  "가입 없이 샘플 · 마음에 들면 작업실에 저장";
export const LANDING_SECONDARY_CTA = "샘플 미리보기";
export const LANDING_LOGIN_HINT = "이미 쓰는 중이에요?";
export const LANDING_LOGIN_CTA = "로그인";
export const LANDING_NAV_START_CTA = "시작하기";
export const LANDING_NAV_SIGNUP_CTA = "작업실 만들기";
export const LANDING_FOOTER_SIGNUP_CTA = "작업실 만들기";

/** 샘플 성공 후 고정 가입 유도 */
export const PUBLIC_TEST_STICKY_SIGNUP_HEADLINE =
  "이 브랜드 그대로 작업실에";
export const PUBLIC_TEST_STICKY_SIGNUP_CTA = "작업실에 저장";

/** 무료 테스트 결과 → 가입 설득 */
export const PUBLIC_TEST_SIGNUP_UNLOCKS = [
  "전체 이야기·플레이스·인스타 초안",
  "브랜드 말투·지역 기억",
  "발행 준비도·맥락 점검",
  "지난 글 기록과 다시 쓰기",
];

export const LANDING_STATS_MODE_LABEL = {
  live: "실측 집계",
  seed: "베타 집계",
  fallback: "베타 집계",
};

export const LANDING_HERO_DEFAULT = {
  headline: "브랜드 이야기,",
  headlineBreak: "사람이 쓴 것처럼.",
  sub: "조사·말투·채널 형식까지 맞춰 드립니다. 네이버 블로그에 그대로 붙여넣을 수 있는 글을 받으세요.",
  ideaFallback: "신메뉴 · 기념일 · 시즌 — 한 줄이면 됩니다.",
};

export const PUBLIC_TEST_HERO = {
  headline: "브랜드명 · 지역 · 주제",
  headlineBreak: "한 줄이면 샘플이 나옵니다",
  sub: "맥락 점검과 발행 준비도까지 포함한 미리보기입니다. 직접 입력은 보통 1~2분 걸립니다.",
  cta: LANDING_PRIMARY_CTA,
  signupSave: "이 브랜드를 기억하려면 작업실을 만들어 주세요.",
  signupRecord: "방금 만든 글을 브랜드 기록으로 저장할까요?",
  signupPhilosophy:
    "작업실에 저장하면 브랜드 말투·지난 글이 이어집니다.",
};

export const LANDING_PRICING_INTRO = "쓰는 만큼만 골라요";
export const LANDING_PRICING_SUB =
  "이야기부터 맞춰 보세요. 채널이 늘면 플러스 · 스튜디오로 이어가면 됩니다.";

export const LANDING_HERO_MOBILE_TRUST = [
  "발행 전 점검",
  "세 채널 초안",
  "브랜드 기억",
  "운영 계획",
];

export const LANDING_PAYMENT_BETA_NOTE =
  "요금·유료 전환은 작업실 플랜에서 안내합니다";

export const LANDING_STATS_TITLE = "브릭로그에 쌓인 글";
export const LANDING_STATS_SUB = "";
