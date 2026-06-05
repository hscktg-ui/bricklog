/**
 * 업종별 블로그 — 글자수 tier·오류 검수
 */
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import { applyBrandContentEngine, detectBrandContentIssues } from "../lib/content/brandContentEngine.js";
import { normalizeBlogLengthAndStructure } from "../lib/content/blogLengthControl.js";
import { assertBlogLengthTier } from "../lib/content/blogLengthDelivery.js";
import { sanitizeBlogPackPlannerLeak } from "../lib/content/sectionPlannerSanitize.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { topicWritingFacet } from "../lib/content/informationUnitEngine.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";

const SCENARIOS = [
  {
    label: "꽃집·졸업",
    input: {
      brandName: "꽃집 노을",
      region: "강릉",
      topic: "졸업식 하회전 꽃다발 선물",
      industry: "꽃/플로리스트",
      contentPerspective: "storytelling",
    },
  },
  {
    label: "치과·임플란트",
    input: {
      brandName: "해운대선치과",
      region: "부산",
      topic: "임플란트 무료 상담 예약",
      industry: "의료/치과",
      contentPerspective: "informational",
    },
  },
  {
    label: "반려카페",
    input: {
      brandName: "멍멍놀이터",
      region: "대전",
      topic: "반려견 생일파티 패키지",
      industry: "반려동물/카페",
      contentPerspective: "customer",
    },
  },
  {
    label: "한식·보양식",
    input: {
      brandName: "옛날밥상",
      region: "전주",
      topic: "겨울 한정 보양식 코스",
      industry: "음식/한식",
      contentPerspective: "brand",
    },
  },
  {
    label: "요가·신규",
    input: {
      brandName: "숨결요가",
      region: "제주",
      topic: "1월 신규 회원 등록 혜택",
      industry: "피트니스/요가",
      contentPerspective: "comparison",
    },
  },
];

const FURNITURE_LEAK_RE = /매트리스|모션\s*베드|설치\/배송|체험\s*가능\s*모델|누워보|헤드·각도/;
const BLOG_TONE_RE = /(이번\s*글|결론적으로|알아보시다\s*보면|콘텐츠\s*운영|검수\s*기준)/;

function runBlogPipeline(input, ctx, tierKey) {
  const mergedInput = { ...input, blogLengthTier: tierKey };
  const tier = resolveBlogLengthTier(tierKey);
  let pack = expandSubstantiveBlogPack(input, ctx, mergedInput, {
    minChars: tier.min,
    channel: "blog",
  });
  pack = applyBrandContentEngine(pack, ctx, mergedInput);
  pack = normalizeBlogLengthAndStructure(pack, ctx, mergedInput).pack;
  pack = sanitizeBlogPackPlannerLeak(pack);
  pack = applyBrandContentEngine(pack, ctx, mergedInput);
  return { pack, tier, mergedInput };
}

let failures = 0;

console.log("\n=== 업종별 블로그 · 글자수 tier 검수 ===\n");

for (const scenario of SCENARIOS) {
  const ctx = {
    brandName: scenario.input.brandName,
    region: scenario.input.region,
    input: scenario.input,
  };
  const preWrite = prepareBriclogPreWriteContext(scenario.input);
  Object.assign(ctx, preWrite);
  const input = { ...scenario.input, ...preWrite };

  console.log(`\n【${scenario.label}】 facet=${topicWritingFacet(input)} category=${preWrite.knowledgeCoverage?.categoryKey || "?"}`);

  for (const tierKey of ["short", "medium", "long"]) {
    const { pack, tier } = runBlogPipeline(input, ctx, tierKey);
    const chars = countBlogBodyCharsWithSpaces(pack);
    const metaChars = pack._meta?.charCount;
    const gate = assertBlogLengthTier({ blogLengthTier: tierKey }, pack);
    const full = getChannelFullText(pack, "blog");
    const issues = [];

    if (!gate.ok) issues.push(`length ${chars} not in ${tier.min}~${tier.max}`);
    if (metaChars != null && Math.abs(metaChars - chars) > 50) {
      issues.push(`meta charCount mismatch meta=${metaChars} actual=${chars}`);
    }
    if (FURNITURE_LEAK_RE.test(full)) issues.push("furniture leak");
    if (BLOG_TONE_RE.test(full)) issues.push("blog/operator tone");
    const brandIssues = detectBrandContentIssues(pack, ctx, { ...input, blogLengthTier: tierKey });
    if (!brandIssues.ok) issues.push(`brand: ${brandIssues.issues.map((i) => i.type).slice(0, 2).join(",")}`);

    const status = issues.length ? "FAIL" : "OK";
    if (issues.length) failures += 1;
    console.log(
      `  ${tierKey.padEnd(6)} | ${chars}자 (목표 ${tier.min}~${tier.max}) | meta=${metaChars ?? "-"} | ${status}${issues.length ? " → " + issues.join("; ") : ""}`
    );
    if (issues.length) {
      console.log(`         title: ${(pack.representativeTitle || pack.title || "").slice(0, 48)}`);
    }
  }
}

console.log("\n" + "=".repeat(50));
if (failures) {
  console.error(`TOTAL FAILURES: ${failures}`);
  process.exit(1);
}
console.log("ALL SCENARIOS × TIERS OK");
