/**
 * Place · Instagram — 통합 서사 (블로그 visitReviewUnifiedProse와 동일 축)
 * 문단 연결 · 현장감 · 반복 제거 · 감정선 · 작업과정 금지 · AI 패턴 제거
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  applyUnifiedProseToText,
  createUnifiedProsePhraseCounts,
  countPatternHits,
} from "@/lib/content/visitReviewUnifiedProseEngine";
import {
  humanizeInstaCaptionPack,
  assessInstaCaptionHumanTone,
} from "@/lib/content/instaCaptionHumanize";

export const CHANNEL_UNIFIED_PROSE_VERSION = "channel-unified-prose-v1";

const FIELD_MARKER_RE =
  /입구|들어서|분위기|눈에|직접|체험|방문|도착|공간|전시|좌석|이용|안내|운영|주차|예약|피드|장면|저장/;

const EMOTION_MARKER_RE =
  /생각보다|의외|인상적|기억에\s*남|만족|편안|느껴|느꼈|좋았|괜찮/;

const CAPPED_PHRASE_RES = [
  /직접 확인(?:할|해) 수 있(?:습니다|어요|었습니다)/g,
  /만나볼 수 있(?:습니다|어요)/g,
  /경험할 수 있(?:습니다|어요)/g,
  /확인해보시기 바랍니다/g,
  /운영하고 있(?:습니다|어요)/g,
  /준비되어 있(?:습니다|어요)/g,
];

export function isChannelUnifiedProseEnabled() {
  if (process.env.BRICLOG_CHANNEL_UNIFIED_PROSE === "false") return false;
  return isBriclogMissionEnforced();
}

export function buildPlaceNoticeThesis(input = {}) {
  const p = deriveTopicWritingContext(input);
  const topic = String(input.topic || input.mainKeyword || "매장 소식").trim();
  return `${p.regionBit}${p.brand} ${topic} — 방문·이용에 필요한 안내를 한 흐름으로 정리`.replace(
    /\s+/g,
    " "
  );
}

export function buildPlaceNoticeFlow() {
  return ["한 줄 요약", "이용 안내", "방문 전 확인", "문의·예약"];
}

export function buildInstagramCaptionThesis(input = {}) {
  const p = deriveTopicWritingContext(input);
  const topic = String(input.topic || input.mainKeyword || "브랜드").trim();
  return `${topic} — ${p.regionBit}${p.brand}을 피드에서 저장해 두기 좋은 캡션`.replace(/\s+/g, " ");
}

export function buildInstagramCaptionFlow() {
  return ["훅", "장면·포인트", "공감·체감", "마무리"];
}

export function buildChannelUnifiedProsePromptBlock(channel = "place") {
  if (channel === "place") {
    return `【플레이스 통합 서사】
shortNotice와 detailBody를 따로 쓴 뒤 이어붙이지 말고, 한 흐름(요약→이용 안내→방문 전 확인→문의)으로 설계하세요.
짧은 문장 나열 금지 — 사장님 공지 톤으로 자연스럽게 연결하세요.
「직접 확인할 수 있습니다」「준비되어 있습니다」 등 동일 표현은 글 전체 1회 이하.
「선별하여」「정성껏 준비하여」 등 작업 과정 서술 금지 — 이용자가 알아야 할 결과·조건만.
문장 시작 「특히」「또한」「한편」「따라서」 과다 사용 금지.`;
  }
  if (channel === "instagram") {
    return `【인스타 통합 서사】
hook→body→ending을 한 캡션 흐름으로 설계. 훅과 본문·마무리가 따로 노는 느낌 금지.
피드에서 눈에 들어오는 장면·방문/저장 동기·체감 한 줄을 포함하세요.
「이어서」「마지막으로」 접속어 반복·연속 사용 금지 — 줄바꿈으로 리듬을 만드세요.
반복 표현·AI 접속어(특히/또한/더불어/한편) 금지. 정보 60% · 장면 20% · 감정 20%.`;
  }
  return "";
}

function buildPlaceFieldLine(input = {}, slot = 0) {
  const p = deriveTopicWritingContext(input);
  const lines = [
    `${p.regionBit}${p.brand} 이용 안내를 방문 전에 확인하시면 동선이 수월합니다.`,
    `매장 운영·예약 조건은 당일 안내 기준으로 함께 적어 두었습니다.`,
    `주차·영업 시간은 방문 전에 한 번 더 확인해 주세요.`,
  ];
  return lines[slot % lines.length];
}

function buildInstagramFieldLine(input = {}, slot = 0) {
  const p = deriveTopicWritingContext(input);
  const lines = [
    `${p.regionBit}${p.brand} 피드를 넘기다가 눈에 들어올 만한 장면을 먼저 담았어요.`,
    `저장해 두었다가 방문할 때 참고하기 좋은 포인트예요.`,
    `현장 분위기가 글로만 봐도 그려지도록 짧게 적었어요.`,
  ];
  return lines[slot % lines.length];
}

function bridgeText(text = "", prefix = "이어서 ") {
  const t = String(text || "").trim();
  if (!t || /^(이어서|그 흐름|마지막으로|안내)/.test(t)) return t;
  const lower = t.charAt(0) === t.charAt(0).toLowerCase() ? t : t.charAt(0).toLowerCase() + t.slice(1);
  return `${prefix}${lower}`;
}

/** @param {object} pack @param {object} [input] */
export function applyPlaceUnifiedProsePass(pack, input = {}) {
  if (!pack || !isChannelUnifiedProseEnabled()) return pack;

  const phraseCounts = createUnifiedProsePhraseCounts();
  const thesis = buildPlaceNoticeThesis(input);
  const flow = buildPlaceNoticeFlow();

  let shortNotice = applyUnifiedProseToText(pack.shortNotice || "", phraseCounts);
  let detailBody = applyUnifiedProseToText(pack.detailBody || "", phraseCounts, {
    fieldLine: buildPlaceFieldLine(input, 0),
    emotionBeat: "방문 전에 읽어 두시면 한결 편안합니다.",
  });

  if (shortNotice && detailBody) {
    detailBody = bridgeText(detailBody, "이어서 ");
  }

  return {
    ...pack,
    shortNotice: shortNotice || pack.shortNotice,
    detailBody: detailBody || pack.detailBody,
    _meta: {
      ...(pack._meta || {}),
      channelUnifiedProsePass: true,
      channelUnifiedProseVersion: CHANNEL_UNIFIED_PROSE_VERSION,
      channelUnifiedProseChannel: "place",
      placeNoticeThesis: thesis,
      placeNoticeFlow: flow,
    },
  };
}

