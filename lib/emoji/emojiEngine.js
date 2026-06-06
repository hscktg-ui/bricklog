/**
 * BRICLOG EMOJI ENGINE
 * 정보 구분 · 시선 집중 · 가독성 — 문장 꾸미기용 남발 금지
 * 채널 기본값: 블로그=사용안함 · 플레이스=적게 · 인스타=보통
 */
import { getChannelFullText } from "@/lib/content/channelPack";

export const EMOJI_DENSITY_OPTIONS = [
  { value: "none", label: "사용안함", min: 0, max: 0 },
  { value: "low", label: "적게", min: 1, max: 3 },
  { value: "medium", label: "보통", min: 4, max: 8 },
  { value: "high", label: "많이", min: 8, max: 15 },
];

export const EMOJI_LEVEL_RULES = {
  none: { min: 0, max: 0, label: "사용안함" },
  low: { min: 1, max: 3, label: "적게" },
  medium: { min: 4, max: 8, label: "보통" },
  high: { min: 8, max: 15, label: "많이" },
};

export const CHANNEL_EMOJI_DEFAULTS = {
  blog: "none",
  place: "low",
  smartplace: "low",
  instagram: "medium",
  insta: "medium",
};

export const COMMON_EMOJI = ["📍", "✔", "🔎", "📌"];
export const CHECK_EMOJI = "✔";

/** @type {Record<string, string[]>} */
export const INDUSTRY_EMOJI_POOL = {
  furniture: ["🛏", "🏠", "✔", "📌"],
  flower: ["💐", "🌷", "🌿", "🎁"],
  cafe: ["☕", "🥐", "📍"],
  pet_cafe: ["🐾", "☕", "📍"],
  hospital: ["🏥", "✔", "📋"],
  officetel: ["🏢", "📍", "🏠"],
  laundry: ["👕", "🧺", "✔"],
  carwash: ["✔", "📍", "🔎"],
  saas: ["📌", "🔎", "✔"],
  default: ["📍", "✔", "🔎", "📌"],
};

