/**
 * 채널별 품질 종합 리포트 — blog / smartplace / instagram
 * Run: npm run test:channel-quality
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { scoreBriclogEngine } from "../lib/product/briclogEngineScore.js";
import { scoreExperienceVoice } from "../lib/content/experienceVoiceProfile.js";
import { scoreMagazineColumnArc } from "../lib/content/columnMagazineArchetype.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { scoreSmartPlaceVoice, loadSmartPlaceVoiceProfile } from "../lib/channel/smartPlaceVoiceProfile.js";
import { scoreInstagramVoice, loadInstagramVoiceProfile } from "../lib/channel/instagramVoiceProfile.js";
import {
  detectPlaceMarketerIssues,
  detectInstagramMarketerIssues,
  applyPlaceMarketerPack,
  applyInstagramMarketerPack,
} from "../lib/content/channelMarketerEngine.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  buildFormBlogProxy,
} from "../lib/contentPipeline.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { scoreContent } from "../lib/editorAI/scoreContent.js";
import { evaluateHumanTemperature } from "../lib/content/humanTemperature.js";
import { PLACE_CHANNEL } from "../styles/channels/placeStyle.js";
import { INSTAGRAM_CHANNEL } from "../styles/channels/instagramStyle.js";
import { scrubCustomerForbiddenSurfaceInPack } from "../lib/copy/customerFacing.js";

const ACE = {
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
};

const BLOG_LEAK_ON_PLACE = /솔직\s*후기|다녀(?:왔|온)|블로그|SEO|키워드|체크리스트|알아보시다/;
const PLACE_LEAK_ON_INSTA = /안내(?:드립|해)\s*니다|영업\s*시간|휴무\s*일|공지\s*사항|플레이스에서\s*확인/;
const BLOG_LEAK_ON_INSTA = /솔직\s*후기|다녀(?:왔|온)\s*후기|정리(?:하|해)\s*(?:봤|드)|섹션|소제목/;

function status(ok, warn = false) {
  if (ok) return "PASS";
  if (warn) return "WARN";
  return "FAIL";
}

function bannedHits(text, list) {
  return list.filter((p) => text.includes(p));
}

async function checkBlog() {
  const tier = resolveBlogLengthTier("medium");
  let pack = applyV17PostWritePack(buildMissionProseFallbackPack(ACE), { input: ACE, ...ACE }, "blog");
  pack = scrubCustomerForbiddenSurfaceInPack(pack, "blog");
  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const engine = scoreBriclogEngine(pack, { input: ACE, ...ACE });
  const voice = scoreExperienceVoice(full);
  const arc = scoreMagazineColumnArc(pack);
  const belief = scoreHumanBelief(full, ACE, pack);
  const checklist = scoreChecklistVoice(full, pack);
  const core = scoreCoreContent(pack, { input: ACE, ...ACE }, "blog");
  const editor = scoreContent("blog", pack, { input: ACE, ...ACE });
  const lengthOk = chars >= tier.min && chars <= tier.max;
  const customerLeak = /GPT:|Gemini:|세\s*칸만|확인하세요/.test(full);

  return {
    channel: "blog",
    chars,
    lengthOk,
    engine: engine.total,
    engineOk: engine.ok,
    engineIssues: engine.issues,
    voice: voice.score,
    voiceOk: voice.ok,
    arc: arc.score,
    belief: belief.score,
    checklist: checklist.ok,
    core: core.total,
    editor: editor.overall,
    customerLeak,
    verdict: status(engine.ok && lengthOk && voice.ok && !customerLeak, !engine.ok && engine.total >= 80),
    sample: {
      title: pack.title,
      opener: String(pack.sections?.[0]?.body || "").slice(0, 120),
      conclusion: String(pack.conclusion || "").slice(-100),
    },
  };
}

async function checkPlace() {
  const prep = await prepareBriclogPreWriteContext(ACE, "place");
  const ctx = prep.ctx || { input: ACE, ...ACE };
  const proxy = buildFormBlogProxy(ACE);
  let pack = runPlacePipeline(ACE, proxy);
  pack = applyPlaceMarketerPack(pack, ctx, ACE);

  const full = getChannelFullText(pack, "place");
  const voice = scoreSmartPlaceVoice(full);
  const issues = detectPlaceMarketerIssues(pack, ctx, ACE);
  const core = scoreCoreContent(pack, ctx, "place");
  const editor = scoreContent("place", pack, ctx);
  const temp = evaluateHumanTemperature(full, "place");
  const detailLen = String(pack.detailBody || "").replace(/\s/g, "").length;
  const shortLen = String(pack.shortNotice || pack.shortBody || "").replace(/\s/g, "").length;
  const lengthOk =
    detailLen >= PLACE_CHANNEL.totalChars.min * 0.35 &&
    detailLen <= PLACE_CHANNEL.detailMax + 80;
  const blogLeak = BLOG_LEAK_ON_PLACE.test(full);
  const banned = bannedHits(full, PLACE_CHANNEL.banned);

  return {
    channel: "smartplace",
    profileSamples: loadSmartPlaceVoiceProfile().sampleCount,
    detailLen,
    shortLen,
    lengthOk,
    voice: voice.score,
    voiceOk: voice.ok,
    marketerOk: issues.ok,
    marketerIssues: issues.issues?.map((i) => i.type) || [],
    core: core.total,
    editor: editor.overall,
    tempOk: temp.ok,
    blogLeak,
    bannedCount: banned.length,
    verdict: status(voice.ok && issues.ok && !blogLeak && banned.length === 0, blogLeak || !issues.ok),
    sample: {
      title: pack.title,
      shortNotice: pack.shortNotice || pack.shortBody,
      detailBody: String(pack.detailBody || "").slice(0, 160),
    },
  };
}

async function checkInstagram() {
  const prep = await prepareBriclogPreWriteContext(ACE, "instagram");
  const ctx = prep.ctx || { input: ACE, ...ACE };
  const proxy = buildFormBlogProxy(ACE);
  let pack = runInstagramPipeline(ACE, proxy, "emotional");
  pack = applyInstagramMarketerPack(pack, ctx, ACE);

  const full = getChannelFullText(pack, "instagram");
  const voice = scoreInstagramVoice(full);
  const issues = detectInstagramMarketerIssues(pack, ctx, ACE);
  const core = scoreCoreContent(pack, ctx, "instagram");
  const editor = scoreContent("instagram", pack, ctx);
  const temp = evaluateHumanTemperature(full, "instagram");
  const hookLen = String(pack.hook || "").replace(/\s/g, "").length;
  const bodyLen = String(pack.lineBreakBody || pack.body || "").replace(/\s/g, "").length;
  const lengthOk = hookLen <= INSTAGRAM_CHANNEL.hookMax + 12 && bodyLen >= INSTAGRAM_CHANNEL.bodyMin;
  const placeLeak = PLACE_LEAK_ON_INSTA.test(full);
  const blogLeak = BLOG_LEAK_ON_INSTA.test(full);
  const banned = bannedHits(full, INSTAGRAM_CHANNEL.banned);
  const lineCount = String(pack.lineBreakBody || pack.body || "").split(/\n+/).filter(Boolean).length;

  return {
    channel: "instagram",
    profileSamples: loadInstagramVoiceProfile().sampleCount,
    hookLen,
    bodyLen,
    lineCount,
    lengthOk,
    voice: voice.score,
    voiceOk: voice.ok,
    marketerOk: issues.ok,
    marketerIssues: issues.issues?.map((i) => i.type) || [],
    core: core.total,
    editor: editor.overall,
    tempOk: temp.ok,
    placeLeak,
    blogLeak,
    bannedCount: banned.length,
    verdict: status(voice.ok && issues.ok && !placeLeak && !blogLeak && banned.length === 0),
    sample: {
      hook: pack.hook,
      body: String(pack.lineBreakBody || pack.body || "").slice(0, 200),
      hashtags: (pack.hashtags || []).slice(0, 6),
    },
  };
}

const [blog, place, insta] = await Promise.all([checkBlog(), checkPlace(), checkInstagram()]);

console.log("=== 채널별 품질 체크 (에이스침대·파주·오피모) ===\n");

for (const r of [blog, place, insta]) {
  console.log(`【${r.channel}】 ${r.verdict}`);
  if (r.channel === "blog") {
    console.log(`  글자수: ${r.chars} (${r.lengthOk ? "OK" : "NG"}) | engine: ${r.engine} | voice: ${r.voice} | arc: ${r.arc} | belief: ${r.belief}`);
    console.log(`  core: ${r.core} | editor: ${r.editor} | checklist: ${r.checklist ? "OK" : "NG"} | UI누수: ${r.customerLeak ? "YES" : "no"}`);
    if (r.engineIssues?.length) console.log(`  issues: ${r.engineIssues.join(", ")}`);
    console.log(`  title: ${r.sample.title}`);
    console.log(`  opener: ${r.sample.opener}…`);
  } else if (r.channel === "smartplace") {
    console.log(`  학습표본: ${r.profileSamples} | voice: ${r.voice} | core: ${r.core} | editor: ${r.editor}`);
    console.log(`  detail ${r.detailLen}자 short ${r.shortLen}자 | marketer: ${r.marketerOk ? "OK" : "NG"} | blog누수: ${r.blogLeak ? "YES" : "no"} | banned: ${r.bannedCount}`);
    if (r.marketerIssues.length) console.log(`  issues: ${r.marketerIssues.join(", ")}`);
    console.log(`  title: ${r.sample.title}`);
    console.log(`  short: ${r.sample.shortNotice}`);
    console.log(`  detail: ${r.sample.detailBody}…`);
  } else {
    console.log(`  학습표본: ${r.profileSamples} | voice: ${r.voice} | core: ${r.core} | editor: ${r.editor}`);
    console.log(`  hook ${r.hookLen}자 body ${r.bodyLen}자 lines ${r.lineCount} | marketer: ${r.marketerOk ? "OK" : "NG"}`);
    console.log(`  place누수: ${r.placeLeak ? "YES" : "no"} | blog누수: ${r.blogLeak ? "YES" : "no"} | banned: ${r.bannedCount}`);
    if (r.marketerIssues.length) console.log(`  issues: ${r.marketerIssues.join(", ")}`);
    console.log(`  hook: ${r.sample.hook}`);
    console.log(`  body: ${r.sample.body.replace(/\n/g, " / ")}`);
    console.log(`  tags: ${r.sample.hashtags.join(" ")}`);
  }
  console.log("");
}

const allPass = [blog, place, insta].every((r) => r.verdict === "PASS");
const anyFail = [blog, place, insta].some((r) => r.verdict === "FAIL");
console.log("종합:", allPass ? "3/3 PASS" : anyFail ? "일부 FAIL — 상세 위 참고" : "PASS + WARN");
if (anyFail) process.exitCode = 1;
