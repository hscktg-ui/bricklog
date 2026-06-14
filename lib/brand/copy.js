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

/** 검색·OG·구조화 데이터 — 한·영 브랜드명 + 최신 컨셉 */
export const BRAND_META_TITLE =
  "브릭로그 BRICLOG — 조사·이야기·플레이스·인스타 한 번에";
export const BRAND_META_TITLE_SHORT = "BRICLOG";
export const BRAND_META_TITLE_KO = "브릭로그";
export const BRAND_META_DESCRIPTION =
  "브릭로그(BRICLOG, briclog.ai)는 매장·브랜드 운영자를 위한 콘텐츠 도구입니다. 조사·맥락 점검 후 네이버 이야기, 스마트플레이스 공지, 인스타 캡션 초안을 한 주제로 받고, 발행 준비도까지 확인한 뒤 복사해 올리세요. 무료 발행 샘플·AI 도움말 제공.";
export const BRAND_META_DESCRIPTION_EN =
  "BRICLOG (Briclog, briclog.ai) helps local brands draft Naver blog stories, Smart Place notices, and Instagram captions from one topic—with research, context checks, and publish readiness scores.";
export const BRAND_META_KEYWORDS =
  "브릭로그, BRICLOG, Briclog, briclog, briclog.ai, 브릭로그 AI, 브랜드 글쓰기, AI 글쓰기, 네이버 블로그, 네이버 플레이스, 스마트플레이스, 인스타그램, SNS 마케팅, 콘텐츠 작성, 매장 홍보, 발행 준비도, 무료 샘플, brand writing, AI content";

/** 검색·랜딩 SSR에 노출 — 최신 업데이트 한 줄 */
export const BRAND_LATEST_UPDATE = {
  label: "2026년 6월 업데이트",
  headline: "조사 우선 · 세 채널 샘플 · AI 도움말",
  bullets: [
    "무료 테스트에서 이야기·플레이스·인스타 미리보기",
    "발행 준비도·맥락 점수로 복사 전 확인",
    "오른쪽 아래 ? AI 도움말 — 요금·채널·조사 FAQ",
    "플레이스·인스타 전문가 검수로 채널별 톤 분리",
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
export const LANDING_PRIMARY_CTA = "발행 샘플 무료로 보기";
export const LANDING_SECONDARY_CTA = "샘플 미리보기";

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
  headline: "블로그,",
  headlineBreak: "아직도 직접 쓰시나요?",
  sub: "브랜드명 · 지역 · 주제만 넣으면 맥락 점검과 발행 준비도까지 포함한 샘플을 바로 봅니다. 가상 예시는 즉시, 직접 입력은 보통 30~60초 걸립니다.",
  cta: "발행 샘플 무료로 보기",
  signupSave: "이 브랜드를 기억하게 하려면 브랜드 작업실을 만들어주세요.",
  signupRecord: "방금 만든 콘텐츠를 브랜드 기록으로 저장하시겠습니까?",
  signupPhilosophy:
    "브릭로그는 한 번의 글보다 쌓이는 기록에 강합니다. 베타(~6/30) 동안 스튜디오 기능을 무료로 써 보세요.",
};

export const LANDING_PRICING_INTRO = "쓰는 만큼만 골라요";
export const LANDING_PRICING_SUB =
  "무료로 이야기부터 써 보세요. 채널이 늘면 플러스 · 스튜디오로 이어가면 됩니다.";

export const LANDING_HERO_MOBILE_TRUST = ["1분 샘플", "베타 무료(~6/30)"];

export const LANDING_STATS_TITLE = "브릭로그에 쌓인 글";
export const LANDING_STATS_SUB = "";
