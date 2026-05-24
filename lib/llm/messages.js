/**
 * 사용자·개발자 안내 (일반 사용자에게 API Key 입력 요청 금지)
 */

export const LLM_USER_MESSAGES = {
  engineNotConnected:
    "지금은 글 구성안만 제공됩니다. 잠시 후 다시 시도하거나 오른쪽 「도움말」에서 안내를 받아 보세요.",
  unavailable:
    "콘텐츠 생성을 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  maintenance:
    "콘텐츠 생성이 일시적으로 느립니다. 잠시 후 다시 시도해 주세요.",
  qualityRetry:
    "품질 검수 기준에 맞추는 중입니다. 잠시 후 다시 시도해 주세요.",
  qualityWithheld:
    "초안을 만들지 못했습니다. 브랜드명·지역·주제를 확인한 뒤 다시 시도해 주세요.",
  qualitySoftPassDetail:
    "아래 초안을 확인한 뒤, 마음에 들지 않으면 다시 생성하거나 직접 수정해 주세요.",
  draftFallbackDetail:
    "검색·브랜드 맥락을 반영한 초안입니다. 마음에 드는 문장만 골라 수정하거나 「다시 생성」을 눌러 주세요.",
  briefOnlyBody:
    "지금은 이야기 탭에서 브랜드 정리와 글 구성안만 제공됩니다. 플레이스·인스타·프롬프트·붙여넣기 검수는 각 메뉴에서 「바로 만들기」로 이용할 수 있습니다.",
  briefOnlyHint:
    "완성 이야기는 연결이 되면 「이야기 쓰기」로 다시 생성해 주세요. 다른 채널은 메뉴에서 먼저 시작해도 됩니다.",
  placeBlocked:
    "「이어 만들기」는 완성된 이야기 글이 있거나, 다른 채널 초안이 있을 때 연결됩니다. 없으면 「바로 만들기」를 이용해 주세요.",
  rewriteBlocked: "문장 다듬기는 본문 생성이 가능할 때 이용할 수 있습니다.",
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
