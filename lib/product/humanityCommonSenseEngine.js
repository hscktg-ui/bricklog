/**
 * BRICLOG Humanity & Common Sense Engine — SSOT
 * 정보 나열이 아니라 사람처럼 이야기. SEO보다 인간 점수 우선.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  isMechanicalListingTitle,
  rewriteMechanicalTitle,
  titleContext,
} from "@/lib/content/humanTitleEngine";
import { detectIndustryCrossContamination } from "@/lib/pipeline/v2/industryLock";
import { mapIndustryEmojiKey } from "@/lib/emoji/emojiEngine";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_DUPLICATE_POLICY } from "@/lib/product/briclogUltimateV20";

export const HUMANITY_COMMON_SENSE_VERSION = "v1";

export const HUMAN_OVER_SEO_RULE =
  "SEO 점수보다 인간 점수를 우선한다. 억지 키워드·지역·브랜드 나열은 실패다.";

export const HUMANITY_COMMON_SENSE_BRIEF = `브릭로그는 정보를 나열하지 않는다. 사람처럼 이야기한다.
지역·브랜드·주제를 넣기 위한 억지 문장을 만들지 않는다.
동일 문장 꼬리(했습니다/해요 등) 3회 이상 금지. 짧·중·긴 문장과 질문·회상·경험·비교·분석형을 섞는다.
업종·지역·브랜드와 맞지 않는 정보는 출력하지 않는다.
에디터 순서: 왜 찾게 되었는가 → 무엇을 보았는가 → 무엇이 인상적이었는가 → 누구에게 맞는가 → 어떤 기준으로 선택해야 하는가.
최종 검수: 「사람이 직접 쓴 것 같은가」 — YES 발행, NO 재작성.`;

export const HUMAN_EDITOR_NARRATIVE_STEPS = [
  { id: "why", label: "왜 찾게 되었는가", markers: /왜|계기|고민|찾게|알아보|궁금|필요해|문제|상황/ },
  {
    id: "saw",
    label: "무엇을 보았는가",
    markers: /직접|방문|매장|체험|누워|들러|확인|상담|받아|보니|봤|다녀/,
  },
  {
    id: "impression",
    label: "무엇이 인상적이었는가",
    markers: /인상|느낌|달랐|눈에|차분|편했|맘에|생각보다|솔직/,
  },
  {
    id: "audience",
    label: "누구에게 맞는가",
    markers: /맞는|추천|이런\s*분|상황|예산|일정|반려|가족|직장/,
  },
  {
    id: "criteria",
    label: "어떤 기준으로 선택",
    markers: /기준|비교|선택|정리|체크|견적|조건|확인하|문의/,
  },
];

/** 타 지역명 — 본문 홈 지역과 충돌 검사 */
const FOREIGN_REGION_MARKERS = [
  "부산",
  "서울",
  "강릉",
  "제주",
  "대전",
  "광주",
  "인천",
  "수원",
  "평택",
  "전주",
  "대구",
  "울산",
  "창원",
  "해운대",
  "강남",
  "홍대",
];

const NARRATIVE_VERB_RE =
  /(?:했|해요|습니다|더라|거든|라서|면서|인데|있었|알게|눈에|처음|우연|보니|느껴|고민|찾|다녀|방문|체험|상담)/;

const SENTENCE_TAIL_BUCKETS = [
  { id: "formal_done", re: /(?:했습니다|하였습니다|됩니다)\s*[.!?…]?\s*$/ },
  { id: "haeyo", re: /(?:해요|해요요|이에요|예요)\s*[.!?…]?\s*$/ },
  { id: "da", re: /(?:다|니다)\s*[.!?…]?\s*$/ },
  { id: "question", re: /[?？]\s*$/ },
  { id: "recall", re: /(?:더라구요|더라고요|거든요|었어요)\s*[.!?…]?\s*$/ },
];

/** @deprecated alias — beta guard와 동일 키 */
const INDUSTRY_FORBIDDEN_PHRASES = {
  flower: [
    "침대",
    "매트리스",
    "모션베드",
    "모션 베드",
    "체험 가능 모델",
    "체험 가능",
    "헤드 각도",
    "누워보",
    "설치/배송",
  ],
  furniture: ["꽃다발", "화환", "플로리스트", "생화 예약", "플라워"],
  cafe: ["임플란트", "진료 과", "검진 센터", "수술 후", "처방"],
  hospital: ["에스프레소", "브런치 메뉴", "원두 산지", "베이커리 코스"],
  pet: ["모션베드", "매트리스", "헤드 각도", "임플란트", "꽃다발"],
  default: [],
};

function resolveIndustryKey(input = {}) {
  return mapIndustryEmojiKey(input) || resolveResearchCategoryKey(input) || "default";
}

