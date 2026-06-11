/**
 * 스마트플레이스 — 업체(사장) 공지 톤 강제 · 후기체 차단 SSOT
 */
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { scoreSmartPlaceVoice } from "@/lib/channel/smartPlaceVoiceProfile";
import { isCatalogContaminationSentence } from "@/lib/product/catalogContaminationGuard";

/** 고객 후기·방문기·블로그 유입 표현 */
export const PLACE_REVIEW_LEAK_RES = [
  /솔직\s*후기/,
  /다녀(?:왔|온|가|갔)/,
  /방문\s*후기/,
  /(?:갔|왔)어요/,
  /(?:봤|느껴|느꼈)(?:어요|는)/,
  /(?:만족|추천)(?:해|했)(?:요|드)/,
  /(?:좋았|괜찮았)(?:어요|습니다)/,
  /(?:인\s*상|느낌)(?:이\s*)?(?:좋|괜)/,
  /(?:한번|직접)\s*(?:가\s*보|방문)/,
  /체험(?:해|했)(?:봤|보)/,
  /(?:저는|제가)\s*(?:다녀|방문|갔)/,
  /(?:정리하면|결론적으로|이번\s*글)/,
  /(?:분위기|무드|감성)\s*(?:이\s*)?(?:좋|괜)/,
  /선택\s*팁\s*:/,
  /비교(?:해\s*보|가\s*수)/,
];

const PLACE_OWNER_FALLBACK_LEAD = {
  notice: "안내드립니다",
  holiday: "운영 일정 안내",
  newProduct: "신제품·입고 소식",
  event: "이벤트 안내",
  hours: "영업·예약 안내",
  general: "매장 소식",
};

function placeTypeKey(input = {}) {
  return String(input.placePostType || input.placeNoticeKind || "notice").toLowerCase();
}

function buildPlaceTitle(p, input = {}) {
  const lead = PLACE_OWNER_FALLBACK_LEAD[placeTypeKey(input)] || PLACE_OWNER_FALLBACK_LEAD.notice;
  const topic = String(input.topic || input.main || "").trim();
  if (topic && topic.length <= 28) {
    return `${p.regionBit}${p.brand} ${topic}`.slice(0, 44);
  }
  return `${p.regionBit}${p.brand} ${lead}`.slice(0, 44);
}

function buildPlaceShortNoticeFallback(p, input = {}) {
  const offer = String(input.placeOffer || "").trim();
  const period = String(input.placePeriod || "").trim();
  const topic = String(input.topic || input.main || "").trim();
  if (offer) {
    return `${p.brand} ${offer}`.replace(/\s+/g, " ").slice(0, 120);
  }
  if (period && topic) {
    return `${p.brand} ${topic} — ${period}`.replace(/\s+/g, " ").slice(0, 120);
  }
  if (topic) {
    return `${p.brand} ${topic} 관련 안내드립니다.`.slice(0, 120);
  }
  return `${p.regionBit}${p.brand} 매장 소식 안내드립니다.`.slice(0, 120);
}

function buildPlaceDetailFallback(p, input = {}) {
  const lines = [];
  const period = String(input.placePeriod || "").trim();
  const offer = String(input.placeOffer || "").trim();
  const hint = String(input.placeKeyFacts || input.placeDetailHint || "").trim();
  const topic = String(input.topic || input.main || "").trim();

  if (period) lines.push(`기간: ${period}`);
  if (offer) lines.push(offer);
  if (hint) lines.push(hint);
  if (topic && !lines.length) {
    lines.push(`${p.brand} ${topic} 관련 내용을 매장에서 안내드리고 있습니다.`);
  }
  lines.push("자세한 일정·예약·이용 방법은 플레이스·전화로 문의해 주세요.");
  return lines.join("\n").slice(0, 420);
}

export function detectPlaceReviewLeak(text = "") {
  const s = String(text || "");
  return PLACE_REVIEW_LEAK_RES.some((re) => re.test(s));
}

export function stripPlaceReviewSentences(text = "") {
  const kept = [];
  for (const raw of splitKoreanSentences(String(text || ""))) {
    const s = raw.trim();
    if (!s || s.length < 6) continue;
    if (detectPlaceReviewLeak(s)) continue;
    if (isCatalogContaminationSentence(s)) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function enforceSmartPlaceOwnerNotice(pack, input = {}) {
  if (!pack) return pack;
  const p = deriveTopicWritingContext(input);

  let title = String(pack.title || "").trim();
  let shortNotice = stripPlaceReviewSentences(pack.shortNotice);
  let detailBody = stripPlaceReviewSentences(pack.detailBody);

  if (!title || title.length < 6 || detectPlaceReviewLeak(title)) {
    title = buildPlaceTitle(p, input);
  }

  if (!shortNotice || shortNotice.replace(/\s/g, "").length < 12) {
    shortNotice = buildPlaceShortNoticeFallback(p, input);
  }

  if (!detailBody || detailBody.replace(/\s/g, "").length < 40) {
    detailBody = buildPlaceDetailFallback(p, input);
  }

  const full = `${title}\n${shortNotice}\n${detailBody}`;
  const voice = scoreSmartPlaceVoice(full);
  if (!voice.ok && voice.ownerHits < 2) {
    if (!/안내(?:드립|해)/.test(shortNotice)) {
      shortNotice = `${shortNotice} 안내드립니다.`.slice(0, 120);
    }
    if (!/(?:운영|예약|매장|저희|입고|이벤트)/.test(detailBody)) {
      detailBody = `${detailBody}\n\n${buildPlaceDetailFallback(p, input).split("\n").pop()}`.slice(
        0,
        420
      );
    }
  }

  return {
    ...pack,
    title: title.slice(0, 44),
    shortNotice: shortNotice.replace(/\n+/g, " ").slice(0, 120),
    detailBody: detailBody.slice(0, 420),
    _meta: {
      ...(pack._meta || {}),
      smartPlaceNoticeGuard: true,
      smartPlaceVoice: scoreSmartPlaceVoice(`${title}\n${shortNotice}\n${detailBody}`),
    },
  };
}
