/**
 * 미검증 카테고리 Humanity 검사 — 가구·꽃집 제외
 * Run: npm run test:channel-humanity:diverse
 */
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";
import {
  scoreChannelHumanity,
  formatChannelHumanityReport,
  CHANNEL_HUMANITY_TARGET,
} from "../lib/quality/channelHumanityBenchmark.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import {
  applyPlaceMarketerPack,
  applyInstagramMarketerPack,
} from "../lib/content/channelMarketerEngine.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  buildFormBlogProxy,
} from "../lib/contentPipeline.js";
import { scrubCustomerForbiddenSurfaceInPack } from "../lib/copy/customerFacing.js";

/** humanity 테스트에서 아직 다루지 않은 업종 */
const SCENARIOS = [
  {
    label: "치과·부산·임플란트",
    input: {
      brandName: "해운대선치과",
      region: "부산",
      topic: "임플란트 무료 상담 예약",
      industry: "의료/치과",
      blogLengthTier: "medium",
      contentPerspective: "informational",
    },
  },
  {
    label: "반려카페·대전·생일파티",
    input: {
      brandName: "멍멍놀이터",
      region: "대전",
      topic: "반려견 생일파티 패키지",
      industry: "반려동물/카페",
      blogLengthTier: "medium",
      contentPerspective: "customer",
    },
  },
  {
    label: "한식당·전주·시즌메뉴",
    input: {
      brandName: "옛날밥상",
      region: "전주",
      topic: "겨울 한정 보양식 코스",
      industry: "음식/한식",
      blogLengthTier: "medium",
      contentPerspective: "brand",
    },
  },
  {
    label: "요가·제주·신규회원",
    input: {
      brandName: "숨결요가",
      region: "제주",
      topic: "1월 신규 회원 등록 혜택",
      industry: "피트니스/요가",
      blogLengthTier: "medium",
      contentPerspective: "comparison",
    },
  },
  {
    label: "미용실·수원·펌이벤트",
    input: {
      brandName: "루미에르헤어",
      region: "수원",
      topic: "겨울 펌·염색 프로모션",
      industry: "미용/헤어",
      blogLengthTier: "medium",
      contentPerspective: "storytelling",
    },
  },
  {
    label: "학원·대구·겨울특강",
    input: {
      brandName: "미래수학학원",
      region: "대구",
      topic: "겨울방학 특강 모집",
      industry: "교육/학원",
      blogLengthTier: "medium",
      contentPerspective: "informational",
    },
  },
];

async function buildBlogPack(input) {
  const preWrite = prepareBriclogPreWriteContext(input);
  const ctx = { brandName: input.brandName, region: input.region, input };
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  let pack = expandSubstantiveBlogPack(input, ctx, { ...input, ...preWrite }, {
    minChars: tier.min,
    channel: "blog",
  });
  pack = applyHumanityFinishPass(pack, { input, ...input, ...preWrite }, "blog");
  pack = applyV17PostWritePack(pack, { input, ...input }, "blog");
  return scrubCustomerForbiddenSurfaceInPack(pack, "blog");
}

async function buildPlacePack(input) {
  const prep = await prepareBriclogPreWriteContext(input, "place");
  const ctx = prep.ctx || { input, ...input };
  const proxy = buildFormBlogProxy(input);
  let pack = runPlacePipeline(input, proxy);
  return applyPlaceMarketerPack(pack, ctx, input);
}

async function buildInstaPack(input) {
  const prep = await prepareBriclogPreWriteContext(input, "instagram");
  const ctx = prep.ctx || { input, ...input };
  const proxy = buildFormBlogProxy(input);
  let pack = runInstagramPipeline(input, proxy, "emotional");
  return applyInstagramMarketerPack(pack, ctx, input);
}

const TARGET_FLOOR = 90;

console.log("=== 미검증 카테고리 Humanity 검사 ===");
console.log(`categories: ${SCENARIOS.map((s) => s.input.industry).join(", ")}`);
console.log(`target: ~${CHANNEL_HUMANITY_TARGET} | floor: ${TARGET_FLOOR}+\n`);

let fail = 0;
let belowFloor = 0;
const rows = [];

for (const scenario of SCENARIOS) {
  console.log(`--- ${scenario.label} (${scenario.input.industry}) ---`);
  const ctx = { input: scenario.input, ...scenario.input };

  const blogH = scoreChannelHumanity(await buildBlogPack(scenario.input), ctx, "blog");
  const placeH = scoreChannelHumanity(await buildPlacePack(scenario.input), ctx, "place");
  const instaH = scoreChannelHumanity(await buildInstaPack(scenario.input), ctx, "instagram");

  console.log(formatChannelHumanityReport(blogH));
  console.log(formatChannelHumanityReport(placeH));
  console.log(formatChannelHumanityReport(instaH));
  console.log("");

  rows.push({
    label: scenario.label,
    industry: scenario.input.industry,
    blog: blogH.score,
    place: placeH.score,
    insta: instaH.score,
    ok: blogH.ok && placeH.ok && instaH.ok,
  });

  if (!blogH.ok || !placeH.ok || !instaH.ok) fail += 1;
  if (blogH.score < TARGET_FLOOR || placeH.score < TARGET_FLOOR || instaH.score < TARGET_FLOOR) {
    belowFloor += 1;
  }
}

console.log("--- 요약 ---");
for (const r of rows) {
  const mark = r.blog >= TARGET_FLOOR && r.place >= TARGET_FLOOR && r.insta >= TARGET_FLOOR ? "✓" : "·";
  console.log(
    `${mark} ${r.label}: blog=${r.blog} place=${r.place} insta=${r.insta}${r.ok ? "" : " (gate fail)"}`
  );
}

console.log("");
if (fail > 0) {
  console.log(`종합: ${fail} 시나리오 gate FAIL`);
  process.exitCode = 1;
} else if (belowFloor > 0) {
  console.log(
    `종합: gate PASS — ${belowFloor} 시나리오 blog가 floor ${TARGET_FLOOR} 미만 (place/insta ${TARGET_FLOOR}+)`
  );
} else {
  console.log(`종합: ${SCENARIOS.length} 카테고리 모두 ${TARGET_FLOOR}+`);
}
