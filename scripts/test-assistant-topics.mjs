/**
 * 도움말 빠른 답변 — 현황 주제 회귀
 */
import { matchQuickReply } from "../lib/assistant/matchTopic.js";
import { QUICK_PROMPTS, QUICK_TEXT } from "../lib/assistant/knowledge.js";

const cases = [
  {
    message: QUICK_TEXT.research,
    topic: "자료조사",
    must: ["자료조사", "팩트", "플레이스"],
  },
  {
    message: QUICK_TEXT.speaker,
    topic: "화자",
    must: ["화자", "방문", "후기"],
  },
  {
    message: QUICK_TEXT.quality,
    topic: "콘텐츠코칭",
    must: ["자료조사", "화자", "템플릿"],
  },
  {
    message: "플레이스 인스타 채널 연동",
    topic: "채널",
    must: ["자료조사", "플레이스"],
  },
  {
    message: "생성 오류 안 나와요",
    topic: "검수",
    must: ["자료조사", "재시도"],
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
}

for (const q of QUICK_PROMPTS) {
  if (!QUICK_TEXT[q.id]) {
    console.error("FAIL: missing QUICK_TEXT for", q.id);
    process.exit(1);
  }
}

console.log("OK assistant-topics");
console.log("  quick prompts:", QUICK_PROMPTS.length);