/** @param {object} pack @param {object} [input] */
export function applyInstagramUnifiedProsePass(pack, input = {}) {
  if (!pack || !isChannelUnifiedProseEnabled()) return pack;

  const phraseCounts = createUnifiedProsePhraseCounts();
  const bodyKey = pack.lineBreakBody ? "lineBreakBody" : "body";
  const thesis = buildInstagramCaptionThesis(input);
  const flow = buildInstagramCaptionFlow();
  const proseOpts = { channel: "instagram" };

  let hook = applyUnifiedProseToText(pack.hook || "", phraseCounts, proseOpts);
  let body = applyUnifiedProseToText(pack[bodyKey] || "", phraseCounts, {
    ...proseOpts,
    fieldLine: buildInstagramFieldLine(input, 0),
    emotionBeat: "생각보다 저장해 두고 싶어지는 순간이었어요.",
  });
  let ending = applyUnifiedProseToText(pack.ending || "", phraseCounts, {
    ...proseOpts,
    emotionBeat: "다음에 들를 때 참고하기 좋을 것 같아요.",
  });

  let next = {
    ...pack,
    hook: hook || pack.hook,
    [bodyKey]: body || pack[bodyKey],
    ending: ending || pack.ending,
    _meta: {
      ...(pack._meta || {}),
      channelUnifiedProsePass: true,
      channelUnifiedProseVersion: CHANNEL_UNIFIED_PROSE_VERSION,
      channelUnifiedProseChannel: "instagram",
      instagramCaptionThesis: thesis,
      instagramCaptionFlow: flow,
    },
  };

  return humanizeInstaCaptionPack(next);
}

/** @param {object} pack @param {"place"|"instagram"} channel @param {object} [input] */
export function applyChannelUnifiedProsePass(pack, channel, input = {}) {
  if (channel === "place") return applyPlaceUnifiedProsePass(pack, input);
  if (channel === "instagram") return applyInstagramUnifiedProsePass(pack, input);
  return pack;
}

/** @param {object} pack @param {"place"|"instagram"} channel @param {object} [input] */
export function assessChannelUnifiedProse(pack, channel, input = {}) {
  const full = getChannelFullText(pack, channel);
  let phraseRepeats = 0;
  for (const re of CAPPED_PHRASE_RES) {
    const matches = full.match(re);
    if (matches && matches.length > 1) phraseRepeats += matches.length - 1;
  }
  const emotionHits = countPatternHits(full, EMOTION_MARKER_RE);
  const fieldHits = countPatternHits(full, FIELD_MARKER_RE);
  const hasBridge =
    channel === "place"
      ? /이어서/.test(String(pack.detailBody || ""))
      : false;
  const humanTone =
    channel === "instagram" ? assessInstaCaptionHumanTone(full) : { ok: true };

  return {
    ok:
      phraseRepeats <= 1 &&
      emotionHits >= 1 &&
      fieldHits >= 2 &&
      (channel === "place" ? hasBridge : humanTone.ok),
    phraseRepeats,
    emotionHits,
    fieldHits,
    hasBridge,
    humanTone,
    channel,
    version: CHANNEL_UNIFIED_PROSE_VERSION,
  };
}
