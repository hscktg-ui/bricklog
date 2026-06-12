/**
 * LLM 본문 보존 rescue — researchGrounded 전체 교체 방지
 */
import assert from "node:assert/strict";
import { expandLlmPackPreservingBody } from "@/lib/product/llmBodyPreserveRescue.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_MISSION_ENFORCED = "true";

const input = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  industry: "꽃집",
  blogLengthTier: "medium",
  storeFeatures: "24시간 무인",
  researchFacts: [
    { fact: "만원대 꽃다발 구성", source: "input" },
    { fact: "24시간 무인 키오스크", source: "input" },
  ],
};

const llmPack = {
  title: "파주 그랩앤고플라워, 여름철 꽃 추천 직접 보고 정리해봤습니다",
  sections: [
    {
      heading: "여름에는 어떤 꽃을 많이 고를까?",
      body: "여름이 되면 꽃도 계절을 꽤 많이 탑니다. 수국은 한 다발만으로도 풍성해 보이는 느낌이 있어서 집들이나 개업 선물로 자주 활용됩니다.",
    },
    {
      heading: "해바라기와 거베라",
      body: "해바라기도 여름철에 진열대에서 눈에 잘 들어오는 꽃입니다. 거베라는 관리 부담이 비교적 적어 처음 구매하는 분들도 부담 없이 고를 수 있습니다.",
    },
    {
      heading: "마무리",
      body: "파주 운정 그랩앤고플라워는 24시간 무인 운영이라 늦은 시간에도 꽃을 구매할 수 있었습니다.",
    },
  ],
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};

const before = countBlogBodyCharsWithSpaces(llmPack);
const expanded = expandLlmPackPreservingBody(llmPack, input);
assert.ok(expanded, "should preserve LLM pack");
assert.ok(expanded._meta?.llmBodyPreserveRescue);
assert.ok(countBlogBodyCharsWithSpaces(expanded) >= before);
assert.ok(!/확인\s*포인트|조사해\s*둔|생각보다.*만족도/.test(
  expanded.sections.map((s) => `${s.heading}\n${s.body}`).join("\n")
));

console.log("OK: llm body preserve rescue");
