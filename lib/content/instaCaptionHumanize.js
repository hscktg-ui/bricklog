/**
 * 인스타 캡션 — 블로그식 접속어(이어서·마지막으로) 제거, 사람이 쓴 피드 톤
 */
const INSTA_BRIDGE_LINE_RE = /^(이어서|그\s*흐름|마지막으로|같은\s*기준으로|정리하면|그다음)\s*/i;
const INSTA_INLINE_BRIDGE_RE = /(?:^|\s)(?:이어서|마지막으로)(?:\s+(?:이어서|마지막으로))+/g;
const INSTA_BLOG_ARC_RE =
  /^(?:📍|🔎|✔)\s*|왜\s+.+\s*찾게\s*됐|매장\s*안내를\s*찾게|새\s*브랜드|순간이했습니다|마음에\s*들해요/gi;

/** @param {string} text */
export function stripInstaBridgeSpam(text = "") {
  let t = String(text || "").trim();
  if (!t) return t;

  for (let round = 0; round < 6; round += 1) {
    const prev = t;
    t = t
      .replace(/(?:이어서\s*){2,}/gi, "")
      .replace(/(?:마지막으로\s*){2,}/gi, "마지막으로 ")
      .replace(INSTA_INLINE_BRIDGE_RE, " ")
      .split(/\n+/)
      .map((line) => line.replace(INSTA_BRIDGE_LINE_RE, "").replace(/\s{2,}/g, " ").trim())
      .filter(Boolean)
      .join("\n\n");
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    if (t === prev) break;
  }
  return t;
}

/** @param {string} text */
export function polishInstaCaptionLine(text = "") {
  let line = stripInstaBridgeSpam(text);
  line = line
    .replace(/\s*—\s*[^.\n]{0,40}기준으로\s*보면\s*비교·예약\s*판단이\s*수월[^.\n]*/gi, "")
    .replace(INSTA_BLOG_ARC_RE, "")
    .replace(/안내(?:드립|해)\s*니다/gi, "")
    .replace(/확인(?:해\s*)?주세요/gi, "보면 돼요")
    .replace(/알아보시다\s*보면/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return line;
}

/** @param {object} pack */
export function humanizeInstaCaptionPack(pack = {}) {
  if (!pack) return pack;
  const bodyKey = pack.lineBreakBody ? "lineBreakBody" : "body";
  const rawBody = String(pack[bodyKey] || pack.body || "").trim();

  let parts = [];
  if (rawBody && (pack.lineBreakBody || (!pack.hook && !pack.ending))) {
    parts = rawBody.split(/\n+/).map((line) => polishInstaCaptionLine(line)).filter(Boolean);
  } else {
    parts = [pack.hook, rawBody, pack.ending]
      .map((chunk) => polishInstaCaptionLine(chunk))
      .filter(Boolean);
    if (parts.length === 1 && rawBody.includes("\n")) {
      parts = rawBody.split(/\n+/).map((line) => polishInstaCaptionLine(line)).filter(Boolean);
    }
  }

  const seen = new Set();
  const unique = [];
  for (const line of parts) {
    const key = line.replace(/\s/g, "");
    if (key.length >= 24 && seen.has(key)) continue;
    const shortKey = line.replace(/\s/g, "").slice(0, 80);
    if (seen.has(shortKey)) continue;
    seen.add(key);
    seen.add(shortKey);
    unique.push(line);
  }

  const lineBreakBody = unique.join("\n\n").trim();
  const nextHook = unique[0] || "";
  const nextEnding = unique.length > 1 ? unique[unique.length - 1] : "";
  const nextBody =
    unique.length > 2
      ? unique.slice(1, -1).join("\n\n")
      : unique.length === 2
        ? ""
        : unique[1] || "";

  return {
    ...pack,
    hook: nextHook,
    body: bodyKey === "lineBreakBody" ? lineBreakBody : nextBody || rawBody,
    [bodyKey]: lineBreakBody || rawBody,
    ending: nextEnding,
    _meta: {
      ...(pack._meta || {}),
      instaCaptionHumanized: true,
    },
  };
}

/** @param {string} full */
export function assessInstaCaptionHumanTone(full = "") {
  const text = String(full || "");
  const duplicateBridge = /(?:이어서\s*){2,}|이어서.{0,24}이어서/i.test(text);
  const blogLeak = /정리하면|알아보시다|소제목|결론적으로/i.test(text);
  const lineCount = text.split(/\n+/).filter((l) => l.trim()).length;
  return {
    ok: !duplicateBridge && !blogLeak && lineCount >= 2,
    duplicateBridge,
    blogLeak,
    lineCount,
  };
}
