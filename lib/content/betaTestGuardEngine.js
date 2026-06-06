/**
 * BRICLOG BETA TEST GUARD ENGINE
 * ULTIMATE CONTENT ENGINE V20 — Reviewer AI · 출력 전 9항 + 최종 6항
 */
import {
  MASTER_FINAL_REVIEW,
  MASTER_QUALITY_GUARD_BRIEF,
  HUMAN_DUPLICATE_POLICY,
  INFORMATION_UNIT_RANGE,
} from "@/lib/product/masterQualityDirective";
import { getChannelFullText } from "@/lib/content/channelPack";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { scoreContentQuality } from "@/lib/product/contentQualityEngine";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import {
  detectDuplicateKillerIssues,
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import {
  hasMetaPhilosophyLeak,
  hasMetaLayerLeak,
  sanitizeBlogPackMetaLayer,
  stripMetaLayerTerms,
} from "@/lib/content/metaLayerSeparation";
import {
  isMechanicalListingTitle,
  rewriteMechanicalTitle,
} from "@/lib/content/humanTitleEngine";
import { applyChannelMarketerPack } from "@/lib/content/channelMarketerEngine";
import { applyEmojiEngine } from "@/lib/emoji/emojiEngine";
import { purgeIndustryAndAiSentences } from "@/lib/content/v3/industryPurge";
import {
  assertKnowledgeExpansionReady,
  runKnowledgeExpansionPipeline,
} from "@/lib/content/knowledgeExpansionEngine";
import {
  detectChannelMarketerIssues,
} from "@/lib/content/channelMarketerEngine";
import {
  applyEditorQualityPack,
  scoreProfessionalEditorTone,
} from "@/lib/content/editorQualityEngine";
import { scoreMagazineColumnArc } from "@/lib/content/columnMagazineArchetype";
import {
  resolveEmojiLevel,
  countEmoji,
  EMOJI_LEVEL_RULES,
} from "@/lib/emoji/emojiEngine";
import { mapIndustryEmojiKey } from "@/lib/emoji/emojiEngine";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { isPublishableBlogPack } from "@/lib/content/outlinePackGuard";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  deepenMissionProseToMin,
  stripTitleEchoParagraphs,
} from "@/lib/llm/missionProseFallback";
import { isLengthOnlyGateSoft } from "@/lib/product/missionFlags";
import { detectVisitReviewTemplateContamination } from "@/lib/content/visitReviewTopicGate";

export const BETA_GUARD_USER_MESSAGE =
  "아직 올리지 않았어요. 품질 기준을 맞춘 뒤 다시 시도해 주세요.";

export const BETA_GUARD_CHECKS = [
  { id: "internal_prompt_leak", label: "1. 내부 프롬프트 노출 검사" },
  { id: "duplicate_content", label: "2. 반복문 검사" },
  { id: "length_tier", label: "3. 글자수 검사" },
  { id: "industry_fit", label: "4. 업종 적합성 검사" },
  { id: "title_quality", label: "5. 제목 검사" },
  { id: "research_depth", label: "6. 조사 깊이 검사" },
  { id: "channel_fit", label: "7. 채널 적합성 검사" },
  { id: "emoji_policy", label: "8. 이모지 검사" },
  {
    id: "human_review",
    label: `9. 최종 인간 검수 (${MASTER_FINAL_REVIEW.length}항)`,
  },
];

/** 본문에 등장 시 실패 */
const INTERNAL_PROMPT_LEAK_RE = [
  /이\s*글은\s*.+에\s*답하려고/i,
  /이\s*글은\s*.+에\s*답/i,
  /확인된\s*정보만\s*남기고/i,
  /방문\s*전\s*확인하면/i,
  /브랜드\s*메모리/i,
  /콘텐츠\s*일관성/i,
  /SEO는\s*결과이며/i,
  /검수\s*기준/i,
  /정보성/i,
  /\binformative\b/i,
  /\bemotional\b/i,
  /\bsave\b/i,
  /브랜드\s*철학/i,
  /내부\s*검수/i,
  /콘텐츠\s*축적/i,
  /목적\s*고정/i,
  /톤\s*고정/i,
  /GPT:\s*글을\s*쓴다/i,
  /Gemini:\s*조사한다/i,
  /Naver:\s*지역성/i,
  /Memory:\s*브랜드/i,
  /【BRICLOG\s*MISSION/i,
  /AI\s*역할\s*분리/i,
  /세\s*칸만\s*채우면/i,
  /이\s*브랜드답게\s*이어/i,
  /Writer\s*only/i,
  /Research\s*only/i,
];

