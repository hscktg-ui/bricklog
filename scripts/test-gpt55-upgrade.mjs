/**
 * GPT 5.5 upgrade smoke — model + blog orchestrator
 * node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/test-gpt55-upgrade.mjs
 */
import { getOpenAIModel } from "../lib/llm/llmProvider.js";
import { generateBlogWithLLMFirst } from "../lib/llm/contentOrchestrator.js";

const INPUT = {
  brandName: "무인꽃집",
  region: "부산",
  topic: "어버이날 꽃 추천",
  mainKeyword: "어버이날 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 카arnation",
  blogLengthTier: "medium",
  v2PreWriteVerified: true,
  v3PreWriteVerified: true,
  v2ResearchReady: true,
  v2AxisVerified: true,
  researchFacts: [
    { fact: "부산 해운대 인근 무인꽃집은 24시간 셀프 픽업이 가능하다.", source: "brand" },
    { fact: "카네이션은 어버이날 선물로 가장 많이 선택되는 꽃 중 하나다.", source: "web" },
    { fact: "리시안셔스는 부드러운 색감으로 감사 인사에 어울린다.", source: "web" },
  ],
};

function bodyChars(pack) {
  return (pack?.sections || [])
    .map((s) => String(s.body || ""))
    .join("")
    .replace(/\s/g, "").length;
}

const started = Date.now();
console.log("model_config:", getOpenAIModel());
console.log("sample:", INPUT.brandName, INPUT.topic);

const result = await generateBlogWithLLMFirst(INPUT);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
const pack = result.blogContent;
const meta = pack?._meta || {};

console.log("\n--- result ---");
console.log("elapsed_sec:", elapsed);
console.log("ok:", result.ok);
console.log("mode:", result.mode);
console.log("withheld:", result.withheld);
console.log("userMessage:", result.userMessage || "-");
console.log("sections:", pack?.sections?.length ?? 0);
console.log("body_chars:", bodyChars(pack));
console.log("generationMode:", meta.generationMode || "-");
console.log("llmModel:", meta.llmModel || meta.openaiModel || "-");
console.log("rewriteCount:", meta.rewriteCount ?? "-");
console.log("qualityScore:", meta.qualityScore?.total ?? meta.coreQuality?.total ?? "-");
console.log("title:", (pack?.representativeTitle || pack?.title || "").slice(0, 80));

if (pack?.sections?.[0]?.body) {
  console.log("\n--- excerpt ---");
  console.log(pack.sections[0].body.slice(0, 280).replace(/\n/g, " ") + "…");
}

const pass =
  Boolean(pack?.sections?.length) &&
  bodyChars(pack) >= 300 &&
  (result.ok !== false || pack?.sections?.length);

console.log("\nVERDICT:", pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
