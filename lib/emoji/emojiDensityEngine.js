/**
 * 채널·브랜드별 이모지 밀도
 * none 0~1 | low 1~3 | medium 3~6 | high 6+
 * Hook·마무리·CTA 포인트만 (문장마다 남발 금지)
 */

export const EMOJI_DENSITY_OPTIONS = [
  { value: "none", label: "없음" },
  { value: "low", label: "하" },
  { value: "medium", label: "중" },
  { value: "high", label: "상" },
];

export const DENSITY_RULES = {
  none: { min: 0, max: 1, hook: 0, cta: 0 },
  low: { min: 1, max: 2, hook: 1, cta: 0 },
  medium: { min: 3, max: 5, hook: 1, cta: 1 },
  high: { min: 5, max: 8, hook: 1, cta: 1 },
};

export const CHANNEL_ALLOWED = {
  blog: ["none", "low", "medium"],
  smartplace: ["low", "medium"],
  place: ["low", "medium"],
  instagram: ["medium", "high"],
  insta: ["medium", "high"],
};

const GPT_EMOJI_SPAM = /([🌷✨🤍💐🌸☕️🔥💫])\s*([🌷✨🤍💐🌸☕️🔥💫])+/g;

const INDUSTRY_EMOJI = {
  flower: ["🌷", "💐"],
  cafe: ["☕"],
  hospital: [],
  furniture: [],
  carwash: ["✨"],
  default: [],
};

function countEmoji(text) {
  const m = String(text || "").match(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu
  );
  return m?.length || 0;
}

function clampDensity(requested, channel) {
  const allowed = CHANNEL_ALLOWED[channel] || CHANNEL_ALLOWED.blog;
  if (allowed.includes(requested)) return requested;
  return allowed[allowed.length - 1] || "low";
}

export function resolveEmojiDensity(ctx, channel = "blog") {
  const fromBrand =
    ctx.brandMemory?.emojiDensity ||
    ctx.brandMemory?.emojiLevel ||
    ctx.emojiDensity;
  const mapped =
    fromBrand === "low"
      ? "low"
      : fromBrand === "high"
        ? "high"
        : fromBrand === "none"
          ? "none"
          : fromBrand || "low";
  const ch = channel === "instagram" || channel === "insta" ? channel : channel;
  if (
    !fromBrand &&
    (ch === "instagram" || ch === "insta") &&
    !ctx.emojiDensity
  ) {
    return clampDensity("medium", channel);
  }
  return clampDensity(mapped, channel);
}

function stripEmojiSpam(text) {
  return String(text || "")
    .replace(GPT_EMOJI_SPAM, "$1")
    .replace(/([🌷✨🤍])\1+/g, "$1");
}

function addEmojiAtEnd(line, emoji, maxPerLine = 1) {
  if (!emoji || !line) return line;
  if (countEmoji(line) >= maxPerLine) return line;
  if (line.includes(emoji)) return line;
  return `${line.trim()} ${emoji}`;
}

export function applyEmojiDensity(pack, channel, ctx) {
  const density = resolveEmojiDensity(ctx, channel);
  const rules = DENSITY_RULES[density] || DENSITY_RULES.low;
  const industry = ctx.industryKey || ctx.legacyIndustryKey || "default";
  const pool = INDUSTRY_EMOJI[industry] || INDUSTRY_EMOJI.default;
  const emoji = pool[0] || "";

  if (density === "none" || !emoji) {
    return scrubEmojiFromPack(pack, channel);
  }

  if (channel === "blog" || !pack) return pack;

  if (channel === "place" || channel === "smartplace") {
    const title = addEmojiAtEnd(pack.title, emoji, rules.hook);
    let next = { ...pack, title: stripEmojiSpam(title) };
    if (rules.cta && pack.cta) {
      next.cta = addEmojiAtEnd(pack.cta, emoji, 1);
    }
    return next;
  }

  if (channel === "instagram" || channel === "insta") {
    const poolEmoji = pool.length > 1 ? pool : [emoji, "✨", "🤍"].filter(Boolean);
    const hook = rules.hook
      ? addEmojiAtEnd(pack.hook, poolEmoji[0], 1)
      : pack.hook;
    let body = pack.body || "";
    let ending = pack.ending;
    if (density === "high" && body) {
      const lines = body.split("\n").filter(Boolean);
      if (lines.length >= 2 && poolEmoji[1]) {
        lines[1] = addEmojiAtEnd(lines[1], poolEmoji[1], 1);
      }
      body = lines.join("\n");
    }
    if (rules.cta && ending) {
      ending = addEmojiAtEnd(
        ending.replace(/[🌷✨🤍💐]/g, "").trim(),
        poolEmoji[density === "high" ? 1 : 0] || emoji,
        1
      );
    }
    const lineBreakBody = [hook, body, ending].filter(Boolean).join("\n\n");
    return {
      ...pack,
      hook: stripEmojiSpam(hook),
      body: stripEmojiSpam(body),
      ending: stripEmojiSpam(ending || ""),
      lineBreakBody: stripEmojiSpam(lineBreakBody),
      legacyBody: stripEmojiSpam(lineBreakBody),
    };
  }

  return pack;
}

function scrubEmojiFromPack(pack, channel) {
  const scrub = (t) =>
    String(t || "").replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
      ""
    ).trim();

  if (channel === "place" || channel === "smartplace") {
    return {
      ...pack,
      title: scrub(pack.title),
      cta: scrub(pack.cta),
    };
  }
  if (channel === "instagram" || channel === "insta") {
    return {
      ...pack,
      hook: scrub(pack.hook),
      body: scrub(pack.body),
      ending: scrub(pack.ending),
    };
  }
  return pack;
}

export function enforceEmojiBudget(fullText, density, channel) {
  const rules = DENSITY_RULES[clampDensity(density, channel)] || DENSITY_RULES.low;
  let t = stripEmojiSpam(fullText);
  while (countEmoji(t) > rules.max) {
    t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, "");
  }
  return t;
}