/** 업종별 타 업종 오염 문구 */
const INDUSTRY_FORBIDDEN_PHRASES = {
  flower: [
    "침대",
    "매트리스",
    "모션베드",
    "모션 베드",
    "체압 분산",
    "무중력",
    "헤드 각도",
    "누워보",
  ],
  furniture: [
    "꽃다발",
    "화환",
    "플로리스트",
    "생화 예약",
    "꽃 한 다발",
    "리본 포장",
    "플라워",
  ],
  cafe: [
    "임플란트",
    "진료 과",
    "검진 센터",
    "수술 후",
    "처방",
    "병원 비용",
    "금식",
  ],
  hospital: [
    "에스프레소",
    "브런치 메뉴",
    "원두 산지",
    "베이커리 코스",
    "디저트 코스",
    "라떼 아트",
  ],
  carwash: ["임플란트", "꽃다발", "브런치 메뉴", "모션베드"],
  education: ["임플란트", "모션베드", "에스프레소", "꽃다발"],
  lawyer: ["임플란트", "모션베드", "브런치", "꽃다발"],
  construction: ["임플란트", "꽃다발", "라떼 아트"],
  marketing: ["임플란트", "수술 후", "모션베드"],
  public: ["임플란트", "모션베드", "브런치 메뉴"],
  saas: ["임플란트", "꽃다발", "체압 분산"],
  default: [],
};

const BLOG_COLUMN_RE =
  /(이\s*글은|결론적으로\s*말하면|서론|본론|마무리|다음\s*섹션|소제목\s*\d)/i;

const INSTA_ESSAY_RE =
  /(결론적으로|정리하면|알아보시다\s*보면|검색하시는\s*분|이번\s*글에서는)/;

const PLACE_COLUMN_RE =
  /(결론적으로|서론|본론|이번\s*글|블로그\s*요약|SEO\s*전략)/;

/** 검수 실패 시 화면 출력 금지 (베타·V2/V3 파이프라인) */
export function shouldWithholdFailedPostVerify(input = {}) {
  return requiresBetaTestGuard(input);
}

function fixMechanicalTitleInPack(pack, channel, ctx, input) {
  if (!pack) return pack;
  const perspective =
    input.contentPerspective || ctx.contentPerspective || "brand";
  const ch = normalizeChannel(channel);
  if (ch === "blog") {
    const title = rewriteMechanicalTitle(
      pack.representativeTitle || pack.title,
      ctx,
      input,
      perspective
    );
    return { ...pack, title, representativeTitle: title };
  }
  if (ch === "place") {
    const title = rewriteMechanicalTitle(pack.title, ctx, input, perspective);
    return { ...pack, title };
  }
  if (ch === "instagram") {
    const hook = rewriteMechanicalTitle(pack.hook, ctx, input, perspective);
    return { ...pack, hook };
  }
  return pack;
}

function normalizeChannel(channel = "blog") {
  if (channel === "smartplace") return "place";
  if (channel === "insta") return "instagram";
  return channel;
}

function titleForPack(pack, channel) {
  const ch = normalizeChannel(channel);
  if (ch === "instagram") return pack?.hook || pack?.title || "";
  return pack?.representativeTitle || pack?.title || "";
}

