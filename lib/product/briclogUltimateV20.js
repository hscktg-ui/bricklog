/**
 * BRICLOG ULTIMATE CONTENT ENGINE V20 — 제품·파이프라인·품질 SSOT
 * Mission · AI 오케스트레이션 · Humanity · Editorial · Human Content Addon
 */

export const BRICLOG_ULTIMATE_VERSION = "v20";

export const PRODUCT_TAGLINE = {
  notProduct: "AI 글쓰기 도구",
  product: "브랜드를 축적하는 AI 콘텐츠 팀",
};

export const PRODUCT_POSITION = {
  notProduct: PRODUCT_TAGLINE.notProduct,
  product: PRODUCT_TAGLINE.product,
  capabilities: ["조사", "검증", "편집", "검수", "브랜드 축적"],
};

export const BRICLOG_MISSION_STATEMENT = `브릭로그는 AI 글쓰기 도구가 아니다.

브릭로그는 브랜드를 축적하는 AI 콘텐츠 팀이다.

최소 입력값으로 사람이 직접 작성한 것 같은 고품질 콘텐츠를 빠르게 생산한다.`;

export const BRICLOG_GOAL_BRIEF = `목표는 SEO가 아니다. 목표는 브랜드 축적이다.
검색 노출은 결과다. 브랜드 일관성이 원인이다.`;

export const USER_INPUT_FIELDS = [
  "브랜드명",
  "브랜드유형",
  "업종",
  "지역",
  "주제",
  "글 분량",
  "관점",
  "이모지 사용여부",
];

/** V20 핵심 관점 4종 (+ UI는 auto·확장 관점 병행) */
export const CONTENT_PERSPECTIVE_V20 = [
  {
    value: "brand",
    label: "브랜드 관점",
    hint: "브랜드 철학·가치·스토리 중심",
  },
  {
    value: "customer",
    label: "고객 관점",
    hint: "고객 고민·비교 기준·구매 판단 중심",
  },
  {
    value: "informational",
    label: "정보성 관점",
    hint: "객관 정보·실용·비교 정보 중심",
  },
  {
    value: "editor",
    label: "에디터 관점",
    hint: "전문 칼럼·브랜드 매거진·전문가 분석 중심",
  },
];

export const AI_ORCHESTRATION = [
  {
    id: "research",
    name: "Research AI",
    provider: "Gemini",
    writes: false,
    role: "브랜드·제품·서비스·업종·경쟁·트렌드·공식 홈페이지·언론·FAQ 조사",
  },
  {
    id: "local",
    name: "Local AI",
    provider: "Naver",
    writes: false,
    role: "지역 검색 의도·상권·지역 키워드·스마트플레이스·지역 고객 질문·연관 검색어",
  },
  {
    id: "memory",
    name: "Memory AI",
    provider: "BRICLOG MEMORY",
    writes: false,
    role: "브랜드 철학·말투·승인 콘텐츠·수정 이력·고객 반응",
  },
  {
    id: "writer",
    name: "Writer AI",
    provider: "GPT",
    writes: true,
    role: "조사 결과·브랜드 메모리·사용자 입력만으로 글 작성 — GPT는 조사하지 않음",
  },
  {
    id: "reviewer",
    name: "Reviewer AI",
    provider: "BRICLOG",
    writes: false,
    role: "중복·허구·업종·지역·브랜드·글자수·휴머니티 검수 — 실패 시 재작성",
  },
];

export const AI_ROLE_CONTRACT = {
  gemini: "조사한다 (Research — 글 작성 금지)",
  naver: "지역을 보완한다 (Local — 글 작성 금지)",
  memory: "브랜드를 유지한다 (Memory — 글 작성 금지)",
  gpt: "글을 쓴다 (Writer — 조사 금지)",
  reviewer: "검수한다 (Reviewer — 실패 시 재작성)",
};

export const HUMANITY_ENGINE_BRIEF = `【HUMANITY ENGINE V20】
콘텐츠를 복사하지 않고 작성 방식을 학습한다.
학습 대상: 승인·수정·고성과·브랜드 콘텐츠.
저장: 자주 쓰는 표현·문장 길이·브랜드 고유 단어·관점·구조·고객 질문·해결 방식.
원문 저장 금지 — 패턴·관점·문체만 저장.
사용할수록 브랜드 전담 에디터처럼 행동한다.
【Humanity & Common Sense】 정보 나열 금지·억지 지역/브랜드/주제 스택 금지·업종·지역 상식·에디터 서사(왜→본문→인상→대상→기준).
SEO보다 인간 점수 우선 — 「사람이 직접 쓴 것 같은가」 최종 검수.`;

export const BLOG_LENGTH_TIERS = {
  short: { min: 1800, max: 2200, target: 2000, label: "짧은글" },
  medium: { min: 2800, max: 3200, target: 3000, label: "중간글" },
  long: { min: 3800, max: 5000, target: 4200, label: "긴글" },
};

/** 구조 엔진 — 섹션 간 유사도 */
export const STRUCTURE_DUPLICATE_POLICY = {
  similarityPercent: 80,
  forbidExactSentence: true,
  forbidSameMeaning: true,
  forbidSubtitleOnlyVariation: true,
};

