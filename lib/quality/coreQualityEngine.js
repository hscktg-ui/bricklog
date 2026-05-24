/**
 * BRICLOG Core Quality Engine — 100점 만점, 90점 미만 재작성 연동
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { V4_PLACEHOLDER_RE, V4_AI_CLICHES } from "@/lib/quality/v4ContentAudit";
import { scoreSearchIntent } from "@/lib/quality/v4ContentAudit";
import {
  detectSpeechStyleMixing,
  resolveSpeechStyle,
  SPEECH_STYLE_OPTIONS,
} from "@/lib/constitution/writingConstitutionV2";
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { resolveEmotionTemperature } from "@/lib/emotion/emotionTemperature";

export const CORE_TARGET_SCORE = 90;
export const CORE_MAX_REWRITES = 5;

export const CORE_PLACEHOLDER_RE =
  /\b(undefined|null|NaN|placeholder|TODO|FIXME|lorem)\b|좋은내용|브랜드명|지역명|업종명|제목|내용|입력값|예시|\{\{|\}\}|\[브랜드\]|\[지역\]|\[내용\]/i;

export const CORE_AI_CLICHES = [
  ...V4_AI_CLICHES,
  "특별한 경험",
  "소중한 순간",
  "행복을 더하다",
  "감동을 선사하다",
  "가치를 전달하다",
  "풍요롭게 만들다",
  "깊은 유대감",
  "일상의 활력",
  "마음을 전하다",
  "따뜻한 공간",
  "특별한 시간",
  "의미 있는 순간",
  "행복한 시간",
];

const FAKE_LOCATION_MARKERS = [
  "서울",
  "강남",
  "홍대",
  "한강",
  "한강공원",
  "파주",
  "운정",
  "일산",
  "부산",
  "제주",
  "경기",
  "수원",
  "인천",
];

const OFFICIAL_OPENERS = [
  /안내드립니다/,
  /공식/,
  /고객님께/,
  /본 매장은/,
];
const REVIEW_OPENERS = [/다녀왔/, /써봤/, /느꼈/, /직접 가/];
const AD_OPENERS = [/지금 바로/, /놓치지 마/, /최고의 선택/];

function tokenizeTopic(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function countClicheOccurrences(text) {
  let n = 0;
  for (const p of CORE_AI_CLICHES) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

function topicKeywords(ctx = {}) {
  const anchor = ctx.topicAnchor || ctx.inputGrounding?.topicAnchor;
  if (anchor?.length) return [...new Set(anchor)];

  const raw = [
    ctx.inputGrounding?.primaryStory,
    ctx.topic,
    ctx.main,
    ctx.mainKeyword,
    ctx.writingSubject,
    ctx.contentThesis,
    ctx.representativeTitle,
    ...(ctx.inputGrounding?.mustInclude || []),
  ]
    .filter(Boolean)
    .join(" ");
  return [...new Set(tokenizeTopic(raw))];
}

/** Canonical brief alignment — must-include + industry drift */
export function scoreInputMismatch(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const grounding = ctx.inputGrounding || {};
  const mustInclude = grounding.mustInclude || [];
  const briefIndustry = grounding.industryHint || detectBriefIndustry(ctx);
  const outputIndustry = detectOutputIndustry(full);

  let score = 10;
  const reasons = [];

  if (mustInclude.length) {
    const missing = mustInclude.filter((phrase) => {
      const bit = String(phrase).trim().slice(0, 12);
      return bit.length >= 4 && !full.includes(bit);
    });
    if (missing.length >= Math.ceil(mustInclude.length * 0.5)) {
      score -= 6;
      reasons.push("must_include_missing");
    } else if (missing.length > 0) {
      score -= 2;
    }
  }

  if (
    briefIndustry &&
    outputIndustry &&
    briefIndustry !== outputIndustry &&
    countIndustryMentions(full, outputIndustry) >= 2
  ) {
    score -= 5;
    reasons.push("industry_contradiction");
  }

  const ok = score >= 7 && !reasons.includes("industry_contradiction");
  return { score: Math.max(0, score), ok, reasons };
}

function detectBriefIndustry(ctx) {
  const blob = [
    ctx.inputGrounding?.primaryStory,
    ctx.canonicalBrief,
    ctx.topic,
    ctx.industryLabel,
    ctx.industryKey,
  ]
    .filter(Boolean)
    .join(" ");
  return industryKeyFromText(blob);
}

function detectOutputIndustry(full) {
  return industryKeyFromText(full);
}