function industryForbiddenPhrases(input = {}) {
  const key = resolveIndustryKey(input);
  return INDUSTRY_FORBIDDEN_PHRASES[key] || INDUSTRY_FORBIDDEN_PHRASES.default;
}

function stripForbiddenSentences(text, forbidden) {
  if (!text || !forbidden?.length) return text;
  const sentences = splitKoreanSentences(text);
  const kept = sentences.filter(
    (s) => !forbidden.some((phrase) => String(s).includes(phrase))
  );
  if (kept.length === sentences.length) return text;
  return kept.join(" ").trim();
}

function homeRegionStem(region = "") {
  return String(region || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 4);
}

/**
 * 지역·브랜드·주제만 반복하는 억지 나열 (SEO 스택)
 */
export function detectForcedEntityStacking(pack, ctx = {}, input = {}) {
  const full = getBlogFullText(pack);
  const { region, brand, topic } = titleContext(ctx, input);
  const issues = [];
  if (!full.replace(/\s/g, "").length) {
    return { ok: true, count: 0, issues };
  }

  const title = String(pack?.representativeTitle || pack?.title || "").trim();
  if (title && isMechanicalListingTitle(title, ctx, input)) {
    issues.push({ type: "mechanical_title", sample: title.slice(0, 72) });
  }

  const stackParts = [region, brand, topic].filter(Boolean);
  const stackLine = stackParts.join(" ").replace(/\s+/g, " ");
  if (stackLine.length >= 12) {
    const occurrences = full.split(stackParts.join(" ")).length - 1;
    if (occurrences >= 3) {
      issues.push({
        type: "entity_phrase_repeat",
        count: occurrences,
        sample: stackParts.join(" "),
      });
    }
  }

  let nakedStacks = 0;
  for (const block of full.split(/\n\n+/)) {
    const norm = block.replace(/\s/g, "");
    if (norm.length < 12 || norm.length > 80) continue;
    const hasRegion = region && norm.includes(region.replace(/\s/g, ""));
    const hasBrand = brand && norm.includes(brand.replace(/\s/g, ""));
    const hasTopic =
      topic && norm.includes(String(topic).replace(/\s/g, "").slice(0, 6));
    if (hasRegion && hasBrand && hasTopic && !NARRATIVE_VERB_RE.test(block)) {
      nakedStacks += 1;
    }
  }
  if (nakedStacks >= 2) {
    issues.push({ type: "entity_stack_paragraph", count: nakedStacks });
  }

  return {
    ok: issues.length === 0,
    count: issues.length,
    issues,
  };
}

/** 동일 문장 꼬리 3회 이상 */
export function detectSentenceStructureOveruse(fullText = "") {
  const sentences = splitKoreanSentences(fullText).filter(
    (s) => s.replace(/\s/g, "").length >= 8
  );
  const bucketCounts = {};
  for (const s of sentences) {
    for (const { id, re } of SENTENCE_TAIL_BUCKETS) {
      if (re.test(s.trim())) {
        bucketCounts[id] = (bucketCounts[id] || 0) + 1;
        break;
      }
    }
  }
  const max = HUMAN_DUPLICATE_POLICY.sameParagraphStructureMax || 3;
  const issues = Object.entries(bucketCounts)
    .filter(([, n]) => n >= max)
    .map(([id, count]) => ({ type: "sentence_tail_repeat", tail: id, count }));
  return {
    ok: issues.length === 0,
    bucketCounts,
    issues,
  };
}

/** 짧·중·긴 문장 혼합 */
export function scoreSentenceLengthVariety(fullText = "") {
  const sentences = splitKoreanSentences(fullText).filter(
    (s) => s.replace(/\s/g, "").length >= 10
  );
  if (sentences.length < 4) {
    return { ok: false, score: 40, short: 0, medium: 0, long: 0 };
  }
  let short = 0;
  let medium = 0;
  let long = 0;
  for (const s of sentences) {
    const n = s.replace(/\s/g, "").length;
    if (n < 36) short += 1;
    else if (n <= 88) medium += 1;
    else long += 1;
  }
  const kinds = [short > 0, medium > 0, long > 0].filter(Boolean).length;
  const ok = kinds >= 2;
  const score = ok ? 70 + kinds * 10 : 45;
  return { ok, score, short, medium, long, kinds };
}

export function detectIndustryCommonSenseViolations(fullText = "", input = {}) {
  const key = resolveIndustryKey(input);
  const cross = detectIndustryCrossContamination(fullText, key);
  const phraseHits = [];
  const forbidden = industryForbiddenPhrases(input);
  for (const sentence of splitKoreanSentences(fullText)) {
    const s = sentence.trim();
    if (s.length < 8) continue;
    const phrase = forbidden.find((p) => s.includes(p));
    if (phrase) phraseHits.push({ phrase, sample: s.slice(0, 80) });
  }
  const issues = [
    ...cross.violations.map((v) => ({
      type: "industry_cross",
      foreignIndustry: v.foreignIndustry,
    })),
    ...phraseHits.map((h) => ({ type: "industry_phrase", ...h })),
  ];
  return { ok: issues.length === 0, lockedKey: key, issues };
}

