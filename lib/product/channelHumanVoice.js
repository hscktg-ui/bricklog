/**
 * 채널별 휴먼 보이스 SSOT — 칼럼니스트 · 브랜드 담당자 · 마케터
 * 메인 약속: 채널마다 사람이 쓴 것 같은 톤, 빠른 송출(1~2분)
 */
export const CHANNEL_HUMAN_VOICE_VERSION = "channel-human-voice-v1";

export const CHANNEL_SPEED_PROMISE = "보통 1~2분";

/** @typedef {'blog' | 'place' | 'instagram' | 'insta'} ChannelVoiceId */

const VOICES = {
  blog: {
    id: "blog",
    role: "칼럼니스트",
    roleLabel: "칼럼니스트 톤",
    promise: "사람이 쓴 칼럼처럼 읽히는 이야기",
    resultLine: "네이버 칼럼·후기 리듬으로 다듬었어요",
    loadingSteps: [
      { sketch: "map", text: "브랜드·주제 맞추는 중…" },
      { sketch: "write", text: "이번 달 글 쓰는 중…" },
      { sketch: "check", text: "올리기 전 마무리 중…" },
    ],
    completeMessage: "칼럼 톤 편집본이 준비됐어요 — 복사해서 붙여넣으세요",
    trustPrefix: "칼럼니스트가 쓴 것처럼",
    sidebarDesc: "칼럼니스트가 쓴 듯한 장문",
  },
  place: {
    id: "place",
    role: "브랜드 담당자",
    roleLabel: "브랜드 담당자 톤",
    promise: "사장님·매장 공지처럼 읽히는 플레이스",
    resultLine: "브랜드 담당자 공지 톤으로 정리했어요",
    loadingSteps: [
      { sketch: "place", text: "매장 공지 쓰는 중…" },
      { sketch: "check", text: "방문 안내 마무리 중…" },
    ],
    completeMessage: "플레이스 공지 편집본이 준비됐어요",
    trustPrefix: "브랜드 담당자가 올린 공지처럼",
    sidebarDesc: "브랜드 담당자 공지·한 줄 소식",
  },
  instagram: {
    id: "instagram",
    role: "마케터",
    roleLabel: "마케터 톤",
    promise: "매장 SNS 담당이 쓴 듯한 캡션",
    resultLine: "마케터 캡션 톤으로 맞췄어요",
    loadingSteps: [
      { sketch: "insta", text: "캡션 쓰는 중…" },
      { sketch: "check", text: "줄바꿈·해시태그 마무리 중…" },
    ],
    completeMessage: "인스타 캡션 편집본이 준비됐어요",
    trustPrefix: "매장 마케터가 올린 캡션처럼",
    sidebarDesc: "마케터가 쓴 듯한 피드·릴스 캡션",
  },
};

const PIPELINE_STEPS = [
  { sketch: "write", text: "이번 달 콘텐츠 쓰는 중…" },
  { sketch: "place", text: "플레이스·인스타 맞추는 중…" },
  { sketch: "check", text: "올리기 전 마무리 중…" },
];

/** @param {string} [channel] */
export function normalizeChannelVoiceId(channel = "blog") {
  const ch = String(channel || "blog").toLowerCase();
  if (ch === "insta") return "instagram";
  if (ch === "smartplace") return "place";
  return ch in VOICES ? ch : "blog";
}

/** @param {string} [channel] */
export function getChannelHumanVoice(channel = "blog") {
  return VOICES[normalizeChannelVoiceId(channel)] || VOICES.blog;
}

/** @param {string} [channel] */
export function getChannelLoadingSteps(channel = "blog") {
  if (channel === "pipeline") return PIPELINE_STEPS;
  return getChannelHumanVoice(channel).loadingSteps;
}

/** @param {string} [channel] */
export function getChannelCompleteMessage(channel = "blog") {
  if (channel === "pipeline") {
    return `채널별 편집본이 준비됐어요 — ${CHANNEL_SPEED_PROMISE}`;
  }
  return getChannelHumanVoice(channel).completeMessage;
}

/**
 * @param {string} [channel]
 * @param {string} [baseHint]
 */
export function buildChannelTrustHint(channel = "blog", baseHint = "") {
  const voice = getChannelHumanVoice(channel);
  const prefix = `${voice.trustPrefix} 다듬었습니다.`;
  if (!baseHint) return prefix;
  if (baseHint.includes(voice.role)) return baseHint;
  return `${prefix} ${baseHint}`;
}

/** 작업실·랜딩 한 줄 */
export const BRICLOG_MAIN_PROMISE =
  "채널마다 칼럼니스트·브랜드 담당자·마케터 톤 — 보통 1~2분이면 편집본이 나옵니다.";

export { VOICES as CHANNEL_HUMAN_VOICES, PIPELINE_STEPS as CHANNEL_PIPELINE_LOADING_STEPS };