/** Human Content Addon — 절대 규칙 (게이트·검수 기본값) */
export const HUMAN_DUPLICATE_POLICY = {
  similarityPercent: 70,
  forbidExactSentence: true,
  forbidSameMeaning: true,
  sameParagraphStructureMax: 3,
};

/** @deprecated alias — 게이트·엔진은 HUMAN_DUPLICATE_POLICY 사용 */
export const DUPLICATE_POLICY = HUMAN_DUPLICATE_POLICY;

export const EDITORIAL_ENGINE_BRIEF = `【EDITORIAL ENGINE V20 · V95】
블로그 글이 아니라 브랜드 매거진·칼럼·현장 후기·에디터 노트.
AI처럼 쓰지 않음 — 맥락 먼저, 설명 나중. 도입 「안녕하세요」「오늘은」「소개해드리겠습니다」 금지.
기(왜 필요한가) → 승(정보·사례) → 전(판단 기준) → 결. 브랜드·지역 억지 반복 금지.
광고·과장·허구 금지. 「누가 직접 다녀와서 쓴 줄 알았다」가 목표.`;

export const INSTAGRAM_ENGINE_BRIEF = `【INSTAGRAM ENGINE V20】
블로그 요약 금지 — 인스타 전용. 짧고 감성적·공유 가능. 첫 문장·공감·관찰·분위기·감정 중심.
이모지 ON: 적절히 자동. OFF: 이모지 금지.`;

export const SMARTPLACE_ENGINE_BRIEF = `【SMARTPLACE ENGINE V20】
광고가 아닌 방문 전 정보·이용 흐름·위치·서비스 특징 중심.
보조키워드 자동 생성·플레이스 무관 키워드 금지.`;

export const FINAL_RULES_BRIEF = `【FINAL RULE V20】
GPT 냄새·AI 냄새·템플릿 냄새·반복문 냄새 발견 시 재작성.
출력은 사람이 직접 작성한 것처럼 보여야 한다.`;

export const HUMAN_CONTENT_ADDON_BRIEF = `【BRICLOG HUMAN CONTENT ENGINE ADDON V20】
글자수 채우기 위한 문장 반복은 실패다.
같은 정보·의미·문장·표현 반복 금지.
글자수가 아니라 정보 개수를 계산한다. 정보 부족 시 문장 반복 금지 — Gemini·Naver·공식·FAQ 추가 조사 후 재작성.
조사 부족 상태에서 글 작성 금지.
문장 유사도 70% 초과·동일 단어 과도 반복·동일 문단 구조 3회 이상 → 재생성.
목표: 「글자수가 많다」가 아니라 「읽을 정보가 많다」. 글자수를 늘리지 말고 정보량을 늘려라.`;

export const HUMAN_OVER_SEO_PRIORITY =
  "SEO 점수보다 인간 점수(휴머니티·상식·서사)를 우선한다.";

export const QUALITY_PRIORITIES = [
  "브랜드 축적·일관성 (Brand First)",
  "독자가 실제 검색·구매하는 이유",
  "사람이 직접 작성한 것처럼 보이는가 (Humanity & Common Sense)",
  "정보량·정보 단위 충분성",
  "전문 에디터·브랜드 매거진 톤",
  "SEO (결과이지 목표가 아님)",
];

export const FORBIDDEN_FAST_PATH = "사용자 입력 → 바로 글 생성";

export const CONTENT_PIPELINE_ORDER = [
  "topic_decompose",
  "information_research",
  "information_expand",
  "editor_write",
  "review",
  "output",
];

export const CONTENT_PIPELINE_LABELS = {
  topic_decompose: "주제 분해",
  information_research: "정보 조사",
  information_expand: "정보 확장",
  editor_write: "에디터 작성",
  review: "검수",
  output: "출력",
};

export const INFORMATION_UNIT_RANGE = { min: 20, max: 50 };

export const CONTENT_QUALITY_ENGINE_BRIEF = `【CONTENT QUALITY ENGINE】
정보 부족 시 작성 금지 — 고유 정보 단위 ${INFORMATION_UNIT_RANGE.min}개 이상.
부족 시 Gemini·Naver·공식·FAQ·리뷰 추가 조사. 업종·지역·브랜드·주제 상식 위반 출력 금지.
SEO 문장·억지 반복 금지. 글자수가 아니라 정보량·읽는 재미.
최종: 「사람 에디터가 작성한 것 같은가」 — NO 재작성, YES 출력.`;

export const EDITOR_COLUMN_STRUCTURE = {
  gi: "도입 — 왜 이 이야기가 필요한가",
  seung: "전개 — 정보·사례·비교",
  jeon: "전환 — 선택 기준·판단 기준",
  gyeol: "결론 — 브랜드 메시지",
};

export const REVIEWER_CHECKS = [
  "정보 단위·조사 충분성",
  "중복 검사",
  "허구 검사",
  "업종·주제 적합성",
  "지역 적합성",
  "브랜드 적합성",
  "글자수 검사",
  "휴머니티·콘텐츠 품질 검사",
];

