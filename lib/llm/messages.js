/**
 * 사용자·개발자 안내 (일반 사용자에게 API Key 입력 요청 금지)
 */

export const LLM_USER_MESSAGES = {
  engineNotConnected:
    "조사·편집을 준비 중입니다. 잠시 후 다시 「조사 후 글 받기」를 눌러 주세요.",
  unavailable:
    "지금은 편집본을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.",
  maintenance:
    "조사·편집이 일시적으로 느립니다. 잠시 후 다시 시도해 주세요.",
  qualityRetry:
    "검수 기준에 맞춰 다듬는 중입니다. 잠시 후 다시 시도해 주세요.",
  qualityWithheld:
    "아직 올리지 않았어요. 브랜드명·지역·주제를 구체적으로 입력한 뒤 다시 시도해 주세요.",
  qualitySoftPassDetail:
    "아래 편집본을 확인한 뒤, 마음에 들지 않으면 「다시 받기」를 눌러 주세요.",
  draftFallbackDetail:
    "검색·브랜드 맥락을 반영한 편집본입니다. 마음에 드는 문장만 골라 수정하거나 「다시 받기」를 눌러 주세요.",
  briefOnlyBody:
    "조사·검수·다듬기를 진행 중입니다.",
  briefOnlyHint:
    "잠시 후 게시 가능한 편집본으로 이어집니다.",
  placeBlocked:
    "「이어 만들기」는 완성된 블로그 편집본이 있거나, 다른 채널 편집본이 있을 때 연결됩니다.",
  rewriteBlocked: "문장 다듬기는 편집본을 받은 뒤 이용할 수 있습니다.",
};

export function getDevOperatorHint() {
  if (process.env.NODE_ENV !== "development") return null;
  return {
    envFile: ".env.local",
    variable: "OPENAI_API_KEY=(서버 환경변수)",
    restart: "npm run dev",
    note: "API Key는 코드·채팅·Git에 넣지 마세요. OpenAI 대시보드에서만 발급·관리합니다.",
  };
}

/** 개발 환경 — Gemini 조사 fallback 시 운영자 힌트 */
export function getGeminiFallbackDevHint(reason) {
  if (!reason || process.env.NODE_ENV !== "development") return null;
  const map = {
    gemini_http_404: "GEMINI_MODEL이 구버전일 수 있어요. .env.local → gemini-2.5-flash",
    gemini_http_403: "GEMINI_API_KEY 권한·Generative Language API를 확인하세요.",
    gemini_request_failed: "Gemini 네트워크 오류 — GPT 조사로 대체됨",
  };
  const prefix = map[reason] || `Gemini 조사 실패(${reason}) — GPT 조사로 대체됨`;
  return `${prefix}. npm run check:gemini 로 확인하세요.`;
}
