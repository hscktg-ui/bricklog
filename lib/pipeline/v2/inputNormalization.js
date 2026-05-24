/**
 * STEP 0 — Input Normalization
 * 사용자 입력은 재료. 그대로 제목·본문·문장으로 쓰지 않음.
 */
import { sanitizeBlogInput, isJunkValue } from "@/utils/sanitizeInput";
import { discoverContext } from "./contextDiscovery";

function isConversationalRaw(text) {
  return /우리는|입니다|이야$|예요|거야|대행사야/.test(String(text || ""));
}

function resolveWritingSubject(profile, rawFragments = []) {
  const parts = [
    profile.region,
    profile.industryLabel,
    profile.brandName,
    profile.mainKeyword,
  ].filter(Boolean);

  const structured = parts.length ? parts.join(" ") : null;

  const topic = profile.topic;
  if (topic && !isConversationalRaw(topic) && !rawFragments.includes(topic)) {
    return topic;
  }
  if (structured) return structured;
  if (topic && topic.length >= 4 && topic.length <= 24) return topic;
  return null;
}

export function normalizePipelineInput(ctx = {}) {
  const raw = sanitizeBlogInput({
    brandName: ctx.brandName,
    region: ctx.region,
    industry: ctx.industryKey || ctx.industry,
    mainKeyword: ctx.main || ctx.mainKeyword,
    subKeyword: ctx.subLine || ctx.subList?.join(", "),
    includePhrases: ctx.includePhrases,
    excludePhrases: ctx.excludePhrases,
    storeFeatures: ctx.storeFeatures,
    benefit: ctx.benefit,
    purpose: ctx.purposeType,
    topic: ctx.topic,
  });

  const discovery = discoverContext({
    ...ctx,
    brandName: raw.brandName || ctx.brandName,
    region: raw.region || ctx.region,
    industry: raw.industry || ctx.industryKey,
    mainKeyword: raw.mainKeyword,
    topic: ctx.topic,
    includePhrases: raw.includeList?.join(", ") || ctx.includePhrases,
    storeFeatures: raw.storeFeatures,
    brandDescription: raw.brandDescription,
    benefit: raw.benefit,
    purposeType: ctx.purposeType,
  });

  const d = discovery.discovered;

  const profile = {
    brandName: d.brandName || null,
    region: d.region || null,
    industryKey: d.industryKey || ctx.industryKey || null,
    industryLabel: d.industryLabel || ctx.industryLabel || null,
    topic: d.topic || null,
    mainKeyword: d.mainKeyword || null,
    product: d.product || null,
    service: d.service || null,
    event: d.event || null,
    season: d.season || null,
    emotion: d.emotion || null,
    purposeType: raw.purpose || ctx.purposeType || null,
    includeList: raw.includeList || [],
    excludeList: raw.excludeList || [],
    storeFeatures: d.storeFeatures || null,
    brandDescription: d.brandDescription || null,
    benefit: d.benefit || null,
    subList: raw.subKeywords?.length
      ? raw.subKeywords
      : (ctx.subList || []).filter((s) => !isJunkValue(s)),
  };

  let writingSubject = resolveWritingSubject(profile, discovery.rawFragments);
  if (!writingSubject && discovery.hasMinimumSignal) {
    writingSubject =
      profile.topic ||
      profile.mainKeyword ||
      [profile.region, profile.brandName].filter(Boolean).join(" ") ||
      null;
  }

  return {
    profile,
    discovery,
    writingSubject,
    rawFragments: discovery.rawFragments,
    structured: true,
    ready: discovery.hasMinimumSignal && !!writingSubject,
  };
}
