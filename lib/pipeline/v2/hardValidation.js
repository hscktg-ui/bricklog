/**
 * STEP 10 — Hard Validation (실패 시 출력 금지)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { detectBlogSanitizeIssues } from "@/lib/integrity/blogSanitizer";
import { isBannedHeading } from "@/lib/constitution/writingConstitution";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { containsRawInputLeak } from "./contextDiscovery";
import { detectIndustryCrossContamination } from "./industryLock";
import { validateTitleBodyAlignment, validatePersonaVoice } from "@/lib/quality/contentQualityRoot";
import { validateTitleAnswersBody } from "./titleUnderstanding";
import { detectNoCopyViolations } from "@/lib/ultimate/noCopyPolicy";
import {
  countBlogBodyCharsWithSpaces,
} from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBrandMentions } from "@/lib/constitution/writingConstitution";
import { countSceneMoments } from "@/lib/constitution/writingConstitution";
import { resolveLockedIndustryKey } from "@/lib/product/industryContaminationEngine";
import { resolveEditorColumnMinChars } from "@/lib/product/professionalEditorGradeEngine";

const PLACEHOLDER_RE =
  /\b(undefined|null|NaN|placeholder|TODO|FIXME|lorem)\b|\[브랜드\]|\[지역\]|\[키워드\]/i;

const JOSA_ERROR_RE = /[가-힣A-Za-z0-9]+는\(는\)|[가-힣A-Za-z0-9]+은\(는\)|[가-힣A-Za-z0-9]+이\(가\)/;

const AI_HEADING_RE =
  /^(왜\s|직접\s|선택\s|알아두|방문\s*전|이런\s*날|정리$|체크$)/;
const CLICHE_SCENE_RE =
  /(퇴근길에\s*문득|주말\s*아침|테이블\s*위|기념일을\s*깜빡)/;
const FICTIONAL_PERSONA_RE =
  /([가-힣]{2,12}의\s*(여행|요리|작가|블로거)|서울의\s*여행\s*블로거|부산의\s*요리\s*블로거|제주의\s*작가)/;
const BUSINESS_EMOTION_RE =
  /(따뜻한\s*봄날|커피\s*한\s*잔|창밖\s*바람|창밖을\s*바라보|설레는\s*마음|새로운\s*시작|여러분의\s*이야기|따뜻한\s*분위기|새로운\s*경험|소중한\s*이야기)/;
const SEASONAL_DRIFT_RE =
  /(봄의\s*기운|봄이\s*오고|봄날|봄\s*시즌|여름\s*휴가|가을\s*감성|연말\s*분위기)/;

const BRICLOG_REQUIRED = [
  "브랜드 메모리",
  "브랜드 기억",
  "콘텐츠 축적",
  "브랜드 일관성",
  "브랜드 맥락",
  "SEO는 결과",
];

function runIntentContractValidation(full = "", ctx = {}) {
  const contract = ctx.intentContract || ctx.input?._intentContract || null;
  if (!contract) return [];
  const fails = [];
  const mustInclude = Array.isArray(contract.mustInclude) ? contract.mustInclude : [];
  const requiredFlow = Array.isArray(contract.requiredFlowKeywords)
    ? contract.requiredFlowKeywords
    : [];
  const banned = Array.isArray(contract.bannedGenericPhrases)
    ? contract.bannedGenericPhrases
    : [];

  const includeHits = mustInclude.filter((k) => k && full.includes(k));
  if (mustInclude.length >= 2 && includeHits.length < Math.ceil(mustInclude.length * 0.5)) {
    fails.push("intent_contract_must_include_missing");
  }

  const flowHits = requiredFlow.filter((k) => k && full.includes(k));
  if (requiredFlow.length >= 3 && flowHits.length < 3) {
    fails.push("intent_contract_flow_missing");
  }

  if (contract.businessFirst) {
    const bannedHit = banned.find((p) => p && full.includes(p));
    if (bannedHit) fails.push("intent_contract_generic_phrase");
  }

  return fails;
}

function isBusinessStrictContext(ctx = {}) {
  const raw = `${ctx.input?.industry || ""} ${ctx.industryLabel || ""} ${
    ctx.industryKey || ""
  } ${ctx.input?.purpose || ""} ${ctx.input?.contentObjective || ""} ${
    ctx.input?.tone || ""
  }`.toLowerCase();
  return /saas|ai|platform|플랫폼|academy|교육|마케팅|브랜드|info|informative/.test(
    raw
  );
}

function shouldAllowSeasonalNarrative(ctx = {}) {
  const raw = `${ctx.input?.purpose || ""} ${ctx.input?.contentObjective || ""} ${
    ctx.input?.tone || ""
  } ${ctx.metaStrategy?.purpose || ""} ${ctx.metaStrategy?.tone || ""}`.toLowerCase();
  if (/season|시즌/.test(raw)) return true;
  if (/emotional|감성/.test(raw)) return true;
  return false;
}

function isBriclogArticle(ctx = {}, full = "") {
  return (
    String(ctx.brandName || "").includes("브릭로그") ||
    String(ctx.input?.brandName || "").includes("브릭로그") ||
    full.includes("브릭로그")
  );
}

export function runHardValidation(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const failures = [];

  if (PLACEHOLDER_RE.test(full)) failures.push("placeholder");
  if (JOSA_ERROR_RE.test(full)) failures.push("josa_error");
  if (hasDuplicateSentences(full, 14)) failures.push("duplicate_sentence");
  if (hasMechanicalKeywordPattern(full)) failures.push("keyword_listing");

  const sanitize = detectBlogSanitizeIssues(pack, ctx);
  if (!sanitize.ok) {
    failures.push(
      ...sanitize.issues.map((i) =>
        `sanitize_${typeof i === "object" && i?.type ? i.type : String(i)}`
      )
    );
  }

  const industry = detectIndustryCrossContamination(
    full,
    resolveLockedIndustryKey(ctx.input || ctx)
  );
  if (!industry.ok) failures.push("industry_cross");

  const persona = validatePersonaVoice(pack, ctx.contentPersona);
  if (!persona.ok) failures.push("persona_mix");

  const titleAlign = validateTitleBodyAlignment(pack, ctx);
  if (!titleAlign.ok) failures.push("title_not_reflected");

  const titleQ = validateTitleAnswersBody(pack, ctx);
  if (!titleQ.ok) failures.push("title_question_unanswered");

  const rawLeak = containsRawInputLeak(full, ctx.rawFragments || []);
  if (rawLeak.leak) failures.push("raw_input_leak");
  if (CLICHE_SCENE_RE.test(full)) failures.push("emotion_cliche");
  if (isBusinessStrictContext(ctx) && BUSINESS_EMOTION_RE.test(full)) {
    failures.push("business_emotion_cliche");
  }
  if (FICTIONAL_PERSONA_RE.test(full)) failures.push("fictional_persona");
  if (!shouldAllowSeasonalNarrative(ctx) && SEASONAL_DRIFT_RE.test(full)) {
    failures.push("seasonal_drift");
  }
  failures.push(...runIntentContractValidation(full, ctx));

  if (isBriclogArticle(ctx, full)) {
    const requiredHits = BRICLOG_REQUIRED.filter((k) => full.includes(k));
    if (requiredHits.length < 4) failures.push("briclog_philosophy_missing");
    if (!/기존\s*ai|ai\s*글/.test(full)) failures.push("briclog_ai_limit_missing");
    if (!/브랜드\s*방향성|브랜드\s*말투|반복/.test(full)) {
      failures.push("briclog_consistency_missing");
    }
  }

  for (const sec of pack?.sections || []) {
    if (isBannedHeading(sec.heading) || AI_HEADING_RE.test(sec.heading || "")) {
      failures.push("ai_heading");
      break;
    }
  }

  const noCopy = detectNoCopyViolations(pack, ctx.brandResearch);
  if (!noCopy.ok) failures.push("no_copy_violation");

  const charCount = countBlogBodyCharsWithSpaces(pack);
  const lengthTier = resolveBlogLengthTier(
    ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium"
  );
  const editorColumnPack =
    pack?._meta?.industryHumanColumnEditorial ||
    pack?._meta?.flowerRecommendationEditorial ||
    pack?._meta?.missionProseFallback ||
    pack?._meta?.missionCatalogDelivery;
  const lengthMin = editorColumnPack
    ? resolveEditorColumnMinChars(ctx.input || ctx)
    : lengthTier.min;
  if (charCount < lengthMin) failures.push("length_under_min");
  if (!editorColumnPack && charCount > lengthTier.max) failures.push("length_over_max");

  const purposeRaw = String(
    ctx.input?.contentObjective || ctx.input?.purpose || ""
  ).toLowerCase();
  if (/brand|브랜드/.test(purposeRaw)) {
    const required = ["브랜드", "일관성", "철학"];
    const hit = required.filter((k) => full.includes(k));
    if (hit.length < 2) failures.push("purpose_not_satisfied");
  }

  if (ctx.brandName && countBrandMentions(full, ctx.brandName) < 2) {
    failures.push("brand_missing");
  }

  const skipSceneGate =
    editorColumnPack ||
    String(ctx.input?.v4Speaker || ctx.v4Speaker || "").trim() === "brand_intro";
  if (!skipSceneGate && countSceneMoments(full) < 2) {
    failures.push("scenes_insufficient");
  }

  return {
    ok: failures.length === 0,
    failures: [...new Set(failures)],
    industry,
    persona,
    titleAlign,
    sanitize,
    rawLeak,
    charCount,
    charCountWithSpaces: charCount,
  };
}
