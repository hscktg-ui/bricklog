/**
 * STEP 1 — Intent Detection (하나 확정 전 생성 금지)
 */
import { resolveWritingContract } from "@/lib/content/writingContract";
export const CONTENT_INTENTS = {
  brand_intro: "브랜드 소개",
  product_intro: "상품 소개",
  event_notice: "행사 안내",
  visit_review: "후기 작성",
  local_recommend: "지역 추천",
  info: "정보형",
  compare: "비교형",
  guide: "가이드형",
};

export function detectContentIntent(profile = {}, ctx = {}) {
  const merged = {
    ...ctx,
    ...profile,
    topic: profile.topic || ctx.topic,
    brandName: profile.brandName || ctx.brandName,
    region: profile.region || ctx.region,
    mainKeyword: profile.mainKeyword || profile.topic || ctx.mainKeyword,
    includePhrases:
      profile.includeList?.join(", ") || profile.includePhrases || ctx.includePhrases,
    purpose: profile.purposeType || profile.purpose || ctx.purpose,
    purposeType: profile.purposeType || ctx.purposeType,
    contentObjective: ctx.contentObjective || profile.contentObjective,
    industry: profile.industry || ctx.industry,
    contentPersona: profile.contentPersona || ctx.contentPersona,
    contentPersonaSubtype:
      profile.contentPersonaSubtype || ctx.contentPersonaSubtype,
  };

  const contract = resolveWritingContract(merged);
  const intent = contract.intent;

  return {
    locked: intent,
    label: CONTENT_INTENTS[intent] || contract.label,
    userIntent: contract.userIntent,
    readerOutcome: contract.readerGain,
    thesis: contract.thesis,
    ok: !!intent,
    writingContract: contract,
  };
}
