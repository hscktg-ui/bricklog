/**
 * Read-Aloud Human Gate — 「20년차 파워블로거·브랜드 에디터가 쓴 것 같나?」
 * 점수가 아니라 읽기 테스트로 송출 여부 결정
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { assessTemplateBoilerplateSpam } from "@/lib/content/templateBoilerplateEngine";
import { scoreRegionBrandMash } from "@/lib/content/regionBrandMashRepair";
import { assessColumnVisitNorthStar } from "@/lib/product/columnVisitNorthStar";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { scoreExperienceVoice } from "@/lib/content/experienceVoiceProfile";
import { detectTruncatedObjectParticleErrors } from "@/lib/product/briclogResetQualityGate";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";

export const READ_ALOUD_GATE_VERSION = "read-aloud-human-v1";

const CHECKLIST_MAX = 42;
const EXPERIENCE_MIN = 52;

const POWER_BLOGGER_BAN = [
  /기준이\s*달라집니다/,
  /안내\s*기준으로\s*정리했어요/,
  /비교해\s*보니\s*기준이\s*보였/,
  /정리해\s*보았습니다/,
  /좋은\s*선택이\s*될\s*수\s*있습니다/,
  /종합적으로\s*보면/,
  /많은\s*분들이/,
  /도움이\s*되시길/,
];

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessReadAloudHumanGate(pack, input = {}) {
  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack?.sections?.length || 0;
  const reasons = [];

  if (!full || chars < 400) reasons.push("too_short");
  if (sections < 3) reasons.push("sections_low");

  const placeholder = countPlaceholderContamination(full);
  if (placeholder.total > 0) reasons.push("placeholder");

  const truncated = detectTruncatedObjectParticleErrors(full);
  if (!truncated.ok) reasons.push(...truncated.reasons);

  const template = assessTemplateBoilerplateSpam(pack);
  if (!template.ok) reasons.push("template_boilerplate");

  const regionMash = scoreRegionBrandMash(full, input);
  if (!regionMash.ok) reasons.push("region_brand_mash");

  const northStar = assessColumnVisitNorthStar(pack, input);
  if (!northStar.spam.ok) reasons.push("engine_spam_draft");

  const ai = detectAiWritingPatterns(pack, input);
  if (!ai.ok) reasons.push("ai_pattern");

  if (hasDuplicateSentences(full, 14)) reasons.push("duplicate_sentences");

  for (const re of POWER_BLOGGER_BAN) {
    if (re.test(full)) {
      reasons.push("power_blogger_ban");
      break;
    }
  }

  const checklist = scoreChecklistVoice(full, pack);
  if (checklist.score > CHECKLIST_MAX) reasons.push("checklist_voice");

  const experience = scoreExperienceVoice(full);
  const experienceWeak = experience.score < EXPERIENCE_MIN;
  if (experienceWeak) reasons.push("experience_weak");

  const formalHits = (full.match(/\s+이다\./g) || []).length;
  const casualHits = (full.match(/[해했]어요\./g) || []).length;
  if (formalHits >= 3 && casualHits >= 3) reasons.push("voice_register_mix");

  const hardReasons = reasons.filter(
    (r) =>
      [
        "placeholder",
        "template_boilerplate",
        "region_brand_mash",
        "engine_spam_draft",
        "ai_pattern",
        "power_blogger_ban",
        "truncated_object_particle",
      ].includes(r) || String(r).startsWith("truncated")
  );

  const softPenalty =
    (experienceWeak ? 1 : 0) + (chars < 400 ? 1 : 0) + (sections < 3 ? 1 : 0);
  const score = Math.max(
    0,
    100 -
      hardReasons.length * 18 -
      softPenalty * 6 -
      (checklist.score > CHECKLIST_MAX ? 10 : 0)
  );

  return {
    ok: hardReasons.length === 0 && score >= 70 && chars >= 400 && sections >= 3,
    score,
    reasons: [...new Set(reasons)].slice(0, 10),
    hardReasons,
    shouldWithhold: hardReasons.length > 0 || score < 58,
    experienceScore: experience.score,
    checklistScore: checklist.score,
    version: READ_ALOUD_GATE_VERSION,
  };
}
