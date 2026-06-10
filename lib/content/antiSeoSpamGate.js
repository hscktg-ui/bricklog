/**
 * ANTI SEO SPAM — 본문 키워드 반복 완화 (Mission ON)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  ANTI_SEO_SPAM_PRONOUNS,
  isAntiSeoSpamEnforced,
  resolveAntiSeoTopicPronouns,
  scoreAntiSeoSpam,
  softenTokenRepeats,
} from "@/lib/product/antiSeoSpamEngine";

function softenPackText(text, input) {
  let next = String(text || "");
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (brand) {
    next = softenTokenRepeats(next, brand, ANTI_SEO_SPAM_PRONOUNS.brand);
  }
  if (region) {
    next = softenTokenRepeats(next, region, ANTI_SEO_SPAM_PRONOUNS.region);
  }
  if (topic && topic !== brand) {
    next = softenTokenRepeats(next, topic, resolveAntiSeoTopicPronouns(input));
  }
  return next;
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyAntiSeoSpamGate(pack, ctx = {}) {
  if (!isAntiSeoSpamEnforced() || !pack) return pack;
  const input = ctx.input || ctx;
  const fullBefore = getBlogFullText(pack);
  const scoreBefore = scoreAntiSeoSpam(fullBefore, input);
  if (scoreBefore.ok) return pack;

  let next = { ...pack };
  if (next.title) next.title = softenPackText(next.title, input);
  if (next.representativeTitle) {
    next.representativeTitle = softenPackText(next.representativeTitle, input);
  }
  if (next.conclusion) next.conclusion = softenPackText(next.conclusion, input);
  if (Array.isArray(next.sections)) {
    next.sections = next.sections.map((s) => ({
      ...s,
      heading: s?.heading ? softenPackText(s.heading, input) : s?.heading,
      body: s?.body ? softenPackText(s.body, input) : s?.body,
    }));
  }

  const fullAfter = getBlogFullText(next);
  const scoreAfter = scoreAntiSeoSpam(fullAfter, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      antiSeoSpamGate: {
        before: scoreBefore.overused,
        after: scoreAfter.overused,
        ok: scoreAfter.ok,
      },
    },
  };
}

export { scoreAntiSeoSpam };