const INDUSTRY_MARKERS = [
  { re: /꽃집|플라워|생화|꽃다발/, key: "flower" },
  { re: /카페|커피\s*숍|라떼|원두/, key: "cafe" },
  { re: /부동산|매물|전세|월세|중개/, key: "realestate" },
  { re: /병원|의원|진료|처방/, key: "hospital" },
  { re: /학원|입시|수능|과외/, key: "academy" },
  { re: /헬스|피트니스|운동\s*기구/, key: "gym" },
];

function industryKeyFromText(text) {
  const blob = String(text || "");
  for (const row of INDUSTRY_MARKERS) {
    if (row.re.test(blob)) return row.key;
  }
  return null;
}

function countIndustryMentions(full, key) {
  const row = INDUSTRY_MARKERS.find((r) => r.key === key);
  if (!row) return 0;
  const m = full.match(row.re);
  return m ? m.length : 0;
}

/** 주제 적합도 0–20 */
export function scoreTopicFit(pack, ctx = {}, channel = "blog") {
  const full = getBlogFullText(pack);
  const kws = topicKeywords(ctx);
  if (!kws.length) return { score: 18, ok: true };

  const hits = kws.filter((k) => full.includes(k)).length;
  const ratio = hits / kws.length;
  const score = Math.round(Math.min(20, ratio * 22));
  const ok = ratio >= 0.7 || (kws.length <= 2 && hits >= Math.min(kws.length, 1));
  return { score, ok, ratio, hits, total: kws.length };
}

/** 검색 의도 0–20 */
export function scoreSearchIntentBlock(pack, ctx = {}) {
  const raw = scoreSearchIntent(pack, ctx);
  const score = Math.round((raw / 100) * 20);
  return { score, ok: raw >= 50, raw };
}

/** 브랜드 반영 0–15 */
export function scoreBrandPresence(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const brand = ctx.brandName || "";
  const memory = ctx.brandMemory || {};
  const hasBrandContext =
    brand ||
    memory.brandDescription ||
    memory.storeFeatures ||
    ctx.brandDescription ||
    ctx.storeFeatures;

  if (!hasBrandContext) return { score: 12, ok: true };

  let score = 0;
  if (brand && full.includes(brand)) score += 8;
  const extras = [
    memory.brandDescription,
    memory.storeFeatures,
    ctx.includeList?.join?.(" ") || ctx.includePhrases,
  ].filter(Boolean);
  for (const e of extras) {
    const bit = String(e).slice(0, 8);
    if (bit.length >= 3 && full.includes(bit)) score += 4;
  }
  score = Math.min(15, score);
  const ok = !brand || (full.includes(brand) && score >= 8);
  return { score, ok };
}

/** 화자 일관성 0–10 */
export function detectPersonaInconsistency(pack, ctx = {}) {
  const full = getBlogFullText(pack).slice(0, 800);
  const official = OFFICIAL_OPENERS.filter((re) => re.test(full)).length;
  const review = REVIEW_OPENERS.filter((re) => re.test(full)).length;
  const ad = AD_OPENERS.filter((re) => re.test(full)).length;
  const speaker = ctx.input?.v4Speaker || "auto";
  if (speaker === "brand_intro" && review >= 2 && official === 0) {
    return { ok: false, reason: "persona_inconsistency" };
  }
  if (speaker === "plain_review" && official >= 2) {
    return { ok: false, reason: "persona_inconsistency" };
  }
  if (official >= 1 && review >= 2 && ad >= 1) {
    return { ok: false, reason: "persona_inconsistency" };
  }
  return { ok: true, reason: null };
}

export function scorePersonaConsistency(pack, ctx = {}) {
  const p = detectPersonaInconsistency(pack, ctx);
  return { score: p.ok ? 10 : 3, ok: p.ok, reason: p.reason };
}

/** 말투 일관성 0–10 */
export function scoreToneConsistency(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const key = ctx.speechStyle || ctx.input?.speechStyle || "friendly_blog";
  const mix = detectSpeechStyleMixing(full, key);
  return { score: mix.ok ? 10 : 2, ok: mix.ok, reason: mix.ok ? null : "tone_inconsistency" };
}

/** 감정 온도 0–10 */
export function scoreEmotionConsistency(pack, ctx = {}) {
  const clicheN = countClicheOccurrences(getBlogFullText(pack));
  const emotion = resolveEmotionTemperature(ctx.input || ctx);
  let score = 10;
  if (emotion.key === "plain" && clicheN >= 3) score -= 4;
  if (emotion.key === "premium" && /ㅋ|ㅎ|대박/.test(getBlogFullText(pack))) score -= 3;
  return { score: Math.max(0, score), ok: score >= 6 };
}