function checkInternalPromptLeak(full, ctx = {}) {
  const failures = [];
  for (const re of INTERNAL_PROMPT_LEAK_RE) {
    if (re.test(full)) {
      failures.push({
        type: "internal_prompt_leak",
        pattern: String(re),
        message: "내부 프롬프트·검수 문구 노출",
      });
      break;
    }
  }
  if (hasMetaPhilosophyLeak(full, ctx) || hasMetaLayerLeak(full)) {
    failures.push({
      type: "internal_prompt_leak",
      message: "메타·엔진 용어 노출",
    });
  }
  return failures;
}

function blogDuplicateScanText(pack) {
  if (!pack?.sections?.length) return "";
  return [
    ...(pack.sections || []).map((s) => `${s.heading || ""} ${s.body || ""}`.trim()),
    pack.conclusion,
  ]
    .filter(Boolean)
    .join("\n");
}

function checkDuplicate(full, pack = null, channel = "blog") {
  const scanText =
    normalizeChannel(channel) === "blog" && pack?.sections?.length
      ? blogDuplicateScanText(pack)
      : full;
  const dup = detectDuplicateKillerIssues(scanText, {
    sameInfoMax: 2,
    similarityPercent: HUMAN_DUPLICATE_POLICY.similarityPercent,
  });
  if (dup.ok) return [];
  return dup.issues.slice(0, 6).map((issue) => ({
    type: "duplicate_content",
    ...issue,
    message: "동일·유사 문장 반복 (80%+)",
  }));
}

function checkLengthTier(pack, input, channel) {
  if (normalizeChannel(channel) !== "blog") {
    return { ok: true, skipped: true };
  }
  const gate = assertBlogLengthTier(input, pack);
  if (gate.ok) return { ok: true, ...gate };
  const underOnly =
    (gate.reasons || []).length > 0 &&
    (gate.reasons || []).every((r) => r === "length_tier_under");
  if (
    isLengthOnlyGateSoft() &&
    underOnly &&
    gate.chars >= gate.min - 50 &&
    gate.chars > 0
  ) {
    return {
      ok: true,
      softLength: true,
      chars: gate.chars,
      min: gate.min,
      max: gate.max,
      reasons: gate.reasons,
    };
  }
  return {
    ok: false,
    chars: gate.chars,
    min: gate.min,
    max: gate.max,
    reasons: gate.reasons,
  };
}

function industryForbiddenList(input = {}) {
  const key = mapIndustryEmojiKey(input) || resolveResearchCategoryKey(input);
  return INDUSTRY_FORBIDDEN_PHRASES[key] || [];
}

function sentenceHasForbiddenPhrase(sentence, forbidden) {
  const s = String(sentence || "");
  return forbidden.some((phrase) => s.includes(phrase));
}

function findIndustryMismatchSentences(full, input = {}) {
  const forbidden = industryForbiddenList(input);
  if (!forbidden.length) return [];

  const hits = [];
  for (const sentence of splitKoreanSentences(full)) {
    const s = sentence.trim();
    if (s.length < 8) continue;
    if (sentenceHasForbiddenPhrase(s, forbidden)) {
      const phrase = forbidden.find((p) => s.includes(p));
      hits.push({ phrase, sample: s.slice(0, 80) });
    }
  }
  return hits;
}

function stripForbiddenSentences(text, forbidden) {
  if (!text || !forbidden.length) return text;
  const sentences = splitKoreanSentences(text);
  const kept = sentences.filter((s) => !sentenceHasForbiddenPhrase(s, forbidden));
  if (kept.length === sentences.length) return text;
  return kept.join(" ").trim();
}

