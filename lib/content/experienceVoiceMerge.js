/**
 * experience-voice + netizen-voice 프로필 병합
 */
import { NETIZEN_ROLE_ORDER } from "@/lib/channel/netizenVoiceLearner";

function normLineKey(line) {
  return String(line || "")
    .replace(/\s/g, "")
    .slice(0, 48);
}

function mergeBucket(existing = [], incoming = [], cap = 32) {
  const seen = new Set();
  const out = [];
  for (const item of [...incoming, ...existing]) {
    const line = typeof item === "string" ? item : item?.line || item?.phrase;
    if (!line) continue;
    const key = normLineKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(typeof item === "string" ? { line: item, count: 1, category: "merged" } : item);
    if (out.length >= cap) break;
  }
  return out;
}

export function mergeNetizenIntoExperienceProfile(expProfile = {}, netizenProfile = {}) {
  const roleBuckets = { ...(expProfile.roleBuckets || {}) };
  for (const role of NETIZEN_ROLE_ORDER) {
    roleBuckets[role] = mergeBucket(roleBuckets[role], netizenProfile.roleBuckets?.[role]);
  }

  const patternCounts = {
    ...(expProfile.patternCounts || {}),
    ...(netizenProfile.patternCounts || {}),
  };
  for (const k of Object.keys(patternCounts)) {
    if (netizenProfile.patternCounts?.[k]) {
      patternCounts[k] = (expProfile.patternCounts?.[k] || 0) + netizenProfile.patternCounts[k];
    }
  }

  const promptExamples = [
    ...(netizenProfile.promptExamples || []),
    ...(expProfile.promptExamples || []),
    ...(expProfile.learnedExamples || []),
  ]
    .filter(Boolean)
    .filter((line, i, arr) => arr.indexOf(line) === i)
    .slice(0, 14);

  const voiceMarkerHints = [
    ...(netizenProfile.voiceMarkerHints || []),
    ...(expProfile.voiceMarkerHints || []),
  ].filter((h, i, arr) => arr.indexOf(h) === i);

  return {
    ...expProfile,
    version: "v2",
    mergedAt: new Date().toISOString(),
    netizenSampleCount: netizenProfile.sampleCount || 0,
    netizenRates: netizenProfile.rates || {},
    roleBuckets,
    patternCounts,
    promptExamples,
    voiceMarkerHints,
    netizenPromptBlock: netizenProfile.promptBlock || "",
    sources: [
      expProfile.source,
      "netizen-voice-learning",
      ...(netizenProfile.sources || []),
    ].filter(Boolean),
  };
}