export function detectPlaceholder(full) {
  return CORE_PLACEHOLDER_RE.test(full);
}

export function detectFakeLocation(full, ctx = {}) {
  const region = String(ctx.region || "").trim();
  if (region.length >= 2) return { ok: true, hits: [] };
  const hits = FAKE_LOCATION_MARKERS.filter((loc) => full.includes(loc));
  return { ok: hits.length === 0, hits };
}

export function scoreCoreContent(pack, ctx = {}, channel = "blog") {
  const full = channel === "blog" ? getBlogFullText(pack) : fullFromChannel(pack, channel);
  const failReasons = [];
  const breakdown = {};

  if (detectPlaceholder(full)) {
    failReasons.push("placeholder_detected");
    breakdown.placeholder = 0;
  } else {
    breakdown.placeholder = 5;
  }

  const clicheN = countClicheOccurrences(full);
  if (clicheN >= 2) {
    failReasons.push("ai_cliche_detected");
    breakdown.aiCliche = 0;
  } else {
    breakdown.aiCliche = Math.max(0, 5 - clicheN);
  }

  if (hasDuplicateSentences(full, 14)) {
    failReasons.push("repetition_detected");
    breakdown.repetition = 0;
  } else {
    breakdown.repetition = 5;
  }

  const topic = scoreTopicFit(pack, ctx, channel);
  breakdown.topicFit = topic.score;
  if (!topic.ok) failReasons.push("topic_drift");

  const inputAlign = scoreInputMismatch(pack, ctx);
  breakdown.inputAlignment = inputAlign.score;
  if (!inputAlign.ok) failReasons.push("input_mismatch");

  const search = scoreSearchIntentBlock(pack, ctx);
  breakdown.searchIntent = search.score;
  if (!search.ok) failReasons.push("search_intent_missing");

  const brand = scoreBrandPresence(pack, ctx);
  breakdown.brandPresence = brand.score;
  if (!brand.ok) failReasons.push("brand_presence_missing");

  const persona = scorePersonaConsistency(pack, ctx);
  breakdown.personaConsistency = persona.score;
  if (!persona.ok) failReasons.push(persona.reason || "persona_inconsistency");

  const tone = scoreToneConsistency(pack, ctx);
  breakdown.toneConsistency = tone.score;
  if (!tone.ok) failReasons.push(tone.reason || "tone_inconsistency");

  const emotion = scoreEmotionConsistency(pack, ctx);
  breakdown.emotionTone = emotion.score;

  const loc = detectFakeLocation(full, ctx);
  if (!loc.ok) failReasons.push("fake_location_inserted");

  let lengthScore = 5;
  if (channel === "blog") {
    const chars = countBlogBodyChars(pack);
    if (chars < 1800) {
      failReasons.push("length_too_short");
      lengthScore = Math.max(0, Math.round((chars / 2000) * 5));
    }
  }
  breakdown.length = lengthScore;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const capped = Math.min(100, Math.round(total));

  return {
    total: capped,
    breakdown,
    failReasons: [...new Set(failReasons)],
    pass: capped >= CORE_TARGET_SCORE && failReasons.length === 0,
    blockers: failReasons,
  };
}

function fullFromChannel(pack, channel) {
  if (channel === "blog") return getBlogFullText(pack);
  return [
    pack?.title,
    pack?.shortNotice,
    pack?.detailBody,
    pack?.hook,
    pack?.body,
    pack?.lineBreakBody,
    pack?.ending,
  ]
    .filter(Boolean)
    .join("\n");
}