function purgeCrossIndustryMismatch(pack, input = {}, channel = "blog") {
  const forbidden = industryForbiddenList(input);
  if (!forbidden.length || !pack) return pack;

  const ch = normalizeChannel(channel);
  if (ch === "blog" && pack.sections?.length) {
    return {
      ...pack,
      sections: pack.sections.map((sec) => ({
        ...sec,
        body: stripForbiddenSentences(sec.body, forbidden),
        heading: stripForbiddenSentences(sec.heading, forbidden),
      })),
      conclusion: stripForbiddenSentences(pack.conclusion, forbidden),
      intro: stripForbiddenSentences(pack.intro, forbidden),
    };
  }
  if (ch === "place") {
    return {
      ...pack,
      shortBody: stripForbiddenSentences(pack.shortBody, forbidden),
      detailBody: stripForbiddenSentences(pack.detailBody, forbidden),
      body: stripForbiddenSentences(pack.body, forbidden),
    };
  }
  if (ch === "instagram") {
    return {
      ...pack,
      body: stripForbiddenSentences(pack.body, forbidden),
      lineBreakBody: stripForbiddenSentences(pack.lineBreakBody, forbidden),
    };
  }
  return pack;
}

function checkIndustryFit(full, input = {}) {
  const hits = findIndustryMismatchSentences(full, input);
  if (!hits.length) return [];
  return hits.map((h) => ({
    type: "industry_mismatch",
    ...h,
    message: `업종 불일치: ${h.phrase}`,
  }));
}

function checkTitle(pack, ctx, input, channel) {
  const title = titleForPack(pack, channel);
  if (!title?.trim()) {
    return [{ type: "title_missing", message: "제목 없음" }];
  }
  if (isMechanicalListingTitle(title, ctx, input)) {
    return [{ type: "mechanical_title", message: "지역+브랜드+주제 나열형 제목" }];
  }
  return [];
}

function checkResearchDepth(input = {}) {
  const ch = normalizeChannel(input.contentChannel || "blog");
  if (
    ch === "place" ||
    ch === "instagram" ||
    input.v2ResearchReady ||
    input.v2AxisVerified
  ) {
    return [];
  }
  const expansion =
    input.knowledgeExpansion ||
    runKnowledgeExpansionPipeline(input);
  const ready = assertKnowledgeExpansionReady(
    {
      unitCount: expansion.unitCount,
      coverageCount: expansion.coverageCount,
      searchQueryCount: expansion.searchQueryCount,
      informationUnits: expansion.informationUnits,
      knowledgeCoverage: expansion.knowledgeCoverage,
      searchExpansion: expansion.searchExpansion,
      brand: input.brandName,
      region: input.region,
      topicRaw: input.topic || input.mainKeyword,
    },
    input
  );
  if (!ready.ok) {
    return ready.reasons.map((r) => ({
      type: "research_depth",
      reason: r,
      message: `주제 분해·조사 단위 부족 (${INFORMATION_UNIT_RANGE.min}~${INFORMATION_UNIT_RANGE.max})`,
    }));
  }
  return [];
}

function checkChannelFit(pack, full, channel, ctx, input) {
  const ch = normalizeChannel(channel);
  const failures = [];

  if (ch === "blog") {
    if (!pack?.sections?.length || pack.sections.length < 3) {
      failures.push({ type: "channel_fit", message: "블로그 칼럼 구조 부족" });
    }
    if (BLOG_COLUMN_RE.test(full) && /서론|본론/.test(full)) {
      failures.push({ type: "channel_fit", message: "블로그에 채널 혼합 문체" });
    }
    const flow = scoreMagazineColumnArc(pack);
    if (!flow.ok) {
      failures.push({
        type: "channel_fit",
        message: flow.bookends?.ok === false
          ? "칼럼 흐름·시작/끝 톤 미흡"
          : "칼럼 흐름(기승전결) 미흡",
      });
    }
  }

  if (ch === "instagram") {
    if (INSTA_ESSAY_RE.test(full)) {
      failures.push({ type: "channel_fit", message: "인스타에 블로그형 문체" });
    }
    const lines = String(pack?.body || pack?.lineBreakBody || "")
      .split(/\n+/)
      .filter((l) => l.trim());
    if (lines.length < 2) {
      failures.push({ type: "channel_fit", message: "인스타 장면형 줄바꿈 부족" });
    }
    const marketer = detectChannelMarketerIssues(pack, ch, ctx, input);
    if (!marketer.ok) {
      failures.push(...marketer.issues.slice(0, 3).map((i) => ({
        type: "channel_fit",
        message: i.type,
      })));
    }
  }

  if (ch === "place") {
    if (PLACE_COLUMN_RE.test(full)) {
      failures.push({ type: "channel_fit", message: "플레이스에 블로그형 문체" });
    }
    const marketer = detectChannelMarketerIssues(pack, ch, ctx, input);
    if (!marketer.ok) {
      failures.push(...marketer.issues.slice(0, 3).map((i) => ({
        type: "channel_fit",
        message: i.type,
      })));
    }
  }

  return failures;
}

