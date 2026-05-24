import { runRewrite } from "@/lib/rewrite/rewriteEngine";

export const EDITOR_IMPROVE_ACTIONS = [
  { id: "auto", label: "자동 개선", feedback: "Editor AI 제안을 반영해 전체적으로 다듬어 주세요" },
  { id: "plain", label: "더 담백하게", feedback: "더 담백하게, 짧게" },
  { id: "less_ad", label: "광고티 줄이기", feedback: "광고티 줄여줘" },
  { id: "warmer", label: "감성 강화", feedback: "더 따뜻하게, 감성 강화" },
  { id: "less_kw", label: "키워드 반복 줄이기", feedback: "키워드 반복 줄여줘" },
  { id: "paragraphs", label: "문단 정리", feedback: "문단 정리, 줄바꿈 넓게" },
  { id: "emoji", label: "이모지 조정", feedback: "이모지 조금만 넣어줘" },
];

export function getImproveFeedback(actionId) {
  return (
    EDITOR_IMPROVE_ACTIONS.find((a) => a.id === actionId)?.feedback ||
    EDITOR_IMPROVE_ACTIONS[0].feedback
  );
}

export function autoImproveContent(channel, content, actionId, ctx) {
  const feedback = getImproveFeedback(actionId);
  return runRewrite(channel, content, feedback, ctx, "all");
}
