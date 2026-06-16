/**
 * 조사 팩트 보존·정보량·프롬프트 회귀
 */
import assert from "node:assert/strict";
import { collectMergedResearchFactsFromInput } from "@/lib/product/researchReadiness.js";
import {
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack.js";
import { scoreInformationYield } from "@/lib/content/informationEngine.js";
import { stripSearchSnippetLeakAndPreserveResearch } from "@/lib/content/researchSnippetStrip.js";
import { buildBlogUserPrompt } from "@/lib/llm/buildBlogPrompt.js";
import { hasEmotionLayer } from "@/lib/persona/humanWritingFramework.js";

function getBlogFullText(p) {
  return [p.title, ...(p.sections || []).map((s) => `${s.heading}\n${s.body}`), p.conclusion]
    .filter(Boolean)
    .join("\n\n");
}

const input = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제간식",
  researchFirstBrief: "【조사 dossier】브랜드 특징·보관 방법",
  geminiWriterBrief: "고객 질문 6개 답변형",
  v2AxisParsed: {
    facts: [{ fact: "수제간식은 성분 표시와 보관 온도를 확인하는 것이 중요하다", source: "naver_search_snippet" }],
  },
  researchFacts: [
    { fact: "용인 지역에서 반려동물 간식 매장을 찾을 때 영업시간을 먼저 확인한다", source: "naver_blog" },
  ],
  _webLeadsCache: {
    results: [
      {
        title: "용인 수제간식 매장 후기",
        snippet: "성분표를 직접 확인하고 보관 방법을 안내받았다",
      },
    ],
  },
};

const merged = collectMergedResearchFactsFromInput(input);
assert.ok(merged.length >= 2, `merged facts ${merged.length}`);
assert.equal(hasUsableResearchFacts(input), true);

const prompt = buildBlogUserPrompt({ input, ...input });
assert.match(prompt, /조사 dossier/);
assert.match(prompt, /고객 질문/);

const pack = {
  title: "용인 더건강하개 수제간식",
  sections: [{ heading: "안내", body: "간단한 소개 문단입니다." }],
  conclusion: "문의해 주세요.",
};
const woven = weaveResearchFactsIntoPack(pack, input);
assert.ok(getBlogFullText(woven).length > getBlogFullText(pack).length);

const yieldScore = scoreInformationYield(getBlogFullText(woven), { input }, "blog");
assert.ok(yieldScore.researchCoverage?.ok !== false);

assert.ok(
  hasEmotionLayer("현장에서 성분표를 직접 확인했고 보관 방법을 맞춰 메모해 뒀어요.")
);

console.log("OK research quality delivery");
console.log("  merged facts:", merged.length);
console.log("  info yield:", yieldScore.score);