export function detectRegionCommonSenseViolations(fullText = "", input = {}) {
  const home = String(input.region || "").trim();
  if (!home || home.length < 2) {
    return { ok: true, issues: [] };
  }
  const stem = homeRegionStem(home);
  const topic = String(input.topic || input.mainKeyword || "");
  const issues = [];
  for (const marker of FOREIGN_REGION_MARKERS) {
    if (marker === home || home.includes(marker)) continue;
    if (topic.includes(marker)) continue;
    if (fullText.includes(marker)) {
      issues.push({ type: "foreign_region", region: marker, home });
    }
  }
  return { ok: issues.length === 0, issues };
}

export function scoreEditorNarrativeArc(pack) {
  const full = getBlogFullText(pack);
  const hit = HUMAN_EDITOR_NARRATIVE_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    ok: step.markers.test(full),
  }));
  const met = hit.filter((h) => h.ok).length;
  const ok = met >= 3;
  return {
    ok,
    met,
    total: HUMAN_EDITOR_NARRATIVE_STEPS.length,
    hit,
    score: Math.round((met / HUMAN_EDITOR_NARRATIVE_STEPS.length) * 100),
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} input
 */
export function scoreHumanityCommonSense(pack, ctx = {}, input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, issues: [], humanRead: true };
  }
  const evalInput = input || ctx.input || ctx;
  const full = getBlogFullText(pack);

  const stack = detectForcedEntityStacking(pack, ctx, evalInput);
  const structure = detectSentenceStructureOveruse(full);
  const variety = scoreSentenceLengthVariety(full);
  const industry = detectIndustryCommonSenseViolations(full, evalInput);
  const region = detectRegionCommonSenseViolations(full, evalInput);
  const arc = scoreEditorNarrativeArc(pack);

  const issues = [
    ...stack.issues,
    ...structure.issues,
    ...industry.issues,
    ...region.issues,
  ];
  if (!variety.ok) issues.push({ type: "sentence_length_flat" });

  let score = 88;
  if (!stack.ok) score -= 22;
  if (!structure.ok) score -= 18;
  if (!variety.ok) score -= 10;
  if (!industry.ok) score -= 28;
  if (!region.ok) score -= 20;
  if (!arc.ok) score -= 12;
  score = Math.max(0, Math.min(100, score));

  const hardFail =
    !stack.ok || !industry.ok || !region.ok || !structure.ok;
  const humanRead = score >= 72 && !hardFail && arc.met >= 3;

  return {
    ok: humanRead,
    score,
    humanRead,
    issues,
    checks: { stack, structure, variety, industry, region, arc },
  };
}

function purgeIndustryFromBlogPack(pack, input = {}) {
  const forbidden = industryForbiddenPhrases(input);
  if (!forbidden.length || !pack?.sections?.length) return pack;
  return {
    ...pack,
    sections: pack.sections.map((sec) => ({
      ...sec,
      heading: stripForbiddenSentences(sec.heading, forbidden),
      body: stripForbiddenSentences(sec.body, forbidden),
    })),
    conclusion: stripForbiddenSentences(pack.conclusion, forbidden),
    intro: stripForbiddenSentences(pack.intro, forbidden),
  };
}

/**
 * 고객 출력 직전 — 상식·억지 나열 보정 (길이 패딩 없음)
 */
export function applyHumanityCommonSensePass(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  const evalInput = input || ctx.input || ctx;
  let next = purgeIndustryFromBlogPack(pack, evalInput);

  const title = String(next.representativeTitle || next.title || "").trim();
  if (title && isMechanicalListingTitle(title, ctx, evalInput)) {
    const fixed = rewriteMechanicalTitle(
      title,
      ctx,
      evalInput,
      evalInput.contentPerspective || "brand"
    );
    next = { ...next, title: fixed, representativeTitle: fixed };
  }

  const sense = scoreHumanityCommonSense(next, ctx, evalInput);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanityCommonSense: sense,
      humanReadLikely: sense.humanRead,
    },
  };
}

export function buildHumanityCommonSensePromptBlock() {
  const steps = HUMAN_EDITOR_NARRATIVE_STEPS.map((s) => s.label).join(" → ");
  return [
    "【HUMANITY & COMMON SENSE】",
    HUMANITY_COMMON_SENSE_BRIEF,
    `에디터 흐름: ${steps}`,
    HUMAN_OVER_SEO_RULE,
  ].join("\n");
}
