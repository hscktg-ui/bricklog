/**
 * 실패글 패턴 SSOT — 시드 + 관리자 등록(sample_kind: failure)
 */
import { GOLDEN_FAILURE_SAMPLES } from "@/lib/golden/goldenFailureSeed";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

function normalizeFailureSample(s = {}) {
  return {
    id: s.id || `failure:${s.title}`,
    industry: s.industry || "etc",
    fail_reason: s.fail_reason || s.search_intent || "custom_failure",
    title: s.title || "",
    content: s.content || "",
    sample_kind: "failure",
  };
}

/**
 * @param {string} [industryKey]
 * @param {object} [input]
 */
export function resolveFailurePatternsForIndustry(industryKey, input = {}) {
  const key = industryKey || resolveGoldenIndustryKey(input);
  const extras = [];

  for (const s of input.goldenSamples || input.failureSamples || []) {
    if (s.sample_kind !== "failure" && !s.fail_reason) continue;
    if (s.industry && s.industry !== key) continue;
    if (!s.content) continue;
    extras.push(normalizeFailureSample(s));
  }

  const map = new Map();
  for (const s of [...GOLDEN_FAILURE_SAMPLES, ...extras]) {
    if (s.industry !== key) continue;
    map.set(s.id, normalizeFailureSample(s));
  }
  return [...map.values()];
}

/**
 * 생성문이 등록된 실패글 패턴과 유사한지
 * @param {string} text
 * @param {object} sample
 */
export function matchesFailureSamplePattern(text = "", sample = {}) {
  const body = String(sample.content || "");
  if (!body || body.length < 12) return false;

  if (sample.fail_reason === "placeholder") {
    return /좋은내용|브랜드명|지역명|중립적으로\s*정리|비교가\s*수월/.test(text);
  }
  if (sample.fail_reason === "voice_mix") {
    return /안녕하세요|알아보겠습니다/.test(text) && /습니다/.test(text) && /해요|뒀어요/.test(text);
  }
  if (sample.fail_reason === "industry_mix" && sample.industry === "flower_shop") {
    return /알레르기|원재료|성분표/.test(text);
  }

  const chunks = body.match(/[\uac00-\ud7a3]{4,}/g) || [];
  const distinctive = [...new Set(chunks)].filter((c) => c.length >= 4).slice(0, 12);
  const hit = distinctive.filter((c) => text.includes(c)).length;
  return hit >= Math.min(3, Math.max(2, Math.ceil(distinctive.length * 0.25)));
}
