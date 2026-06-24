/**
 * 스마트플레이스 공지 — 사장님 톤 · 에디터 복붙 품질 SSOT
 *
 * - Place: title + shortNotice + detailBody (불릿) + cta
 * - 블로그체·후기체·「이어서」·중복 문의·플레이스 boilerplate 제거
 */
import {
  detectPlaceReviewLeak,
  stripPlaceReviewSentences,
} from "@/lib/channel/smartPlaceNoticeGuard";
import { scoreSmartPlaceVoice } from "@/lib/channel/smartPlaceVoiceProfile";

const PLACE_BRIDGE_LINE_RE =
  /^(이어서|그\s*흐름|마지막으로|정리하면|결론적으로)\s*/i;
const PLACE_BLOG_LEAK_RE =
  /블로그|SEO|키워드|체크리스트|알아보시다|소개해드릴|저장해두세요|검색하시는|전해(?:드|요)/gi;
const PLACE_CUSTOMER_RE =
  /솔직\s*후기|다녀(?:왔|온|가|갔)|방문\s*후기|체험(?:해|했)(?:봤|보)|(?:만족|추천)(?:해|했)(?:요|드)/gi;
const ORPHAN_LINE_RE = /^[\s·\-–—]+$/;
const LEADING_HYPHEN_RE = /^[\s·]*[-–—]\s*/;

const PLACE_BOILERPLATE_RES = [
  /자연스럽(?:게|으로)/,
  /서비스(?:·|과)?\s*예약\s*일정(?:은|이)?\s*매장(?:·|과)?\s*시기(?:마다)?\s*달라(?:질| 수)/,
  /자세한\s*내용(?:은|을)?\s*매장(?:에|으로)?\s*문의/,
  /같은\s*경로(?:에서)?\s*함께\s*안내/,
  /편하게\s*남겨\s*주세요/,
  /플레이스\s*공지(?:와|·)\s*전화(?:\s*문의)?(?:로)?\s*확인(?:할\s*수\s*있(?:으며|고))?/,
  /방문\s*전에\s*읽어\s*두시면\s*한결\s*편안/,
  /당일\s*안내\s*기준으로\s*함께\s*적어/,
  /이용\s*안내를\s*방문\s*전에\s*확인하시면\s*동선이\s*수월/,
  /주차(?:·|과)?\s*영업\s*시간(?:은|이)?\s*방문\s*전에\s*한\s*번\s*더\s*확인/,
  /매장\s*운영(?:·|과)?\s*예약\s*조건(?:은|이)?\s*당일\s*안내\s*기준/,
  /새\s*브랜드\s*방문(?:·|과)?\s*예약(?:은|이)?\s*플레이스/,
  /—\s*자세한\s*내용/,
];

/** @param {string} text */
export function stripPlaceBridgeSpam(text = "") {
  let t = String(text || "").trim();
  if (!t) return t;

  for (let round = 0; round < 6; round += 1) {
    const prev = t;
    t = t
      .replace(/(?:이어서\s*){2,}/gi, "")
      .replace(/\s+·\s+/g, "\n")
      .split(/\n+/)
      .map((line) =>
        line
          .replace(PLACE_BRIDGE_LINE_RE, "")
          .replace(LEADING_HYPHEN_RE, "")
          .replace(/\s{2,}/g, " ")
          .trim()
      )
      .filter((line) => line && !ORPHAN_LINE_RE.test(line))
      .join("\n");
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    if (t === prev) break;
  }
  return t;
}

function isPlaceBoilerplateLine(line = "") {
  const t = String(line || "").trim();
  if (!t || t.replace(/\s/g, "").length < 6) return true;
  return PLACE_BOILERPLATE_RES.some((re) => re.test(t));
}

function extractTopicCore(input = {}) {
  return String(input.topic || input.mainKeyword || "")
    .trim()
    .replace(/다녀(?:왔|온|가|갔).*/i, "")
    .replace(/방문\s*후기.*/i, "")
    .trim();
}