function checkEmojiPolicy(pack, full, channel, ctx, input) {
  const ch = normalizeChannel(channel);
  const level = resolveEmojiLevel({ ...ctx, ...input }, ch);
  const rules = EMOJI_LEVEL_RULES[level] || EMOJI_LEVEL_RULES.none;
  const total = countEmoji(full);
  const failures = [];

  if (ch === "blog" && total > 0 && level === "none") {
    failures.push({
      type: "emoji_policy",
      message: "블로그 기본 이모지 없음 위반",
      count: total,
    });
  }

  if (ch === "place") {
    const max = Math.min(3, rules.max || 3);
    if (total > max) {
      failures.push({
        type: "emoji_policy",
        message: `플레이스 이모지 ${max}개 초과`,
        count: total,
      });
    }
  }

  if (ch === "instagram") {
    if (total < rules.min && level !== "none") {
      failures.push({
        type: "emoji_policy",
        message: "인스타 이모지 밀도 부족",
        count: total,
        min: rules.min,
      });
    }
    if (total > rules.max + 2) {
      failures.push({
        type: "emoji_policy",
        message: "인스타 이모지 과다",
        count: total,
        max: rules.max,
      });
    }
  }

  const lines = full.split("\n");
  for (const line of lines) {
    if (countEmoji(line) > 1) {
      failures.push({
        type: "emoji_policy",
        message: "한 줄에 이모지 2개 이상",
        line: line.slice(0, 60),
      });
      break;
    }
  }

  return failures;
}

function checkHumanReview(pack, channel, ctx, input) {
  const ch = normalizeChannel(channel);
  const failures = [];
  const tone = scoreProfessionalEditorTone(pack);
  const minTone = ch === "blog" ? 72 : 68;

  if (!tone.ok || tone.score < minTone) {
    failures.push({
      type: "human_review",
      reviewId: "editor_voice",
      message: MASTER_FINAL_REVIEW.find((r) => r.id === "editor_voice")?.label,
      score: tone.score,
    });
  }

  const brand = String(input.brandName || ctx.brandName || "").trim();
  const region = String(input.region || ctx.region || "").trim();
  const full = getChannelFullText(pack, ch);
  if (brand && !full.includes(brand)) {
    failures.push({
      type: "human_review",
      reviewId: "brand_asset",
      message: MASTER_FINAL_REVIEW.find((r) => r.id === "brand_asset")?.label,
    });
  }
  if (region && region !== "전국" && !full.includes(region)) {
    failures.push({
      type: "human_review",
      reviewId: "brand_asset",
      message: "지역 맥락이 브랜드 자산으로 남지 않음",
    });
  }

  if (ch === "blog") {
    const flow = scoreMagazineColumnArc(pack);
    if (!flow.ok) {
      failures.push({
        type: "human_review",
        reviewId: "editor_voice",
        message: "칼럼 구조·실무 신뢰도 미달",
        reasons: flow.reasons,
      });
    }
    const sections = pack?.sections || [];
    const thin = sections.filter(
      (s) => String(s.body || "").replace(/\s/g, "").length < 80
    ).length;
    if (thin >= Math.ceil(sections.length / 2)) {
      failures.push({
        type: "human_review",
        reviewId: "information_depth",
        message: MASTER_FINAL_REVIEW.find((r) => r.id === "information_depth")
          ?.label,
      });
    }
    if (!isPublishableBlogPack(pack)) {
      failures.push({
        type: "human_review",
        reviewId: "publish_ready",
        message: MASTER_FINAL_REVIEW.find((r) => r.id === "publish_ready")
          ?.label,
      });
    }

    const belief =
      pack?._meta?.humanBelief ||
      scoreHumanBelief(full, {
        ...input,
        approvedContentCount: input.approvedContentCount,
        brandApprovedContentBrief: input.brandApprovedContentBrief,
      });
    if (!belief.ok) {
      failures.push({
        type: "human_belief_low",
        reviewId: "editor_voice",
        message: "광고·브로슈어 톤 — 사람이 쓴 느낌 미달",
        score: belief.score,
        issues: belief.issues,
      });
    }

    const grounded =
      pack?._meta?.humanBelief?.grounded ||
      scoreGroundedSpecificity(pack, { ...ctx, input }, input.researchFacts);
    const factCount = (input.researchFacts || []).length;
    if (!grounded.ok && factCount >= 2) {
      failures.push({
        type: "grounded_specificity_low",
        reviewId: "information_depth",
        message: "조사·구체 정보가 본문에 충분히 박히지 않음",
        issues: grounded.issues,
      });
    }

    const cq =
      pack?._meta?.contentQuality ||
      scoreContentQuality(pack, { ...ctx, input }, input);
    if (!cq.humanEditorPass) {
      failures.push({
        type: "content_quality",
        reviewId: "human_voice",
        message: "사람 에디터가 작성한 것처럼 보이지 않음",
        score: cq.score,
        issues: (cq.issues || []).slice(0, 6),
      });
    }
  }

  return failures;
}

