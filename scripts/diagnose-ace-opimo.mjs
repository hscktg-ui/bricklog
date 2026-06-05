/**
 * 파주·에이스침대·오피모 전시 소식 — 사용자 샘플 진단
 */
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { buildKnowledgeCoverageMap } from "../lib/content/knowledgeCoverageEngine.js";
import { buildWriterSectionBody } from "../lib/content/sectionWriterBodies.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { sanitizeVerbatimTopicInPack } from "../lib/content/informationUnitEngine.js";
import { buildHumanClickTitles } from "../lib/content/humanTitleEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const INPUT = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  mainKeyword: "오피모 전시 소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "파주 — 파주 매장 체험·행사 조건" },
    { fact: "파주 매장 예약·상담 가능" },
  ],
  v2PreWriteVerified: true,
  knowledgeExpansionReady: true,
};

function buildPollutedPack(input) {
  const enriched = prepareBriclogPreWriteContext(input);
  const coverage = buildKnowledgeCoverageMap(enriched);
  const areas = (coverage.areas || []).slice(0, 8);
  const plan = { ...enriched, brand: enriched.brandName, topic: enriched.topic };

  const sections = areas.map((area, idx) => ({
    heading: area.heading || `${enriched.region} ${enriched.brandName}`,
    body: buildWriterSectionBody(
      { id: area.id, label: area.label, headingSuffix: area.headingSuffix, infoUnit: area.label },
      plan,
      enriched,
      idx % 3
    ),
  }));

  return {
    title: buildHumanClickTitles(enriched, input)[0] || `${input.region} ${input.brandName} ${input.topic}`,
    sections,
    conclusion: `${input.region} ${input.brandName} — ${input.topic} 방문·체험 일정만 잡아도 비교가 수월합니다.`,
  };
}

const polluted = buildPollutedPack(INPUT);
const scrubOnly = sanitizeVerbatimTopicInPack(polluted, INPUT, "blog");
const improved = applyV17PostWritePack(polluted, { input: INPUT, ...INPUT }, "blog");
const full = getBlogFullText(improved);

console.log("=== titles ===");
console.log(buildHumanClickTitles(INPUT, INPUT).slice(0, 3).join("\n"));

console.log("\n=== scrub check ===");
const scrubFull = getBlogFullText(scrubOnly);
console.log("방문·예약 안내 count:", (scrubFull.match(/방문·예약 안내/g) || []).length);
console.log("오피모 전시 소식 count:", (scrubFull.match(/오피모 전시 소식/g) || []).length);

console.log("\n=== after v17 ===");
console.log("belief:", scoreHumanBelief(full, INPUT, improved).score);
console.log("checklist:", scoreChecklistVoice(full, improved).ok);
console.log("방문·예약 안내:", (full.match(/방문·예약 안내/g) || []).length);
console.log("오피모:", (full.match(/오피모/g) || []).length);
console.log("소식를:", full.includes("소식를") ? "FAIL" : "ok");
console.log("\n--- headings ---");
for (const s of improved.sections || []) {
  console.log(`· ${s.heading}`);
}
console.log("\n--- opener ---");
console.log(String(improved.sections?.[0]?.body || "").slice(0, 280));