function formatPlaceLead(input = {}) {
  const brand = String(input.brandName || "매장").trim();
  const region = String(input.region || "").trim();
  if (!region) return brand;
  if (brand.startsWith(region)) return brand;
  return `${region} ${brand}`;
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
    .replace(/\s*—\s*자세한\s*내용.+$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (isPlaceBoilerplateLine(line)) return "";
  return line;
}

function toBulletLine(line = "") {
  const t = polishPlaceNoticeLine(String(line || "").replace(/^·\s*/, ""));
  if (!t) return "";
  return t.startsWith("·") ? t : `· ${t}`;
}

function splitPlaceLines(text = "") {
  return stripPlaceBridgeSpam(text)
    .replace(/\s+·\s+/g, "\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !ORPHAN_LINE_RE.test(l));
}

function normalizePlaceBullets(lines = [], input = {}) {
  const seen = new Set();
  const out = [];
  let hasContact = false;
  const topic = extractTopicCore(input);

  for (const raw of lines) {
    let line = polishPlaceNoticeLine(String(raw).replace(/^·\s*/, ""));
    if (!line || line.replace(/\s/g, "").length < 8) continue;
    if (isPlaceBoilerplateLine(line)) continue;

    const contactLike =
      /플레이스|전화|문의|예약|확인(?:해|할)/.test(line) &&
      !/(?:개장|입고|오픈|이벤트|수영장|운영\s*시간)/.test(line);
    if (contactLike) {
      if (hasContact) continue;
      hasContact = true;
      line = "문의·예약은 플레이스 또는 전화로 연락해 주세요.";
    }

    if (topic && /—/.test(line) && line.length < topic.length + 24) continue;

    const key = line.replace(/\s/g, "").slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toBulletLine(line));
  }

  if (!hasContact && out.length) {
    out.push(toBulletLine("문의·예약은 플레이스 또는 전화로 연락해 주세요."));
  }
  return out.slice(0, 4);
}

function buildEditorPlaceBullets(input = {}) {
  const lead = formatPlaceLead(input);
  const topic = extractTopicCore(input) || "매장 소식";
  const period = String(input.placePeriod || "").trim();
  const offer = String(input.placeOffer || "").trim();
  const facts = (input.researchFacts || [])
    .map((f) => String(f?.fact || f || "").trim())
    .filter((f) => f.length >= 12 && !isPlaceBoilerplateLine(f));

  const bullets = [];
  if (offer) {
    bullets.push(toBulletLine(`${lead} — ${offer}`));
  } else {
    bullets.push(toBulletLine(`${lead} ${topic} 안내드립니다.`));
  }

  if (/개장|오픈|리뉴얼/.test(topic)) {
    bullets.push(
      toBulletLine(`${topic} — 이용 시간·입장 조건은 매장 안내를 확인해 주세요.`)
    );
  } else if (period) {
    bullets.push(toBulletLine(period));
  } else if (facts[0]) {
    bullets.push(toBulletLine(facts[0].slice(0, 96)));
  }

  bullets.push(toBulletLine("문의·예약은 플레이스 또는 전화로 연락해 주세요."));
  return bullets.filter(Boolean).slice(0, 4);
}

function dedupeShortAndDetail(shortNotice = "", detailBody = "", input = {}) {
  const shortKey = shortNotice.replace(/\s/g, "").slice(0, 36);
  const lines = normalizePlaceBullets(splitPlaceLines(detailBody), input).filter((l) => {
    const plain = l.replace(/^·\s*/, "").replace(/\s/g, "");
    const key = plain.slice(0, 36);
    if (key && key === shortKey) return false;
    if (shortNotice && plain.length > 12 && shortNotice.includes(plain.slice(0, 20))) {
      return false;
    }
    return true;
  });
  return lines.join("\n").trim();
}

function ensureOwnerShortNotice(shortNotice = "", input = {}) {
  let line = polishPlaceNoticeLine(shortNotice);
  if (detectPlaceReviewLeak(line) || !line) {
    const lead = formatPlaceLead(input);
    const topic = extractTopicCore(input) || "매장 소식";
    line = `${lead} ${topic} 안내드립니다.`;
  }
  line = line.replace(/\s*·\s*.+$/, "").replace(/\s+/g, " ").trim();
  if (!/(?:안내|운영|예약|입고|매장|개장|오픈|저희)/.test(line)) {
    const topic = extractTopicCore(input);
    if (topic) {
      line = `${formatPlaceLead(input)} ${topic} 안내드립니다.`;
    } else {
      line = `${line} 안내드립니다.`.replace(/\s+/g, " ").trim();
    }
  }
  return line.slice(0, 120);
}

/** @param {object} pack @param {object} [input] */
export function humanizePlaceNoticePack(pack = {}, input = {}) {
  if (!pack) return pack;

  let title = polishPlaceNoticeLine(pack.title || "");
  if (detectPlaceReviewLeak(title) || !title) {
    const lead = formatPlaceLead(input);
    const topic = extractTopicCore(input) || "매장 소식";
    title = `${lead} ${topic}`.slice(0, 44);
  }

  let shortNotice = ensureOwnerShortNotice(
    stripPlaceReviewSentences(pack.shortNotice || pack.shortBody || ""),
    input
  );

  let detailBody = stripPlaceReviewSentences(pack.detailBody || "");
  detailBody = stripPlaceBridgeSpam(detailBody);
  let bullets = normalizePlaceBullets(splitPlaceLines(detailBody), input);
  detailBody = bullets.length ? bullets.join("\n") : "";

  const substantive = bullets.filter(
    (b) => !/플레이스\s*또는\s*전화/.test(b.replace(/^·\s*/, ""))
  ).length;

  if (!detailBody || substantive < 1 || detailBody.replace(/\s/g, "").length < 40) {
    detailBody = buildEditorPlaceBullets(input).join("\n");
  } else {
    detailBody = dedupeShortAndDetail(shortNotice, detailBody, input);
    if (!detailBody || detailBody.replace(/\s/g, "").length < 40) {
      detailBody = buildEditorPlaceBullets(input).join("\n");
    }
  }

  const voice = scoreSmartPlaceVoice(`${title}\n${shortNotice}\n${detailBody}`);
  if (!voice.ok && voice.ownerHits < 2) {
    shortNotice = ensureOwnerShortNotice(shortNotice, input);
  }

  let cta = polishPlaceNoticeLine(pack.cta || "");
  if (!cta || isPlaceBoilerplateLine(cta)) {
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

/** 고객 송출 직전 — place 전용 */
export function finalizePlaceNoticeForDelivery(pack, input = {}) {
  return humanizePlaceNoticePack(pack, input);
}

/** @param {string} fullText */
export function assessPlaceNoticeHumanTone(fullText = "") {
  const text = String(fullText || "");
  const duplicateBridge = /(?:이어서\s*){2,}/.test(text);
  const reviewLeak = detectPlaceReviewLeak(text);
  const blogLeak = PLACE_BLOG_LEAK_RE.test(text);
  const boilerplateHits = (text.match(/플레이스(?:·|와)\s*전화/g) || []).length;
  const voice = scoreSmartPlaceVoice(text);
  const hasBullets = /(?:^|\n)\s*·\s+/m.test(text);
  const orphanHyphen = /(?:^|\n)\s*-\s*(?:\n|$)/m.test(text);

  return {
    ok:
      !duplicateBridge &&
      !reviewLeak &&
      !blogLeak &&
      !orphanHyphen &&
      boilerplateHits <= 2 &&
      voice.ok &&
      (hasBullets || /(?:운영|예약|입고|안내|개장)/.test(text)),
    duplicateBridge,
    reviewLeak,
    blogLeak,
    boilerplateHits,
    orphanHyphen,
    voice,
    hasBullets,
  };
}
