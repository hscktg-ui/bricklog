/**
 * 스마트플레이스 공지 — 사장님 톤 정리 · 후기체·블로그체 제거 · 불릿 구조
 *
 * 인스타(placeNoticeHumanize 대칭: instaCaptionHumanize)
 * - Place: 매장 운영 공지 (title + shortNotice + detailBody + cta)
 * - Insta: 피드 캡션 (hook + lineBreak body + ending + hashtags)
 */
import {
  detectPlaceReviewLeak,
  stripPlaceReviewSentences,
} from "@/lib/channel/smartPlaceNoticeGuard";
import { scoreSmartPlaceVoice } from "@/lib/channel/smartPlaceVoiceProfile";

const PLACE_BRIDGE_LINE_RE = /^(이어서|그\s*흐름|마지막으로|정리하면|결론적으로)\s*/i;
const PLACE_BLOG_LEAK_RE =
  /블로그|SEO|키워드|체크리스트|알아보시다|소개해드릴|저장해두세요|검색하시는/gi;
const PLACE_CUSTOMER_RE =
  /솔직\s*후기|다녀(?:왔|온|가|갔)|방문\s*후기|체험(?:해|했)(?:봤|보)|(?:만족|추천)(?:해|했)(?:요|드)/gi;

/** @param {string} text */
export function stripPlaceBridgeSpam(text = "") {
  let t = String(text || "").trim();
  if (!t) return t;

  for (let round = 0; round < 6; round += 1) {
    const prev = t;
    t = t
      .replace(/(?:이어서\s*){2,}/gi, "이어서 ")
      .split(/\n+/)
      .map((line) => line.replace(PLACE_BRIDGE_LINE_RE, "").replace(/\s{2,}/g, " ").trim())
      .filter(Boolean)
      .join("\n");
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    if (t === prev) break;
  }
  return t;
}

/** @param {string} text */
export function polishPlaceNoticeLine(text = "") {
  let line = stripPlaceBridgeSpam(text);
  line = line
    .replace(PLACE_BLOG_LEAK_RE, "")
    .replace(PLACE_CUSTOMER_RE, "")
    .replace(/저장(?:해\s*)?두세요/gi, "")
    .replace(/알아보시다\s*보면/gi, "")
    .replace(/확인해보시기\s*바랍니다/gi, "확인해 주세요")
    .replace(/\s{2,}/g, " ")
    .trim();
  return line;
}

function toBulletLine(line = "") {
  const t = polishPlaceNoticeLine(String(line || "").replace(/^·\s*/, ""));
  if (!t) return "";
  return t.startsWith("·") ? t : `· ${t}`;
}

function bulletLines(text = "") {
  return String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function dedupeShortAndDetail(shortNotice = "", detailBody = "") {
  const shortKey = shortNotice.replace(/\s/g, "").slice(0, 36);
  const lines = bulletLines(detailBody)
    .map((l) => toBulletLine(l))
    .filter((l) => {
      const key = l.replace(/^·\s*/, "").replace(/\s/g, "").slice(0, 36);
      return key && key !== shortKey;
    });
  return lines.join("\n").trim();
}

function ensureOwnerShortNotice(shortNotice = "", input = {}) {
  let line = polishPlaceNoticeLine(shortNotice);
  if (detectPlaceReviewLeak(line)) {
    const brand = String(input.brandName || "").trim();
    const topic = String(input.topic || input.mainKeyword || "매장 소식").trim();
    line = brand ? `${brand} ${topic} 안내드립니다.` : `${topic} 관련 안내드립니다.`;
  }
  if (!/(?:안내|운영|예약|입고|매장|저희)/.test(line)) {
    line = `${line} 안내드립니다.`.replace(/\s+/g, " ").trim();
  }
  return line.slice(0, 120);
}

/** @param {object} pack @param {object} [input] */
export function humanizePlaceNoticePack(pack = {}, input = {}) {
  if (!pack) return pack;

  let title = polishPlaceNoticeLine(pack.title || "");
  if (detectPlaceReviewLeak(title)) {
    const brand = String(input.brandName || "").trim();
    title = brand ? `${brand} 매장 소식` : "매장 소식 안내";
  }

  let shortNotice = ensureOwnerShortNotice(
    stripPlaceReviewSentences(pack.shortNotice || pack.shortBody || ""),
    input
  );

  let detailBody = stripPlaceReviewSentences(pack.detailBody || "");
  detailBody = stripPlaceBridgeSpam(detailBody);
  const bullets = bulletLines(detailBody)
    .map((l) => toBulletLine(l))
    .filter(Boolean);
  detailBody = bullets.length ? bullets.join("\n") : toBulletLine(detailBody);
  detailBody = dedupeShortAndDetail(shortNotice, detailBody);

  if (!detailBody || detailBody.replace(/\s/g, "").length < 40) {
    const brand = String(input.brandName || "").trim();
    const region = String(input.region || "").trim();
    detailBody = [
      toBulletLine(`${region ? `${region} ` : ""}${brand || "매장"} 운영·예약 안내`),
      toBulletLine("방문 전 영업 시간·대기·이용 조건은 플레이스에 표시된 내용을 확인해 주세요"),
      toBulletLine("자세한 문의는 플레이스·전화로 연락해 주세요"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  const voice = scoreSmartPlaceVoice(`${title}\n${shortNotice}\n${detailBody}`);
  if (!voice.ok && voice.ownerHits < 2) {
    if (!/안내/.test(shortNotice)) {
      shortNotice = ensureOwnerShortNotice(shortNotice, input);
    }
  }

  let cta = polishPlaceNoticeLine(pack.cta || "");
  if (!cta || !/(?:플레이스|전화|예약|문의|방문)/.test(cta)) {
    cta = "플레이스에서 자세히 확인해 주세요";
  }

  return {
    ...pack,
    title: title.slice(0, 44),
    shortNotice,
    shortBody: shortNotice,
    detailBody: detailBody.slice(0, 520),
    cta,
    body: `${shortNotice}\n\n${detailBody}`.trim(),
    _meta: {
      ...(pack._meta || {}),
      placeNoticeHumanized: true,
      placeNoticeVoice: voice,
    },
  };
}

/** @param {string} fullText */
export function assessPlaceNoticeHumanTone(fullText = "") {
  const text = String(fullText || "");
  const duplicateBridge = /(?:이어서\s*){2,}/.test(text);
  const reviewLeak = detectPlaceReviewLeak(text);
  const blogLeak = PLACE_BLOG_LEAK_RE.test(text);
  const voice = scoreSmartPlaceVoice(text);
  const hasBullets = /(?:^|\n)\s*·\s+/m.test(text);

  return {
    ok:
      !duplicateBridge &&
      !reviewLeak &&
      !blogLeak &&
      voice.ok &&
      (hasBullets || /(?:운영|예약|입고|안내)/.test(text)),
    duplicateBridge,
    reviewLeak,
    blogLeak,
    voice,
    hasBullets,
  };
}
