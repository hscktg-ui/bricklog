/**
 * BRICLOG Emoji Engine — 밀도·채널 기본값·스팸 차단
 */
import {
  applyEmojiEngine,
  resolveEmojiLevel,
  countEmoji,
  stripAllEmoji,
  CHANNEL_EMOJI_DEFAULTS,
  EMOJI_LEVEL_RULES,
  getIndustryEmojiPool,
} from "../lib/emoji/emojiEngine.js";
import { buildPlaceFromBlog } from "../styles/channels/placeStyle.js";
import { buildInstagramFromBlog } from "../styles/channels/instagramStyle.js";

const base = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
  industry: "가구/침대",
  emojiDensity: "none",
};

console.log("\n=== BRICLOG EMOJI ENGINE ===\n");

if (resolveEmojiLevel(base, "blog") !== "none") {
  console.error("FAIL: blog default should be none");
  process.exit(1);
}
if (resolveEmojiLevel({}, "place") !== "low") {
  console.error("FAIL: place default should be low");
  process.exit(1);
}
if (resolveEmojiLevel({}, "instagram") !== "medium") {
  console.error("FAIL: insta default should be medium");
  process.exit(1);
}

const pool = getIndustryEmojiPool(base);
if (!pool.includes("🛏")) {
  console.error("FAIL: furniture pool missing bed emoji", pool);
  process.exit(1);
}

const spamPack = {
  hook: "😍😍😍😍😍",
  body: "✨✨✨✨✨\n💙💙💙💙💙",
  ending: "확인",
};
const cleaned = applyEmojiEngine(spamPack, "instagram", {
  ...base,
  instaEmojiLevel: "medium",
});
const spamCount = countEmoji(
  [cleaned.hook, cleaned.body, cleaned.ending].join("\n")
);
if (spamCount > EMOJI_LEVEL_RULES.medium.max) {
  console.error("FAIL: spam not trimmed", spamCount);
  process.exit(1);
}
if (/😍{2,}|✨{2,}/.test([cleaned.hook, cleaned.body].join(""))) {
  console.error("FAIL: consecutive emoji spam remains");
  process.exit(1);
}

const noneBlog = applyEmojiEngine(
  {
    title: "테스트 🛏",
    sections: [{ heading: "🛏 제목", body: "본문 ✨✨" }],
    conclusion: "끝 📍",
  },
  "blog",
  { ...base, emojiDensity: "none" }
);
if (countEmoji(JSON.stringify(noneBlog)) > 0) {
  console.error("FAIL: blog none should strip all emoji");
  process.exit(1);
}

const blogCtx = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 체험",
  industry: "furniture",
  industryKey: "furniture",
  emojiDensity: "low",
  sections: [
    {
      heading: "체험 전 확인",
      body: "헤드 각도\n다리 각도\n체압 분산\n매트리스 궁합",
    },
  ],
  conclusion: "매장 방문 안내",
};
const blogPack = applyEmojiEngine(
  {
    title: "평택 템퍼",
    representativeTitle: "평택 템퍼",
    sections: blogCtx.sections,
    conclusion: blogCtx.conclusion,
  },
  "blog",
  blogCtx
);
const blogEmoji = countEmoji(JSON.stringify(blogPack));
if (blogEmoji < EMOJI_LEVEL_RULES.low.min || blogEmoji > EMOJI_LEVEL_RULES.low.max) {
  console.error("FAIL: blog low emoji count", blogEmoji, EMOJI_LEVEL_RULES.low);
  process.exit(1);
}

const instaPack = applyEmojiEngine(
  {
    hook: "모션베드 체험 전",
    body: "확인할 것\n헤드 각도\n다리 각도\n체압 분산",
    ending: "플레이스에서 시간 확인",
  },
  "instagram",
  { ...base, instaEmojiLevel: "medium", industry: "furniture" }
);
const instaEmoji = countEmoji(instaPack.lineBreakBody || "");
if (instaEmoji < EMOJI_LEVEL_RULES.medium.min || instaEmoji > EMOJI_LEVEL_RULES.medium.max + 2) {
  console.error("FAIL: insta medium count", instaEmoji);
  process.exit(1);
}
const lines = (instaPack.body || "").split("\n");
for (const line of lines) {
  if (countEmoji(line) > 1) {
    console.error("FAIL: more than 1 emoji per line", line);
    process.exit(1);
  }
}

console.log("OK: channel defaults", CHANNEL_EMOJI_DEFAULTS);
console.log("OK: blog low =", blogEmoji, "insta medium =", instaEmoji);
console.log("OK: spam cleaned to", spamCount);
console.log("\nALL EMOJI ENGINE CHECKS OK\n");
