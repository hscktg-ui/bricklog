process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import { lineViolatesHomeRegion, stripForeignRegionSentences } from "@/lib/content/regionVoiceLock.js";
import { applyHumanConversationalVoice } from "@/lib/content/humanConversationalVoice.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

const input = {
  brandName: "루트앤컷",
  region: "서울 강남 역삼",
  topic: "두피 케어 + 염색 솔직 후기",
  industry: "미용실",
  blogLengthTier: "short",
};

assert.ok(
  lineViolatesHomeRegion("파주미용실추천 받고 다녀왔는데 만족스러웠어요", input)
);
assert.ok(!lineViolatesHomeRegion("역삼역 도보 5분 안쪽 골목에 있었어요", input));

const stripped = stripForeignRegionSentences(
  "파주미용실추천 받고 다녀왔어요.\n\n염색은 하고 싶은데 두피가 걱정돼요.",
  input
);
assert.ok(!/파주/.test(stripped));
assert.ok(/염색/.test(stripped));

const pack = {
  sections: [{ heading: "test", body: "본문만 있어요." }],
};
const voiced = applyHumanConversationalVoice(pack, input);
const full = getBlogFullText(voiced);
assert.ok(!/파주/.test(full));

const fallback = buildMissionProseFallbackPack(input);
const fb = getBlogFullText(fallback);
assert.ok(!/파주|운정미용/.test(fb), fb.slice(0, 200));
assert.ok(/염색은 하고 싶은데|두피/.test(fb));

console.log("OK: region voice lock + salon fallback clean");
