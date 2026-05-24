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
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBrandMentions } from "@/lib/constitution/writingConstitution";
import { countSceneMoments } from "@/lib/constitution/writingConstitution";

const PLACEHOLDER_RE =
  /\b(undefined|null|NaN|placeholder|TODO|FIXME|lorem)\b|\[브랜드\]|\[지역\]|\[키워드\]/i;

const JOSA_ERROR_RE = /[가-힣A-Za-z0-9]+는\(는\)|[가-힣A-Za-z0-9]+은\(는\)|[가-힣A-Za-z0-9]+이\(가\)/;

const AI_HEADING_RE =
  /^(왜\s|직접\s|선택\s|알아두|방문\s*전|이런\s*날|정리$|체크$)/;

export function runHardValidation(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const failures = [];

  if (PLACEHOLDER_RE.test(full)) failures.push("placeholder");
  if (JOSA_ERROR_RE.test(full)) failures.push("josa_error");
  if (hasDuplicateSentences(full, 14)) failures.push("duplicate_sentence");
  if (hasMechanicalKeywordPattern(full)) failures.push("keyword_listing");

  const sanitize = detectBlogSanitizeIssues(pack, ctx);
  if (!sanitize.ok) failures.push(...sanitize.issues.map((i) => `sanitize_${i}`));

  const industry = detectIndustryCrossContamination(
    full,
    ctx.pipeline?.industryLock || ctx.industryKey
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

  for (const sec of pack?.sections || []) {
    if (isBannedHeading(sec.heading) || AI_HEADING_RE.test(sec.heading || "")) {
      failures.push("ai_heading");
      break;
    }
  }

  const noCopy = detectNoCopyViolations(pack, ctx.brandResearch);
  if (!noCopy.ok) failures.push("no_copy_violation");

  const charCount = countBlogBodyChars(pack);
  const lengthTier = resolveBlogLengthTier(
    ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium"
  );
  if (charCount < lengthTier.min) failures.push("length_under_min");

  if (ctx.brandName && countBrandMentions(full, ctx.brandName) < 2) {
    failures.push("brand_missing");
  }

  if (countSceneMoments(full) < 2) failures.push("scenes_insufficient");

  return {
    ok: failures.length === 0,
    failures: [...new Set(failures)],
    industry,
    persona,
    titleAlign,
    sanitize,
    rawLeak,
  };
}