export const EMOJI_ENGINE_BRIEF = `【BRICLOG · 이모지 엔진】
- 이모지는 문장 꾸미기가 아니라 정보 구분·시선 집중·가독성용이다.
- 첫 문장·소제목·체크포인트·CTA 위주. 문장 끝마다 반복 금지. 한 줄당 1개 이하.
- 금지: 😍😍😍 / ✨✨✨ / 💙💙💙 같은 연속 나열.`;

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const SPAM_CHAIN_RE = /([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\1{2,}/gu;
const SAME_EMOJI_ROW_RE = /([🌷✨🤍💐🌸☕🔥💫😍💙🛏🏠📍✔🔎📌🏥💐🥐👕🧺🏢📋🎁🌿])\s*\1+/g;

const LEGACY_INSTA_MAP = {
  minimal: "low",
  balanced: "medium",
  heavy: "high",
};

function normalizeChannel(channel = "blog") {
  if (channel === "smartplace") return "place";
  if (channel === "insta") return "instagram";
  return channel;
}

export function mapIndustryEmojiKey(ctx = {}) {
  const blob = `${ctx.industry || ctx.industryLabel || ctx.industryText || ctx.industryKey || ""} ${ctx.topic || ctx.mainKeyword || ""}`.toLowerCase();
  if (/가구|침대|매트리스|모션|furniture|bed/.test(blob)) return "furniture";
  if (/꽃|플라워|flower|플로리스트|화환/.test(blob)) return "flower";
  if (/애견\s*카페|반려견\s*카페|펫\s*카페|도그\s*cafe|댕댕이\s*카페/.test(blob)) return "pet_cafe";
  if (/카페|cafe|베이커리|브런치|커피/.test(blob)) return "cafe";
  if (/반려|펫|애견|강아지|고양이|pet\b/.test(blob)) return "pet";
  if (/병원|의원|치과|한의|clinic|hospital|검진/.test(blob)) return "hospital";
  if (/오피스텔|원룸|오피/.test(blob)) return "officetel";
  if (/세탁|laundry|클린|드라이/.test(blob)) return "laundry";
  if (/세차|carwash/.test(blob)) return "carwash";
  if (/saas|software|플랫폼|b2b/.test(blob)) return "saas";
  const key = String(ctx.industryKey || ctx.legacyIndustryKey || "").trim();
  if (key && INDUSTRY_EMOJI_POOL[key]) return key;
  return "default";
}

export function getIndustryEmojiPool(ctx = {}) {
  const key = mapIndustryEmojiKey(ctx);
  const industry = INDUSTRY_EMOJI_POOL[key] || INDUSTRY_EMOJI_POOL.default;
  return [...new Set([...industry, ...COMMON_EMOJI])];
}

export function resolveEmojiLevel(ctx = {}, channel = "blog") {
  const ch = normalizeChannel(channel);

  if (ch === "instagram" || ch === "insta") {
    const insta = ctx.instaEmojiLevel;
    if (insta) {
      return (
        LEGACY_INSTA_MAP[insta] ||
        (EMOJI_LEVEL_RULES[insta] ? insta : null) ||
        "medium"
      );
    }
  }

  let level =
    ctx.emojiDensity ||
    ctx.brandMemory?.emojiDensity ||
    ctx.brandMemory?.emojiLevel ||
    null;

  if (!level) {
    level = CHANNEL_EMOJI_DEFAULTS[ch] || "none";
  }

  if (!EMOJI_LEVEL_RULES[level]) {
    level = CHANNEL_EMOJI_DEFAULTS[ch] || "none";
  }

  return level;
}

/** @deprecated */ export const resolveEmojiDensity = resolveEmojiLevel;

export function countEmoji(text = "") {
  return (String(text).match(EMOJI_RE) || []).length;
}

export function stripAllEmoji(text = "") {
  return String(text || "")
    .replace(EMOJI_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function stripEmojiSpam(text = "") {
  return String(text || "")
    .replace(SPAM_CHAIN_RE, "$1")
    .replace(SAME_EMOJI_ROW_RE, "$1")
    .replace(/([😍✨💙🤍🔥💫])\1+/g, "$1");
}

export function enforceOneEmojiPerLine(text = "") {
  const lines = String(text || "").split("\n");
  return lines
    .map((line) => {
      const emojis = line.match(EMOJI_RE) || [];
      if (emojis.length <= 1) return stripEmojiSpam(line);
      let kept = 0;
      return stripEmojiSpam(
        line.replace(EMOJI_RE, (m) => {
          kept += 1;
          return kept === 1 ? m : "";
        })
      )
        .replace(/\s{2,}/g, " ")
        .trim();
    })
    .join("\n");
}

function prefixEmojiOnce(line, emoji) {
  const s = String(line || "").trim();
  if (!s || !emoji) return s;
  if (countEmoji(s) >= 1) return enforceOneEmojiPerLine(s);
  if (s.startsWith(emoji)) return s;
  return `${emoji} ${s}`;
}

function isCheckpointLine(line = "") {
  const s = String(line).trim();
  if (!s) return false;
  return (
    /^[-·•]/.test(s) ||
    /^(\d+[.)]|✔|☑)/.test(s) ||
    /확인|체크|포인트|체크리스트|체크포인트/.test(s) ||
    (s.length <= 22 && /각도|분산|궁합|예약|방문|비용|일정/.test(s))
  );
}

function trimTextToEmojiBudget(text, min, max) {
  let t = enforceOneEmojiPerLine(stripEmojiSpam(text));
  while (countEmoji(t) > max) {
    const matches = [...t.matchAll(EMOJI_RE)];
    if (matches.length <= max) break;
    const last = matches[matches.length - 1];
    t = `${t.slice(0, last.index)}${t.slice(last.index + last[0].length)}`.replace(/\s{2,}/g, " ").trim();
  }
  return t;
}

function applyChecklistEmojis(body, pool, budget) {
  let used = 0;
  const lines = String(body || "").split("\n");
  const out = lines.map((line, i) => {
    if (used >= budget.max) return enforceOneEmojiPerLine(line);
    const trimmed = line.trim();
    if (!trimmed || countEmoji(trimmed)) {
      return enforceOneEmojiPerLine(stripEmojiSpam(line));
    }
    if (isCheckpointLine(trimmed)) {
      used += 1;
      return prefixEmojiOnce(trimmed.replace(/^[-·•]\s*/, ""), CHECK_EMOJI);
    }
    if (
      trimmed.length <= 32 &&
      i > 0 &&
      !trimmed.endsWith(".") &&
      !trimmed.endsWith("?") &&
      used < budget.max
    ) {
      used += 1;
      const emoji = pool[used % pool.length] || CHECK_EMOJI;
      return prefixEmojiOnce(trimmed, emoji);
    }
    return enforceOneEmojiPerLine(stripEmojiSpam(line));
  });
  return { text: out.join("\n"), used };
}

function scrubEmojiPack(pack, channel) {
  const ch = normalizeChannel(channel);
  if (ch === "place") {
    return {
      ...pack,
      title: stripAllEmoji(pack.title),
      shortNotice: stripAllEmoji(pack.shortNotice),
      shortBody: stripAllEmoji(pack.shortBody),
      detailBody: stripAllEmoji(pack.detailBody),
      body: stripAllEmoji(pack.body),
      cta: stripAllEmoji(pack.cta),
    };
  }
  if (ch === "instagram") {
    const hook = stripAllEmoji(pack.hook);
    const body = stripAllEmoji(pack.body);
    const ending = stripAllEmoji(pack.ending);
    const lineBreakBody = stripAllEmoji(pack.lineBreakBody || [hook, body, ending].filter(Boolean).join("\n\n"));
    return {
      ...pack,
      hook,
      body,
      ending,
      lineBreakBody,
      legacyBody: lineBreakBody,
    };
  }
  if (ch === "blog" && pack?.sections) {
    return {
      ...pack,
      title: stripAllEmoji(pack.title),
      representativeTitle: stripAllEmoji(pack.representativeTitle),
      conclusion: stripAllEmoji(pack.conclusion),
      sections: (pack.sections || []).map((s) => ({
        ...s,
        heading: stripAllEmoji(s.heading),
        body: stripAllEmoji(s.body),
      })),
    };
  }
  return pack;
}

function applyBlogEmoji(pack, level, pool, rules) {
  let used = 0;
  const sections = (pack.sections || []).map((sec, i) => {
    let heading = String(sec.heading || "").trim();
    let body = String(sec.body || "").trim();
    if (i === 0 && heading && used < rules.max) {
      heading = prefixEmojiOnce(heading, pool[0] || "📌");
      used += countEmoji(heading);
    } else if (i > 0 && i <= 3 && level !== "low" && heading && !countEmoji(heading) && used < rules.max) {
      heading = prefixEmojiOnce(heading, pool[i % pool.length] || CHECK_EMOJI);
      used += 1;
    }
    const enriched = applyChecklistEmojis(body, pool, {
      min: rules.min,
      max: Math.max(rules.min, rules.max - used),
    });
    body = enriched.text;
    used += enriched.used;
    return { ...sec, heading: enforceOneEmojiPerLine(heading), body: enforceOneEmojiPerLine(body) };
  });
  let conclusion = pack.conclusion;
  if (level !== "low" && conclusion && used < rules.max && !countEmoji(conclusion)) {
    conclusion = prefixEmojiOnce(conclusion, "📍");
  }
  const full = getChannelFullText({ ...pack, sections, conclusion }, "blog");
  const budgeted = trimTextToEmojiBudget(full, rules.min, rules.max);
  return {
    ...pack,
    sections,
    conclusion: enforceOneEmojiPerLine(conclusion),
    _meta: {
      ...(pack._meta || {}),
      emojiEngine: { level, channel: "blog", budget: rules, applied: countEmoji(budgeted) },
    },
  };
}

function applyPlaceEmoji(pack, level, pool, rules) {
  let title = pack.title;
  let shortBody = pack.shortBody || pack.shortNotice;
  let detailBody = pack.detailBody || "";
  let used = 0;

  if (title && used < rules.max) {
    title = prefixEmojiOnce(title, pool[0] || "📍");
    used += countEmoji(title);
  }
  if (shortBody && used < rules.max && level !== "none") {
    shortBody = prefixEmojiOnce(shortBody, "📌");
    used += 1;
  }
  const detail = applyChecklistEmojis(detailBody, pool, {
    min: Math.max(0, rules.min - used),
    max: rules.max - used,
  });
  detailBody = detail.text;
  used += detail.used;

  const body = [shortBody, detailBody].filter(Boolean).join("\n\n");
  const trimmed = trimTextToEmojiBudget(
    [title, shortBody, detailBody].filter(Boolean).join("\n"),
    rules.min,
    rules.max
  );

  return {
    ...pack,
    title: enforceOneEmojiPerLine(stripEmojiSpam(title)),
    shortNotice: enforceOneEmojiPerLine(stripEmojiSpam(shortBody)),
    shortBody: enforceOneEmojiPerLine(stripEmojiSpam(shortBody)),
    detailBody: enforceOneEmojiPerLine(stripEmojiSpam(detailBody)),
    body: enforceOneEmojiPerLine(stripEmojiSpam(body)),
    _meta: {
      ...(pack._meta || {}),
      emojiEngine: { level, channel: "place", budget: rules, applied: countEmoji(trimmed) },
    },
  };
}

function applyInstagramEmoji(pack, level, pool, rules) {
  let hook = pack.hook || "";
  let body = pack.body || pack.lineBreakBody || "";
  let ending = pack.ending || "";
  let used = 0;

  if (hook && used < rules.max) {
    hook = prefixEmojiOnce(hook, pool[0] || "📌");
    used += countEmoji(hook);
  }

  const bodyEnriched = applyChecklistEmojis(body, pool, {
    min: Math.max(0, rules.min - used),
    max: rules.max - used,
  });
  body = bodyEnriched.text;
  used += bodyEnriched.used;

  if (ending && used < rules.max) {
    ending = prefixEmojiOnce(ending, "📍");
    used += 1;
  }

  hook = enforceOneEmojiPerLine(stripEmojiSpam(hook));
  body = enforceOneEmojiPerLine(stripEmojiSpam(body));
  ending = enforceOneEmojiPerLine(stripEmojiSpam(ending));
  const lineBreakBody = trimTextToEmojiBudget(
    [hook, body, ending].filter(Boolean).join("\n\n"),
    rules.min,
    rules.max
  );

  return {
    ...pack,
    hook,
    body,
    ending,
    lineBreakBody,
    legacyBody: lineBreakBody,
    _meta: {
      ...(pack._meta || {}),
      emojiEngine: { level, channel: "instagram", budget: rules, applied: countEmoji(lineBreakBody) },
    },
  };
}

/**
 * @param {object} pack
 * @param {string} channel
 * @param {object} ctx
 */
export function applyEmojiEngine(pack, channel = "blog", ctx = {}) {
  if (!pack) return pack;
  const ch = normalizeChannel(channel);
  const level = resolveEmojiLevel(ctx, ch);
  const rules = EMOJI_LEVEL_RULES[level] || EMOJI_LEVEL_RULES.none;
  const pool = getIndustryEmojiPool(ctx);

  if (level === "none" || rules.max === 0) {
    const scrubbed = scrubEmojiPack(pack, ch);
    return {
      ...scrubbed,
      _meta: {
        ...(scrubbed._meta || {}),
        emojiEngine: { level: "none", channel: ch, applied: 0 },
      },
    };
  }

  if (ch === "blog") {
    return applyBlogEmoji(pack, level, pool, rules);
  }
  if (ch === "place") {
    return applyPlaceEmoji(pack, level, pool, rules);
  }
  if (ch === "instagram") {
    return applyInstagramEmoji(pack, level, pool, rules);
  }
  return pack;
}

/** @deprecated */ export const applyEmojiDensity = applyEmojiEngine;

export function enforceEmojiBudget(fullText, level, channel = "blog") {
  const rules = EMOJI_LEVEL_RULES[resolveEmojiLevel({ emojiDensity: level }, channel)] || EMOJI_LEVEL_RULES.none;
  if (rules.max === 0) return stripAllEmoji(fullText);
  return trimTextToEmojiBudget(fullText, rules.min, rules.max);
}

export function formatEmojiEngineBrief(ctx = {}, channel = "blog") {
  const ch = normalizeChannel(channel);
  const level = resolveEmojiLevel(ctx, ch);
  const rules = EMOJI_LEVEL_RULES[level];
  const pool = getIndustryEmojiPool(ctx).slice(0, 6).join(" ");
  return [
    EMOJI_ENGINE_BRIEF,
    `채널: ${ch} · 이모지: ${rules.label} (${rules.min}~${rules.max}개)`,
    `업종 풀: ${pool || COMMON_EMOJI.join(" ")}`,
    "문장 끝 이모지 반복·연속 나열 금지.",
  ].join("\n");
}