/**
 * @param {object} pack
 * @param {string} channel
 * @param {object} ctx
 * @param {object} input
 */
export function detectBetaTestGuardFailures(pack, channel = "blog", ctx = {}, input = {}) {
  const evalInput = input || ctx.input || ctx;
  const ch = normalizeChannel(channel);
  const full = getChannelFullText(pack, ch);

  const checks = {
    internal_prompt_leak: { ok: true, failures: [] },
    duplicate_content: { ok: true, failures: [] },
    length_tier: { ok: true, failures: [], skipped: ch !== "blog" },
    industry_fit: { ok: true, failures: [] },
    title_quality: { ok: true, failures: [] },
    research_depth: { ok: true, failures: [] },
    channel_fit: { ok: true, failures: [] },
    emoji_policy: { ok: true, failures: [] },
    human_review: { ok: true, failures: [] },
    content_quality: { ok: true, failures: [] },
  };

  checks.internal_prompt_leak.failures = checkInternalPromptLeak(full, { ...ctx, input: evalInput });
  checks.internal_prompt_leak.ok = checks.internal_prompt_leak.failures.length === 0;

  checks.duplicate_content.failures = checkDuplicate(full, pack, ch);
  checks.duplicate_content.ok = checks.duplicate_content.failures.length === 0;
  if (!checks.duplicate_content.ok) {
    checks.duplicate_content.failures = checks.duplicate_content.failures.map(
      (f) => ({
        ...f,
        reviewId: "no_duplication",
      })
    );
  }

  const lengthResult = checkLengthTier(pack, evalInput, ch);
  checks.length_tier = {
    ok: lengthResult.ok !== false,
    skipped: Boolean(lengthResult.skipped),
    ...lengthResult,
    failures: lengthResult.ok ? [] : [{ type: "length_tier", ...lengthResult }],
  };

  checks.industry_fit.failures = checkIndustryFit(full, evalInput);
  const visitContamination = detectVisitReviewTemplateContamination(pack, evalInput);
  if (!visitContamination.ok) {
    checks.industry_fit.failures.push({
      type: "visit_review_template_contamination",
      message: "방문 후기 주제에 정보형·제품 가이드 템플릿이 섞였습니다.",
      violations: visitContamination.violations?.slice(0, 4),
    });
  }
  checks.industry_fit.ok = checks.industry_fit.failures.length === 0;

  checks.title_quality.failures = checkTitle(pack, ctx, evalInput, ch);
  checks.title_quality.ok = checks.title_quality.failures.length === 0;

  checks.research_depth.failures = checkResearchDepth(evalInput);
  checks.research_depth.ok = checks.research_depth.failures.length === 0;

  checks.channel_fit.failures = checkChannelFit(pack, full, ch, ctx, evalInput);
  checks.channel_fit.ok = checks.channel_fit.failures.length === 0;

  checks.emoji_policy.failures = checkEmojiPolicy(pack, full, ch, ctx, evalInput);
  checks.emoji_policy.ok = checks.emoji_policy.failures.length === 0;

  checks.human_review.failures = checkHumanReview(pack, ch, ctx, evalInput);
  checks.human_review.ok = checks.human_review.failures.length === 0;

  if (ch === "blog") {
    const cqFailures = (checks.human_review.failures || []).filter(
      (f) => f.type === "content_quality"
    );
    checks.content_quality.failures = cqFailures;
    checks.content_quality.ok = cqFailures.length === 0;
  } else {
    checks.content_quality.skipped = true;
  }

  const allFailures = Object.values(checks).flatMap((c) => c.failures || []);
  const failReasons = [...new Set(allFailures.map((f) => f.type))];

  return {
    ok: failReasons.length === 0,
    channel: ch,
    checks,
    failures: allFailures,
    failReasons,
    charCount: ch === "blog" ? lengthResult.chars : full.replace(/\s/g, "").length,
  };
}

