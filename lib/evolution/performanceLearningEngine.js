/**
 * 성과 학습 — 복사·발행·저수정 신호를 다음 생성 브리프로 변환
 */
import { formatCommunitySignalBrief } from "@/lib/evolution/communitySignalEngine";

export const PERFORMANCE_LEARNING_VERSION = "v1";

function readGlobalRules(input = {}) {
  if (input.evolutionRules && typeof input.evolutionRules === "object") {
    return input.evolutionRules;
  }
  return {};
}

/**
 * @param {Record<string, unknown>} input
 */
export function buildPerformanceLearningBrief(input = {}) {
  const mem = input.brandMemory || {};
  const learning = mem.learning || {};
  const lines = [];

  if (mem.rewriteHints) lines.push(`브랜드 수정 힌트: ${mem.rewriteHints}`);
  if (learning.preferredLength) {
    lines.push(`선호 분량: ${learning.preferredLength}`);
  }
  if (learning.editCount >= 2) {
    lines.push("수정 이력 있음 — 정보 밀도·반복 차단 우선");
  }

  const prefs = mem.humanCorrectionPrefs || {};
  if (prefs.informational >= 75) lines.push("정보성 가중치 상승 (성과 학습)");
  if (prefs.repetitionGuard >= 80) lines.push("반복 차단 강화 (성과 학습)");
  if (prefs.adTone <= 30) lines.push("광고 톤 하향 (성과 학습)");

  const rules = readGlobalRules(input);
  const bans = rules.globalBannedPhrases || rules.autoBan || [];
  if (Array.isArray(bans) && bans.length) {
    lines.push(`전역 금지 패턴: ${bans.slice(0, 6).join(" · ")}`);
  }

  const communityBrief = input.communitySignalBrief || "";
  if (communityBrief) lines.push(communityBrief);

  if (!lines.length) return "";

  return ["【성과 학습】", ...lines.map((l) => `- ${l}`)].join("\n").slice(0, 1600);
}

/**
 * 주간 분석 결과를 생성 컨텍스트에 부착
 */
export function attachPerformanceLearningContext(input = {}, weekly = {}) {
  if (!weekly?.ok) return input;
  const communityBrief = formatCommunitySignalBrief(weekly.community);
  const improvementLines = (weekly.improvements || []).join(" · ");
  return {
    ...input,
    performanceLearning: weekly.metrics,
    communitySignalBrief: communityBrief,
    performanceLearningBrief: [
      buildPerformanceLearningBrief(input),
      improvementLines ? `주간 개선: ${improvementLines}` : null,
      communityBrief,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000),
  };
}
