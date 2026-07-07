/**
 * North Star KPI — 붙여넣기 준비도 · 월간 운영 계획 기여
 * @see docs/COUNCIL_BRIEF.md
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { resolveWritingContract } from "@/lib/content/writingContract";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { assessBlogApiDeliveryWithhold } from "@/lib/product/blogApiDeliveryGate";
import { enforceCustomerBlogOutput } from "@/lib/product/brandContentCustomerGate";
import { COUNCIL_MISSION_VISIT_RE } from "@/lib/council/councilBriefCases.js";

export const NORTH_STAR_KPI_VERSION = "north-star-kpi-v1";

const PASTE_BLOCK_RE = [
  /placeholder|undefined|null/i,
  /이용\.{0,3}$|좋은내용/,
  /SEO는\s*결과이며,\s*본문은\s*브랜드\s*맥락/,
];

function hasVisitLeakInPack(pack, input = {}) {
  const contract = resolveWritingContract(input);
  if (contract.visitToneAllowed) return false;
  const full = getBlogFullText(pack);
  return COUNCIL_MISSION_VISIT_RE.test(full);
}

/**
 * 생성 전 — 운영 계획·입력·글 유형 계약
 */
export function assessPreGenerationNorthStar(input = {}) {
  const contract = resolveWritingContract(input);
  const plan = buildContentOperatingPlan(input);
  const brand = String(input.brandName || "").trim();
  const topic = String(input.topic || "").trim();

  const monthlyPlanReady =
    plan.whatToWrite?.length >= 3 &&
    plan.whyWrite?.length >= 2 &&
    Boolean(plan.operatingHeadline);
  const inputReady = brand.length >= 2 && topic.length >= 4;
  const contractReady = Boolean(contract.type && contract.readerGain);

  const score =
    (monthlyPlanReady ? 40 : 0) +
    (inputReady ? 30 : 0) +
    (contractReady ? 30 : 0);

  return {
    version: NORTH_STAR_KPI_VERSION,
    phase: "pre_generation",
    score,
    pass: score >= 70,
    monthlyPlanReady,
    inputReady,
    contractReady,
    contractType: contract.type,
    contractLabel: contract.label,
    readerGain: contract.readerGain,
    planHeadline: plan.operatingHeadline,
    channelSteps: (plan.whatToWrite || []).map((w) => w.channel),
  };
}

/**
 * 생성 후 — 붙여넣기·송출 가능 (Launch North Star)
 */
export function assessPasteReadyNorthStar(pack, input = {}) {
  const contract = resolveWritingContract(input);
  const gated = enforceCustomerBlogOutput(pack, input);
  const body = gated.pack || pack;
  const api = assessBlogApiDeliveryWithhold(
    { blogContent: body, mode: "llm" },
    input
  );
  const full = getBlogFullText(body);
  const sections = body?.sections?.length || 0;
  const metaReady =
    body?._meta?.publishReady === true || body?._meta?.sqv?.publishReady === true;
  const noPasteBlock = !PASTE_BLOCK_RE.some((re) => re.test(full));
  const visitOk = !hasVisitLeakInPack(body, input);
  const lengthOk = full.replace(/\s/g, "").length >= 280 && sections >= 2;

  const pasteReady =
    gated.ok &&
    !api.withhold &&
    metaReady &&
    noPasteBlock &&
    visitOk &&
    lengthOk;

  return {
    version: NORTH_STAR_KPI_VERSION,
    phase: "post_generation",
    pasteReady,
    publishReady: metaReady,
    withheld: api.withhold,
    sections,
    chars: full.length,
    visitLeak: !visitOk,
    contractType: contract.type,
    failReasons: [
      !gated.ok && "customer_gate",
      api.withhold && "api_withhold",
      !metaReady && "publish_ready",
      !noPasteBlock && "paste_block",
      !visitOk && "visit_leak",
      !lengthOk && "length",
    ].filter(Boolean),
  };
}

export function assessNorthStarDelivery(input = {}, pack = null) {
  const pre = assessPreGenerationNorthStar(input);
  if (!pack) return { ...pre, pasteReady: null };
  const post = assessPasteReadyNorthStar(pack, input);
  return {
    ...pre,
    ...post,
    pass: pre.pass && post.pasteReady,
  };
}