/**
 * 자동 보정 — 메타 제거·업종 오염·반복·에디터 품질
 */
export function applyBetaTestGuardCorrections(pack, channel = "blog", ctx = {}, input = {}) {
  if (!pack) return pack;
  const ch = normalizeChannel(channel);
  const evalInput = input || ctx.input || ctx;
  let next = { ...pack };

  next = purgeCrossIndustryMismatch(next, evalInput, ch);

  if (ch === "blog") {
    const purged = purgeIndustryAndAiSentences(next, { ...ctx, input: evalInput });
    next = purged.pack;
    next = sanitizeBlogPackMetaLayer(next);
    next = applyEditorQualityPack(next, ctx, evalInput);
    const dupCtx = { ...ctx, input: evalInput };
    next = applyDuplicateKiller(next, dupCtx, ch);
    next = stripTitleEchoParagraphs(next);
    next = stripGlobalExactDuplicateSentences(next);
    next = normalizeBlogLengthAndStructure(next, ctx, evalInput).pack;
    next = fixMechanicalTitleInPack(next, ch, ctx, evalInput);
    next = {
      ...next,
      sections: (next.sections || []).map((sec) => ({
        ...sec,
        heading: stripMetaLayerTerms(sec.heading),
        body: stripMetaLayerTerms(sec.body),
      })),
      conclusion: stripMetaLayerTerms(next.conclusion),
      title: stripMetaLayerTerms(next.title),
      representativeTitle: stripMetaLayerTerms(
        next.representativeTitle || next.title
      ),
    };
  } else if (ch === "place") {
    next = fixMechanicalTitleInPack(next, ch, ctx, evalInput);
    next = applyChannelMarketerPack(next, ch, { ...ctx, input: evalInput }, evalInput);
    next = applyEmojiEngine(next, { ...ctx, input: evalInput }, ch);
    next = {
      ...next,
      title: stripMetaLayerTerms(next.title),
      shortNotice: stripMetaLayerTerms(next.shortNotice),
      shortBody: stripMetaLayerTerms(next.shortBody),
      detailBody: stripMetaLayerTerms(next.detailBody),
      body: stripMetaLayerTerms(next.body),
    };
    next = purgeCrossIndustryMismatch(next, evalInput, ch);
  } else if (ch === "instagram") {
    next = fixMechanicalTitleInPack(next, ch, ctx, evalInput);
    next = applyChannelMarketerPack(next, ch, { ...ctx, input: evalInput }, evalInput);
    next = applyEmojiEngine(next, { ...ctx, input: evalInput }, ch);
    next = {
      ...next,
      hook: stripMetaLayerTerms(next.hook),
      body: stripMetaLayerTerms(next.body),
      ending: stripMetaLayerTerms(next.ending),
      lineBreakBody: stripMetaLayerTerms(next.lineBreakBody),
    };
    next = purgeCrossIndustryMismatch(next, evalInput, ch);
  }

  next = fixMechanicalTitleInPack(next, ch, ctx, evalInput);

  if (ch === "blog" && pack.sections?.length) {
    const dupCtx = { ...ctx, input: evalInput };
    next = purgeCrossIndustryMismatch(next, evalInput, ch);
    const finalPurge = purgeIndustryAndAiSentences(next, { ...ctx, input: evalInput });
    next = finalPurge.pack;
    next = applyDuplicateKiller(next, dupCtx, ch);
    next = stripTitleEchoParagraphs(next);
    next = stripGlobalExactDuplicateSentences(next);
    next = applyDuplicateKiller(next, dupCtx, ch);
    if (evalInput.blogLengthTier) {
      const tier = resolveBlogLengthTier(evalInput.blogLengthTier);
      next = purgeCrossIndustryMismatch(next, evalInput, ch);
      next = normalizeBlogLengthAndStructure(next, ctx, evalInput).pack;
      if (countBlogBodyCharsWithSpaces(next) < tier.min) {
        next = deepenMissionProseToMin(next, tier.min + 60, {
          ...ctx,
          input: evalInput,
        });
        next = normalizeBlogLengthAndStructure(next, ctx, evalInput).pack;
      }
      next = applyDuplicateKiller(next, dupCtx, ch);
      next = stripTitleEchoParagraphs(next);
      next = stripGlobalExactDuplicateSentences(next);
      next = applyDuplicateKiller(next, dupCtx, ch);
      if (countBlogBodyCharsWithSpaces(next) < tier.min) {
        next = deepenMissionProseToMin(next, tier.min, { ...ctx, input: evalInput });
      }
    }
  } else if (ch === "place" || ch === "instagram") {
    next = purgeCrossIndustryMismatch(next, evalInput, ch);
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      betaTestGuardCorrected: true,
    },
  };
}