const REGEN_HINTS = {
  placeholder_detected:
    "placeholder·미완성 라벨(좋은내용, 브랜드명, 제목, undefined 등)을 실제 문장으로 바꿔 주세요.",
  ai_cliche_detected:
    "AI 관용구(특별한 경험, 소중한 순간, 감동을 선사 등)를 줄이고 구체 장면으로 써 주세요.",
  repetition_detected: "같은 문장·같은 소제목 패턴 반복을 제거해 주세요.",
  topic_drift:
    "권위 브리프(핵심 이야기·브랜드)에서 벗어난 지역·업종·행사 이야기를 빼고 입력 주제에 70% 이상 답해 주세요.",
  input_mismatch:
    "권위 브리프의 핵심 이야기·반드시 반영 포인트·업종 맥락과 다른 내용은 제거하고 사용자가 의도한 주제만 써 주세요.",
  search_intent_missing:
    "검색한 사람이 궁금해할 질문(왜, 어떻게, 누구에게, 지금 해볼 만한지)에 답해 주세요.",
  brand_presence_missing:
    "브랜드명·매장 특징·서비스가 본문에 자연스럽게 드러나게 써 주세요.",
  persona_inconsistency:
    "선택한 화자 톤을 처음부터 끝까지 유지하세요. 공식 안내↔후기 톤 혼용 금지.",
  tone_inconsistency:
    "선택한 말투(해요체/습니다체)를 제목·도입·본문·마무리 전 구간에 일관되게 유지하세요.",
  fake_location_inserted:
    "사용자가 지역을 입력하지 않았으면 서울·강남·파주 등 임의 지역명을 넣지 마세요.",
  length_too_short: `블로그 본문 공백 포함 ${BLOG_MIN_BODY_CHARS}자 이상으로 써 주세요.`,
  v2axis_brand_mentions:
    "브랜드명을 제목·소제목·본문에 자연스럽게 5회 이상 (키워드 도배 금지).",
  v2axis_region_mentions:
    "지역명을 5회 이상 반영하고 지역 검색 의도(매장·생활권)에 답하세요.",
  v2axis_product_mentions:
    "제품·주제 키워드를 5회 이상, 확인된 특징·차별점 위주로 쓰세요.",
  v2axis_seo_weak:
    "제목·첫 문단·소제목·마무리에 브랜드·지역·주제를 각각 배치하세요.",
  v2axis_banned_template:
    "꽃집·카페·기념일 등 이전 업종 템플릿 문구를 모두 제거하세요.",
  v2axis_below_95:
    "브랜드·지역·주제 축과 SEO·팩트 검수 95점 이상이 되도록 보강하세요.",
  v2axis_no_research:
    "조사·검증 없이 작성하지 마세요. 【조사 확정 항목】만 근거로 다시 작성하세요.",
  v2axis_insufficient_facts:
    "확인된 실마리만 단정하고, 부족한 부분은 브랜드·지역·독자 질문으로 전개하세요.",
  v2axis_low_research_grounding:
    "본문 70% 이상을 【조사 확정 항목】에 근거해 다시 쓰세요. 일반론·추측 문장 제거.",
  v2axis_off_axis_sentences:
    "브랜드·지역·주제와 무관한 문장·타 업종 템플릿을 삭제하고 조사 항목만 반영하세요.",
  v3_below_95: "V3 브랜드 점수 95점 이상 — 브랜드·지역·주제·정보성·SEO·신뢰성.",
  v3_reader_memory_fail:
    "독자가 브랜드·지역·제품을 기억하도록 제목·본문·마무리에 세 축을 분명히.",
  v3_industry_drift: "기념일·꽃·카페·반려견 등 업종 무관 문장 제거.",
  v3_ai_contamination: "혁신·최고·감동·주말 아침 등 AI 오염 표현 제거.",
  v3_fact_check_fail: "브랜드명·지역명·제품명 일치 및 허구 표현을 수정하세요.",
};

export function buildRegenPromptForFailures(failReasons = [], ctx = {}) {
  const lines = failReasons
    .map((r) => REGEN_HINTS[r])
    .filter(Boolean);
  const speaker = V4_SPEAKER_OPTIONS.find((o) => o.value === ctx.v4Speaker);
  const style = SPEECH_STYLE_OPTIONS.find(
    (o) => o.value === (ctx.speechStyle || "friendly_blog")
  );
  if (speaker?.label) lines.unshift(`화자 유지: ${speaker.label}`);
  if (style?.label) lines.unshift(`말투 유지: ${style.label}`);
  return lines.join(" ");
}

export function needsCoreRegen(coreResult) {
  if (!coreResult) return false;
  return coreResult.total < CORE_TARGET_SCORE || coreResult.failReasons?.length > 0;
}

export function buildImprovementSuggestions(failReasons = []) {
  return failReasons.map((r) => REGEN_HINTS[r]).filter(Boolean);
}

export function labelsForMeta(input = {}) {
  const speaker = V4_SPEAKER_OPTIONS.find((o) => o.value === input.v4Speaker);
  const style = resolveSpeechStyle(input);
  const emotion = resolveEmotionTemperature(input);
  const profMap = {
    beginner: "초보 블로거",
    general: "일반 블로거",
    marketer: "마케터",
    editor_pro: "전문 에디터",
    writer_pro: "전문 작가",
  };
  return {
    persona: speaker?.label || "자동추천",
    emotionTone: emotion.label || "자동추천",
    writingTone: style.label,
    skillLevel: profMap[input.proficiency] || "전문 에디터",
  };
}
