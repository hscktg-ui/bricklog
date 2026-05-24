/**
 * STEP 22 — Final Self Review (Ultimate)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { evaluateWritingConstitution } from "@/lib/constitution/writingConstitution";
import { validateTitleAnswersBody } from "@/lib/pipeline/v2/titleUnderstanding";
import { validatePersonaVoice } from "@/lib/quality/contentQualityRoot";
import { countBrandMentions } from "@/lib/constitution/writingConstitution";

const CHECKS = [
  { id: "title_link", test: (p, c) => validateTitleAnswersBody(p, c).ok },
  { id: "brand_present", test: (p, c) => !c.brandName || countBrandMentions(getBlogFullText(p), c.brandName) >= 3 },
  { id: "persona", test: (p, c) => validatePersonaVoice(p, c.contentPersona).ok },
  { id: "scenes", test: (p, c) => evaluateWritingConstitution(p, c, "blog").checks.sceneMoments },
  { id: "emotion", test: (p, c) => evaluateWritingConstitution(p, c, "blog").checks.emotion },
  { id: "why", test: (p, c) => evaluateWritingConstitution(p, c, "blog").checks.why },
  { id: "no_repeat", test: (p, c) => evaluateWritingConstitution(p, c, "blog").checks.noRepeat },
  { id: "not_ad", test: (p, c) => evaluateWritingConstitution(p, c, "blog").checks.human },
  { id: "human_read", test: (p, c) => evaluateWritingConstitution(p, c, "blog").checks.noForbiddenOpen },
  { id: "length", test: (p) => countBlogBodyChars(p) >= BLOG_MIN_BODY_CHARS },
];

export function runFinalSelfReviewUltimate(pack, ctx = {}) {
  const results = CHECKS.map((ch) => ({
    id: ch.id,
    pass: !!ch.test(pack, ctx),
  }));
  const failures = results.filter((r) => !r.pass).map((r) => r.id);
  return {
    ok: failures.length === 0,
    failures,
    results,
    regen: failures.length > 0,
  };
}
