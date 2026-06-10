/**
 * 고객 관점 품질 평가 — 독자가 「읽고 판단할 수 있는가」
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { analyzeSearchIntent } from "@/lib/product/briclogResearchFirstPipeline";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";

export const CUSTOMER_PERSPECTIVE_VERSION = "customer-v1";

const SITUATION_MARKERS =
  /찾는\s*분|고민|처음|방문|예약|선물|모임|가족|직장|상담|비교|고를|선택|맞추|준비|문의|픽업|체험|앉아|누워|급여|반려|견종|아이|수업|여행|체크인/;

const ACTION_MARKERS =
  /확인|문의|예약|전화|방문\s*전|미리|준비|비교|고려|살펴|체크|피크|대기|주차|영업\s*시간|가격|구성|특징|이유|때문|장점|단점|관리|보관/;

const BROCHURE_ONLY_RES = [
  /달라질\s*수\s*있어요\.?\s*$/,
  /매장마다\s*다릅니다\.?\s*$/,
  /확인해\s*보시면\s*좋습니다\.?\s*$/,
];

const VISIT_FICTION_RES =
  /솔직\s*후기|다녀온\s*후기|직접\s*다녀|들어가\s*보니|누워\s*보니|메모해\s*뒀/;

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessCustomerPerspective(pack, input = {}) {
  const full = getBlogFullText(pack);
  const sentences = splitKoreanSentences(full).filter((s) => s.replace(/\s/g, "").length >= 12);
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const brand = String(input.brandName || "").trim();
  const tier = resolveBlogLengthTier(input.blogLengthTier || "short");
  const chars = countBlogBodyCharsWithSpaces(pack);

  const intent = analyzeSearchIntent(input);
  const topicHit =
    topic.length >= 2 &&
    (full.includes(topic.slice(0, Math.min(8, topic.length))) ||
      topic.split(/\s+/).filter((w) => w.length >= 2).some((w) => full.includes(w)));

  const situationCount = sentences.filter((s) => SITUATION_MARKERS.test(s)).length;
  const actionCount = sentences.filter((s) => ACTION_MARKERS.test(s)).length;
  const brochureOnly = sentences.filter((s) =>
    BROCHURE_ONLY_RES.some((re) => re.test(s))
  ).length;
  const visitFiction =
    input.purposeType !== "visit" &&
    !/후기|다녀|체험\s*후기/.test(topic) &&
    VISIT_FICTION_RES.test(full);

  const checks = {
    topicAddressed: topicHit,
    searchIntentClear: Boolean(intent.primary && intent.readerOutcome),
    customerSituation: situationCount >= 2 || situationCount / Math.max(sentences.length, 1) >= 0.2,
    actionableDetail: actionCount >= 3,
    brandPresent: brand.length < 2 || full.includes(brand.slice(0, Math.min(4, brand.length))),
    notBrochureOnly: brochureOnly <= 1,
    noVisitFictionLeak: !visitFiction,
    enoughSections: (pack?.sections?.length || 0) >= 3,
    lengthAdequate: chars >= Math.min(tier.min * 0.22, 480),
  };

  const passCount = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passCount / Object.keys(checks).length) * 100);

  return {
    version: CUSTOMER_PERSPECTIVE_VERSION,
    score,
    pass: score >= 75 && checks.topicAddressed && checks.noVisitFictionLeak,
    checks,
    metrics: {
      chars,
      sentences: sentences.length,
      situationCount,
      actionCount,
      readerOutcome: intent.readerOutcome,
      userIntent: intent.userIntent,
    },
  };
}