export const MASTER_FINAL_REVIEW = [
  { id: "human_voice", label: "사람이 직접 작성한 것처럼 보이는가" },
  { id: "brand_asset", label: "브랜드 자산으로 축적 가능한가" },
  { id: "information_depth", label: "정보량이 충분한가 (반복 패딩 없음)" },
  { id: "no_duplication", label: "동일 정보·유사 문장(70%+) 반복이 없는가" },
  { id: "no_ai_smell", label: "GPT·AI·템플릿·반복문 냄새가 없는가" },
  { id: "publish_ready", label: "바로 발행 가능한 수준인가" },
];

export const INTERNAL_OUTPUT_BANNED_SNIPPETS = [
  "이 글은",
  "확인된 정보만",
  "방문 전 확인하면",
  "브랜드 메모리",
  "콘텐츠 일관성",
  "SEO는 목표",
  "검수 기준",
  "AI 글쓰기",
  "save",
  "informative",
  "emotional",
];

export const TITLE_ENGINE_RULES = {
  mustInclude: ["지역", "브랜드", "주제"],
  forbid: "검색어 나열형",
  prefer: "상황·질문·관심·문제가 드러나는 클릭형 제목",
};

export const CHANNEL_ENGINE_RULES = {
  blog: "전문 브랜드 매거진 — 블로그 요약·SEO 나열 금지",
  instagram: INSTAGRAM_ENGINE_BRIEF.replace(/\n/g, " "),
  place: SMARTPLACE_ENGINE_BRIEF.replace(/\n/g, " "),
  mixForbidden: true,
};

export const EMOJI_CHANNEL_DEFAULTS = {
  blog: "none",
  place: "light",
  instagram: "medium",
  purpose: "가독성만 — 장식·스팸 금지",
};

export const MASTER_QUALITY_POSITIONING_BRIEF = `【BRICLOG ULTIMATE CONTENT ENGINE V20】
${BRICLOG_MISSION_STATEMENT.replace(/\n/g, " ")}
${BRICLOG_GOAL_BRIEF.replace(/\n/g, " ")}
Research(Gemini)·Local(Naver)·Memory·Writer(GPT)·Reviewer — 각 AI는 자신의 역할만. 조사 부족 시 작성 금지.`;

export const MASTER_QUALITY_EDITOR_BRIEF = `【V20 · EDITORIAL】
${EDITORIAL_ENGINE_BRIEF.replace(/\n/g, " ")}
정보량 없이 글자수 맞추기 금지. tier: 짧은 1800–2200 / 중간 2800–3200 / 긴 3800–5000. 미달·초과 재작성.
섹션마다 다른 정보. 유사도 80%+ 재작성(구조), 70%+ 재생성(휴먼).`;

export const MASTER_QUALITY_GUARD_BRIEF = `【V20 · REVIEWER】
${REVIEWER_CHECKS.join(" · ")}. 실패 시 재작성.
${HUMAN_CONTENT_ADDON_BRIEF.split("\n").slice(0, 4).join(" ")}`;

export function buildUltimateV20CoreBrief() {
  return [
    MASTER_QUALITY_POSITIONING_BRIEF,
    BRICLOG_GOAL_BRIEF,
    CONTENT_QUALITY_ENGINE_BRIEF,
    HUMANITY_ENGINE_BRIEF,
    EDITORIAL_ENGINE_BRIEF,
    FINAL_RULES_BRIEF,
  ].join("\n\n");
}

export function buildUltimateV20HumanAddonBrief() {
  return HUMAN_CONTENT_ADDON_BRIEF;
}

/**
 * @param {"blog"|"place"|"instagram"|"smartplace"|"insta"} [channel]
 */
export function buildUltimateV20PromptBlock(channel = "blog") {
  const ch =
    channel === "smartplace"
      ? "place"
      : channel === "insta"
        ? "instagram"
        : channel;
  const channelRule = CHANNEL_ENGINE_RULES[ch] || CHANNEL_ENGINE_RULES.blog;
  return [
    buildUltimateV20CoreBrief(),
    buildUltimateV20HumanAddonBrief(),
    `채널(${ch}): ${channelRule}`,
    MASTER_QUALITY_GUARD_BRIEF,
  ].join("\n\n");
}

/** @deprecated — masterQualityDirective 호환 */
export function buildMasterQualityPromptBlock(channel = "blog") {
  return buildUltimateV20PromptBlock(channel);
}

export function requiresMasterQualityPipeline(input = {}) {
  if (input.masterQualityBypass === true) return false;
  return (
    input.v2PipelineEnforced === true ||
    input.v3EngineEnforced === true ||
    input.betaTestGuardEnforced === true
  );
}

export function buildAiRoleSummaryKo() {
  return Object.entries(AI_ROLE_CONTRACT)
    .map(([key, role]) => {
      const label =
        key === "gpt"
          ? "GPT"
          : key === "gemini"
            ? "Gemini"
            : key === "naver"
              ? "Naver"
              : key === "reviewer"
                ? "Reviewer"
                : "Memory";
      return `${label}: ${role}`;
    })
    .join(" · ");
}