export function assertBetaTestGuard(pack, channel = "blog", ctx = {}, input = {}) {
  const detection = detectBetaTestGuardFailures(pack, channel, ctx, input);
  return {
    ...detection,
    stage: "beta_test_guard",
    userMessage: detection.ok ? null : BETA_GUARD_USER_MESSAGE,
    passOutput: detection.ok,
  };
}

export function requiresBetaTestGuard(input = {}) {
  if (input.betaTestGuardEnforced === false) return false;
  if (input.channelDeriveExempt === true) return false;
  return (
    input.betaTestGuardEnforced === true ||
    input.v2PipelineEnforced === true ||
    input.v3EngineEnforced === true
  );
}

/**
 * 보정 1회 후 재검수
 */
export function assertBetaTestGuardWithCorrection(
  pack,
  channel = "blog",
  ctx = {},
  input = {},
  maxPasses = 3
) {
  let next = pack;
  let gate = assertBetaTestGuard(next, channel, ctx, input);
  for (let pass = 0; pass < maxPasses && !gate.ok; pass += 1) {
    next = applyBetaTestGuardCorrections(next, channel, ctx, input);
    gate = assertBetaTestGuard(next, channel, ctx, input);
  }
  return {
    ...gate,
    pack: next,
    corrected: Boolean(gate.ok || next !== pack),
    correctionPasses: maxPasses,
  };
}

/** UI·로그용 실패 요약 */
export function summarizeBetaGuardFailures(gate = {}) {
  const failed = Object.entries(gate.checks || {})
    .filter(([, v]) => v && v.ok === false)
    .map(([id, v]) => ({
      id,
      label: BETA_GUARD_CHECKS.find((c) => c.id === id)?.label || id,
      count: (v.failures || []).length,
    }));
  return failed;
}

export const BETA_GUARD_EDITOR_BRIEF = MASTER_QUALITY_GUARD_BRIEF;
