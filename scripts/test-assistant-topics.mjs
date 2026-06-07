/**
 * 도움말 빠른 답변 — 제품 UI·설정과 일치 회귀
 */
import { matchQuickReply } from "../lib/assistant/matchTopic.js";
import { QUICK_PROMPTS, QUICK_TEXT } from "../lib/assistant/knowledge.js";
import { FORM_ADVANCED_SECTION } from "../lib/assistant/productGuide.js";
import { CHANNEL_PRODUCTS } from "../lib/channels/channelProducts.js";
import { V4_SPEAKER_OPTIONS } from "../lib/persona/v4Speakers.js";

const plainReviewLabel = V4_SPEAKER_OPTIONS.find(
  (o) => o.value === "plain_review"
)?.label;

const cases = [
  {
    message: QUICK_TEXT.research,
    topic: "자료조사",
    must: ["자료조사", FORM_ADVANCED_SECTION, "플레이스"],
  },
  {
    message: QUICK_TEXT.speaker,
    topic: "화자",
    must: [plainReviewLabel, FORM_ADVANCED_SECTION, "방문"],
  },
  {
    message: QUICK_TEXT.quality,
    topic: "콘텐츠코칭",
    must: [FORM_ADVANCED_SECTION, "자료조사", plainReviewLabel],
  },
  {
    message: QUICK_TEXT.emoji,
    topic: "이모지",
    must: [FORM_ADVANCED_SECTION, CHANNEL_PRODUCTS.growth.menuLabel],
    mustNot: ["편의·습관"],
  },
  {
    message: "플레이스 인스타 채널 연동",
    topic: "채널",
    must: [CHANNEL_PRODUCTS.insta.menuLabel, "인스타 캡션"],
    mustNot: ["편의·습관"],
  },
  {
    message: "생성 오류 안 나와요",
    topic: "검수",
    must: ["자료조사", "재시도"],
  },
  {
    message: QUICK_TEXT.start,
    topic: "시작하기",
    must: ["휴대폰", FORM_ADVANCED_SECTION],
  },
];

for (const c of cases) {
  const hit = matchQuickReply(c.message, { loggedIn: true });
  if (!hit) {
    console.error("FAIL: no reply for", c.message);
    process.exit(1);
  }
  if (hit.topic !== c.topic) {
    console.error("FAIL: topic", c.message, hit.topic, "expected", c.topic);
    process.exit(1);
  }
  for (const frag of c.must) {
    if (!hit.reply.includes(frag)) {
      console.error("FAIL: missing", frag, "in", c.message);
      console.error(hit.reply);
      process.exit(1);
    }
  }
  for (const bad of c.mustNot || []) {
    if (hit.reply.includes(bad)) {
      console.error("FAIL: stale phrase", bad, "in", c.message);
      process.exit(1);
    }
  }
}

for (const q of QUICK_PROMPTS) {
  if (!QUICK_TEXT[q.id]) {
    console.error("FAIL: missing QUICK_TEXT for", q.id);
    process.exit(1);
  }
}

const stale = matchQuickReply("이모지 어디서 바꿔요", { loggedIn: true });
if (stale?.reply?.includes("편의·습관")) {
  console.error("FAIL: emoji reply still mentions 편의·습관");
  process.exit(1);
}

console.log("OK assistant-topics");
console.log("  quick prompts:", QUICK_PROMPTS.length);
