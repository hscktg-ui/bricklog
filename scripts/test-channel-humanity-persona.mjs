/**
 * 카테고리 × 성별 × 연령 페르소나 10종 Humanity 검사
 * Run: npm run test:channel-humanity:persona
 */
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";
import {
  scoreChannelHumanity,
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
import { applyV4SpeakerToInput } from "../lib/persona/v4Speakers.js";
import {
  PERSONA_DEMOGRAPHIC_SCENARIOS,
  mergeDemographicPersonaInput,
} from "../lib/qa/personaDemographicScenarios.js";

const TARGET_FLOOR = 90;

async function buildBlogPack(input) {
  const enriched = applyV4SpeakerToInput(input);
  const preWrite = prepareBriclogPreWriteContext(enriched);
  const ctx = { brandName: enriched.brandName, region: enriched.region, input: enriched };
  const tier = resolveBlogLengthTier(enriched.blogLengthTier || "medium");
  let pack = expandSubstantiveBlogPack(enriched, ctx, { ...enriched, ...preWrite }, {
    minChars: tier.min,
    channel: "blog",
  });
  pack = applyHumanityFinishPass(pack, { input: enriched, ...enriched, ...preWrite }, "blog");
  pack = applyV17PostWritePack(pack, { input: enriched, ...enriched }, "blog");
  return scrubCustomerForbiddenSurfaceInPack(pack, "blog");
}

async function buildPlacePack(input) {
  const enriched = applyV4SpeakerToInput(input);
  const prep = await prepareBriclogPreWriteContext(enriched, "place");
  const ctx = prep.ctx || { input: enriched, ...enriched };
  const proxy = buildFormBlogProxy(enriched);
  let pack = runPlacePipeline(enriched, proxy);
  return applyPlaceMarketerPack(pack, ctx, enriched);
}

async function buildInstaPack(input) {
  const enriched = applyV4SpeakerToInput(input);
  const prep = await prepareBriclogPreWriteContext(enriched, "instagram");
  const ctx = prep.ctx || { input: enriched, ...enriched };
  const proxy = buildFormBlogProxy(enriched);
  let pack = runInstagramPipeline(enriched, proxy, "emotional");
  return applyInstagramMarketerPack(pack, ctx, enriched);
}

console.log("=== 카테고리 × 성별 × 연령 페르소나 Humanity (10종) ===");
console.log(`target: ~${CHANNEL_HUMANITY_TARGET} | floor: ${TARGET_FLOOR}+\n`);

let fail = 0;
let belowFloor = 0;
const rows = [];

for (const scenario of PERSONA_DEMOGRAPHIC_SCENARIOS) {
  const input = mergeDemographicPersonaInput(scenario);
  const ctx = { input, ...input };

  console.log(
    `--- ${scenario.label} | ${scenario.industry} | ${input.writerPersonaLabel} | ${input.v4Speaker} ---`
  );

  const blogH = scoreChannelHumanity(await buildBlogPack(input), ctx, "blog");
  const placeH = scoreChannelHumanity(await buildPlacePack(input), ctx, "place");
  const instaH = scoreChannelHumanity(await buildInstaPack(input), ctx, "instagram");

  console.log(`  blog=${blogH.score} place=${placeH.score} insta=${instaH.score}`);
  if (blogH.issues.length) console.log(`  blog issues: ${blogH.issues.join(", ")}`);
  if (placeH.issues.length) console.log(`  place issues: ${placeH.issues.join(", ")}`);
  if (instaH.issues.length) console.log(`  insta issues: ${instaH.issues.join(", ")}`);
  console.log("");

  rows.push({
    id: scenario.id,
    label: scenario.label,
    industry: scenario.industry,
    persona: input.writerPersonaLabel,
    gender: input.writerGender,
    age: input.writerAgeBand,
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

console.log("--- 요약 (10종) ---");
console.log("id | 카테고리 | 페르소나 | blog | place | insta");
for (const r of rows) {
  const mark =
    r.blog >= TARGET_FLOOR && r.place >= TARGET_FLOOR && r.insta >= TARGET_FLOOR ? "✓" : "·";
  console.log(
    `${mark} ${r.id} | ${r.industry} | ${r.persona} (${r.gender}/${r.age}) | ${r.blog} | ${r.place} | ${r.insta}`
  );
}

console.log("");
if (fail > 0) {
  console.log(`종합: ${fail}/10 gate FAIL`);
  process.exitCode = 1;
} else if (belowFloor > 0) {
  console.log(
    `종합: gate PASS — ${belowFloor}/10 blog가 floor ${TARGET_FLOOR} 미만 (place/insta ${TARGET_FLOOR}+)`
  );
} else {
  console.log(`종합: 10종 모두 ${TARGET_FLOOR}+ (target ~${CHANNEL_HUMANITY_TARGET} 근접)`);
}
