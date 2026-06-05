/**
 * 채널별 Humanity 검사 — 온라인 표본 평균 대비
 * Run: npm run test:channel-humanity
 */
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";
import {
  scoreChannelHumanity,
  loadChannelHumanityBaseline,
  formatChannelHumanityReport,
  CHANNEL_HUMANITY_PASS,
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

const SCENARIOS = [
  {
    label: "에이스침대·파주·오피모",
    input: {
      brandName: "에이스침대",
      region: "파주",
      topic: "오피모 전시 소식",
      mainKeyword: "오피모 전시 소식",
      industry: "가구/침대",
      blogLengthTier: "medium",
      researchFacts: [{ fact: "파주 매장 예약·상담 가능" }],
    },
  },
  {
    label: "꽃집·강릉·졸업",
    input: {
      brandName: "꽃집 노을",
      region: "강릉",
      topic: "졸업식 하회전 꽃다발",
      industry: "꽃/플로리스트",
      blogLengthTier: "medium",
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

console.log("=== 채널별 Humanity 검사 (온라인 평균 대비) ===");
console.log(`pass threshold: ${CHANNEL_HUMANITY_PASS}+ | target: ~${CHANNEL_HUMANITY_TARGET}\n`);

let fail = 0;
let belowTarget = 0;
const TARGET_FLOOR = 90;

for (const scenario of SCENARIOS) {
  console.log(`--- ${scenario.label} ---`);
  const ctx = { input: scenario.input, ...scenario.input };

  const blogPack = await buildBlogPack(scenario.input);
  const blogH = scoreChannelHumanity(blogPack, ctx, "blog");
  console.log(formatChannelHumanityReport(blogH));
  console.log(`  online baseline: field~${blogH.baseline.online.fieldRate}% voice~${blogH.baseline.online.voiceRate}% checklist≤${blogH.baseline.online.checklistRateMax}%`);
  if (!blogH.ok) fail += 1;
  if (blogH.score < TARGET_FLOOR) belowTarget += 1;

  const placePack = await buildPlacePack(scenario.input);
  const placeH = scoreChannelHumanity(placePack, ctx, "place");
  console.log(formatChannelHumanityReport(placeH));
  console.log(`  online baseline: owner~${placeH.baseline.online.ownerVoiceRate}% blogLeak≤${placeH.baseline.online.blogLeakRateMax}%`);
  if (!placeH.ok) fail += 1;
  if (placeH.score < TARGET_FLOOR) belowTarget += 1;

  const instaPack = await buildInstaPack(scenario.input);
  const instaH = scoreChannelHumanity(instaPack, ctx, "instagram");
  console.log(formatChannelHumanityReport(instaH));
  console.log(`  online baseline: caption~${instaH.baseline.online.voiceRate}% leak≤${instaH.baseline.online.placeLeakRateMax}%`);
  if (!instaH.ok) fail += 1;
  if (instaH.score < TARGET_FLOOR) belowTarget += 1;

  console.log("");
}

console.log("--- 글로벌 온라인 기준선 요약 ---");
for (const ch of ["blog", "smartplace", "instagram"]) {
  const b = loadChannelHumanityBaseline(ch, SCENARIOS[0].input);
  console.log(`${ch}: ${b.source} (n=${b.sampleCount})`, b.online);
}

console.log("");
if (fail > 0) {
  console.log(`종합: ${fail} FAIL — 온라인 평균 대비 humanity 미달`);
  process.exitCode = 1;
} else if (belowTarget > 0) {
  console.log(
    `종합: PASS(70+) — ${belowTarget}건이 target ${CHANNEL_HUMANITY_TARGET} 미만 (floor ${TARGET_FLOOR} 충족)`
  );
} else {
  console.log(`종합: 모든 채널 humanity ${TARGET_FLOOR}+ (target ~${CHANNEL_HUMANITY_TARGET} 근접)`);
}
