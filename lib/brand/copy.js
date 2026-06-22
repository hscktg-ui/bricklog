/**
 * BRICLOG 고객-facing 카피 — 단일 소스
 * 짧고, 한국어로 자연스럽게. 「쌓다」만 은유. AI·OS·운영도구 표현 금지.
 */

export const BRAND_VOICE = {
  metaphor:
    "오늘의 주제 하나로 이야기 · 플레이스 · 인스타 문장이 차곡 쌓입니다.",
  promise:
    "톤을 맞춰 써 두니 확인하고 복사해 각 앱에 붙이기만 하면 됩니다.",
  freeHook:
    "먼저 무료로 써 보시고, 채널이 늘면 플러스 · 스튜디오를 고르시면 됩니다.",
};

/** 최상단·로고 옆 — 한 줄 */
export const BRICLOG_SLOGAN = "차곡차곡, 브랜드 글을 쌓아요";
export const BRICLOG_SLOGAN_SHORT = BRICLOG_SLOGAN;

export const BRAND_TAGLINE = BRICLOG_SLOGAN;

/** 푸터 보조 — 짧게, 없어도 됨 */
export const BRAND_PHILOSOPHY =
  "쓰신 말투와 글이 작업실에 남아, 다음에도 같은 브랜드 목소리로 이어집니다.";

/** 검색·OG·구조화 데이터 — 네이버·구글 검색 의도 + 브랜드명 */
export const BRAND_META_TITLE =
  "브릭로그 | 매장 네이버 블로그·스마트플레이스·인스타 글 무료";
export const BRAND_META_TITLE_SHORT = "BRICLOG";
export const BRAND_META_TITLE_KO = "브릭로그";
export const BRAND_META_DESCRIPTION =
  "매장·브랜드 운영자용. 주제 한 줄로 네이버 블로그·스마트플레이스 공지·인스타 캡션 초안을 받고, 발행 준비도 확인 후 복사해 올리세요. 가입 없이 무료 샘플 · briclog.ai";
export const BRAND_META_DESCRIPTION_EN =
  "BRICLOG helps local stores draft Naver blog posts, Smart Place notices, and Instagram captions from one topic—free preview, no signup required.";
export const BRAND_META_KEYWORDS =
  "브릭로그, BRICLOG, briclog.ai, 네이버 블로그 글쓰기, 매장 블로그, 스마트플레이스 공지, 네이버 플레이스, 인스타그램 캡션, 매장 홍보, AI 글쓰기, 카페 블로그, 미용실 SNS, 학원 홍보, 지역 브랜드, 콘텐츠 작성, 무료 샘플, 발행 준비도";

/** 검색·랜딩 SSR에 노출 — 최신 업데이트 한 줄 */
export const BRAND_LATEST_UPDATE = {
  label: "2026년 6월 업데이트",
  headline: "브릭로그 다음 · 조사 우선 · 세 채널 샘플",
  bullets: [
    "한 주제로 이야기 · 플레이스 · 인스타 초안",
    "조사·맥락 점검 후 복사해 올리기",
    "무료 샘플로 미리보기",
    "발행 준비도 확인",
    "채널별 톤 분리",
  ],
};

export const SITE_FOOTER_TAGLINE = BRICLOG_SLOGAN;
export const SITE_FOOTER_DESCRIPTION = "";

/** 요금제 표시명 (id: free | brand | studio) */
export const PLAN_DISPLAY_NAMES = {
  free: "무료",
  brand: "플러스",
  studio: "스튜디오",
};

/** 랜딩 하단 CTA */
export const LANDING_CTA_HEADLINE = "오늘 쓸 글, 여기서 차곡 쌓기";
export const LANDING_CTA_SUB = BRAND_VOICE.freeHook;
export const LANDING_CTA_PHILOSOPHY = "";
export const LANDING_CTA_FOOTNOTE =
  "베타 기간(6/30까지) 스튜디오 기능 무료 · 결제 없이 시작";

/** 랜딩 전환 CTA — nav · hero · sticky · final 공통 */
export const LANDING_PRIMARY_CTA = "무료로 시작하기";
export const LANDING_PRIMARY_SUB =
  "가입 없이 샘플 · 마음에 들면 작업실에 저장";
export const LANDING_SECONDARY_CTA = "샘플 미리보기";
export const LANDING_LOGIN_HINT = "이미 쓰는 중이에요?";
export const LANDING_LOGIN_CTA = "로그인";
export const LANDING_NAV_START_CTA = "무료 시작";
export const LANDING_NAV_SIGNUP_CTA = "작업실 만들기";
export const LANDING_FOOTER_SIGNUP_CTA = "작업실 만들기 · 무료";

/** 샘플 성공 후 고정 가입 유도 */
export const PUBLIC_TEST_STICKY_SIGNUP_HEADLINE =
  "이 브랜드 그대로 작업실에";
export const PUBLIC_TEST_STICKY_SIGNUP_CTA = "작업실에 저장 · 무료";

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
  headline: "브랜드.",
  headlineBreak: "지역. 주제.",
  sub: "조사하고, 쓰고, 복사해서 올리기. 그게 전부입니다.",
  ideaFallback: "신메뉴 · 기념일 · 시즌 — 한 줄이면 됩니다.",
};

export const PUBLIC_TEST_HERO = {
  headline: "브랜드명 · 지역 · 주제",
  headlineBreak: "한 줄이면 샘플이 나옵니다",
  sub: "맥락 점검과 발행 준비도까지 포함한 미리보기입니다. 가상 예시는 즉시, 직접 입력은 보통 1~2분 걸립니다.",
  cta: LANDING_PRIMARY_CTA,
  signupSave: "이 브랜드를 기억하려면 작업실을 만들어 주세요.",
  signupRecord: "방금 만든 글을 브랜드 기록으로 저장할까요?",
  signupPhilosophy:
    "베타(~6/30) 동안 스튜디오 기능을 무료로 써 볼 수 있습니다.",
};

export const LANDING_PRICING_INTRO = "쓰는 만큼만 골라요";
export const LANDING_PRICING_SUB =
  "무료로 이야기부터 써 보세요. 채널이 늘면 플러스 · 스튜디오로 이어가면 됩니다.";

export const LANDING_HERO_MOBILE_TRUST = [
  "발행 전 점검",
  "세 채널 초안",
  "브랜드 기억",
  "베타 무료(~6/30)",
];

export const LANDING_PAYMENT_BETA_NOTE =
  "베타 기간 무료 이용 · 결제·유료 전환은 준비 중";

export const LANDING_STATS_TITLE = "브릭로그에 쌓인 글";
export const LANDING_STATS_SUB = "";
