import { runRewrite } from "@/lib/rewrite/rewriteEngine";
import { createPromptContext } from "@/utils/promptBuilder";

const BLOCKER_FIX = {
  placeholder: "placeholder와 미완성 문구를 실제 내용으로 바꿔 주세요.",
  ai_cliche: "AI 관용구를 줄이고 구체적인 장면으로 써 주세요.",
  duplicate: "같은 문장 반복을 줄여 주세요.",
  no_scene: "실제 방문·이용 장면을 한두 군데 넣어 주세요.",
  brand_feature: "브랜드 이름과 매장 특징을 본문에 자연스럽게 넣어 주세요.",
  length: "본문을 더 풍부하게, 공백 포함 2000자 이상으로 써 주세요.",
  quality_score: "검색 의도와 브랜드 톤을 맞춰 전체적으로 다듬어 주세요.",
  personaConsistent: "화자 톤을 처음부터 끝까지 일관되게 맞춰 주세요.",
  less_ad: "광고 느낌을 줄이고 담백하게 써 주세요.",
  too_generic: "업종 일반론 대신 이 매장만의 이야기로 써 주세요.",
  place_quality: "플레이스 톤으로 짧고 명확하게 다시 써 주세요.",
  insta_quality: "인스타 캡션 톤으로 짧고 감각 있게 다시 써 주세요.",
  sensitive_violation:
    "민감 업종 — 단정·보장·효과 확언 없이 일반 정보·경험 톤만. 과장·허위 금지.",
};

export function buildFixFeedback(blockers = []) {
  const msgs = blockers
    .map((b) => BLOCKER_FIX[b] || BLOCKER_FIX[b.replace(/_.*/, "")])
    .filter(Boolean);
  if (!msgs.length) return "전체 품질을 90점 이상으로 다듬어 주세요.";
  return msgs.slice(0, 3).join(" ");
}

export function applyAutoFix(channel, pack, blockers, input) {
  const feedback = buildFixFeedback(blockers);
  const ctx = createPromptContext(input);
  const result = runRewrite(channel, pack, feedback, { ...ctx, input }, "all");
  return { pack: result.pack, feedback, intent: result.intent };
}
