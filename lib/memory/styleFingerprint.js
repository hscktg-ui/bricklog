/**
 * 문장·이모지·톤 지문 — 동결로(전글 톤 유지) 아키텍처용
 */

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|[\uD83C-\uDBFF\uDC00-\uDFFF]+/gu;

function avgSentenceLength(text) {
  const parts = String(text || "")
    .split(/[.!?…]\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
  if (!parts.length) return null;
  const sum = parts.reduce((a, s) => a + s.length, 0);
  return Math.round(sum / parts.length);
}

function emojiDensityLabel(text) {
  const t = String(text || "");
  if (!t.length) return "none";
  const em = (t.match(EMOJI_RE) || []).length;
  const ratio = em / Math.max(t.replace(/\s/g, "").length, 1);
  if (ratio < 0.002) return "none";
  if (ratio < 0.012) return "low";
  if (ratio < 0.035) return "medium";
  return "high";
}

function lengthBand(avg) {
  if (avg == null) return "medium";
  if (avg < 28) return "short";
  if (avg > 52) return "long";
  return "medium";
}

/**
 * @param {string} text
 * @param {{ channel?: string, toneTags?: string[] }} [meta]
 */
export function computeStyleFingerprint(text, meta = {}) {
  const plain = String(text || "").replace(/\s+/g, " ").trim();
  const avg = avgSentenceLength(plain);
  const emoji = emojiDensityLabel(plain);
  const toneTags = [...(meta.toneTags || [])].filter(Boolean).slice(0, 6);
  return {
    avgSentenceLength: avg,
    sentenceLengthBand: lengthBand(avg),
    emojiDensity: emoji,
    toneTags,
    charCount: plain.length,
    channel: meta.channel || null,
    sampledAt: new Date().toISOString(),
  };
}

/**
 * @param {string} fullContent
 * @param {{ title?: string, channel?: string }} [item]
 */
export function contentItemStyleSummary(fullContent, item = {}) {
  const fp = computeStyleFingerprint(fullContent, {
    channel: item.channel,
    toneTags: item.persona ? [item.persona] : [],
  });
  const title = item.title ? String(item.title).slice(0, 60) : "";
  const excerpt = String(fullContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  return {
    channel: item.channel || "blog",
    title,
    excerpt: excerpt + (fullContent?.length > 140 ? "…" : ""),
    fingerprint: fp,
    createdAt: item.created_at || null,
  };
}

export function mergeFingerprints(samples = []) {
  if (!samples.length) return null;
  const bands = {};
  const emojis = {};
  let avgSum = 0;
  let avgN = 0;
  const toneSet = new Set();
  for (const s of samples) {
    const fp = s.fingerprint || s;
    if (fp.sentenceLengthBand) {
      bands[fp.sentenceLengthBand] = (bands[fp.sentenceLengthBand] || 0) + 1;
    }
    if (fp.emojiDensity) {
      emojis[fp.emojiDensity] = (emojis[fp.emojiDensity] || 0) + 1;
    }
    if (typeof fp.avgSentenceLength === "number") {
      avgSum += fp.avgSentenceLength;
      avgN += 1;
    }
    for (const t of fp.toneTags || []) toneSet.add(t);
  }
  const topBand = Object.entries(bands).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topEmoji = Object.entries(emojis).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    sentenceLengthBand: topBand || "medium",
    emojiDensity: topEmoji || "low",
    avgSentenceLength: avgN ? Math.round(avgSum / avgN) : null,
    toneTags: [...toneSet].slice(0, 5),
    sampleCount: samples.length,
  };
}
