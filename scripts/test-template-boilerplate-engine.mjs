/**
 * 템플릿 보일러플레이트·explain repair 스팸 회귀 — 카레클린트 301 체어 전시 패턴
 */
import {
  applyExplainRepairToPack,
  applyExplainDefectStripOnly,
  isHollowInfoSentence,
} from "../lib/product/briclogExplainEngine.js";
import {
  assessTemplateBoilerplateSpam,
  stripTemplateBoilerplateFromPack,
  buildExplainAxisLine,
} from "../lib/content/templateBoilerplateEngine.js";
import { applyHumanProseDeliveryPass } from "../lib/content/humanProseDeliveryEngine.js";
import { detectAiWritingPatterns } from "../lib/product/aiPatternDetector.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPLAIN_V3 = "true";
process.env.BRICLOG_FAST_PIPELINE = "true";

const carlintInput = {
  brandName: "카레클린트",
  region: "분당",
  topic: "301 체어 전시",
  mainKeyword: "301 체어 전시",
  industry: "가구",
  storeFeatures: "쇼룸, 301 시리즈 전시",
};

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const spamBody = [
  "분당 카레클린트 쇼룸에서 301 체어 전시를 확인했어요.",
  "카레클린트는 2010년 001 소파 출시를 시작으로 수제작 원목 가구를 선보이는 브랜드이다.",
  "비교해 보니 기준이 보였어요 — 카레클린트에서 실제로 비교해 보면 301 체어 전시를 고를 때 기준이 달라집니다.",
  "301 소파는 카레클린트의 스테디셀러 중 하나이다 — 카레클린트 안내 기준으로 정리했어요.",
  "카레클린트의 가구는 국내에서 좋은 소재로 수제작된다 — 카레클린트 안내 기준으로 정리했어요.",
  "근처용인점은 서울권에서 가장 가까운 경기 쇼룸이다 — 카레클린트 안내 기준으로 정리했어요.",
  "방문객들은 301 시리즈를 직접 앉아보고 만져보며 선택할 수 있다 — 카레클린트 안내 기준으로 정리했어요.",
  "카레클린트는 2010년 001 소파 출시를 시작으로 수제작 원목 가구를 선보이는 브랜드이다 — 카레클린트에서 실제로 비교해 보면 301 체어 전시를 고를 때 기준이 달라집니다.",
].join(" ");

const spamPack = {
  title: "분당 카레클린트 301 체어 전시",
  sections: [{ heading: "전시 확인", body: spamBody }],
};

const beforeSpam = assessTemplateBoilerplateSpam(spamPack);
assert(!beforeSpam.ok, "spam sample should fail assess");

const axisLine = buildExplainAxisLine(carlintInput, 0);
assert(!isHollowInfoSentence(axisLine), "axis line must not be hollow banned phrase");
assert(!/기준이\s*달라집니다/.test(axisLine), "axis line must not use old boilerplate");

const stripped = stripTemplateBoilerplateFromPack(spamPack, carlintInput);
const afterStrip = assessTemplateBoilerplateSpam(stripped);
assert(afterStrip.ok, `strip should pass: ${JSON.stringify(afterStrip.issues)}`);

const fastStrip = applyExplainDefectStripOnly(spamPack, carlintInput);
const fastFull = getBlogFullText(fastStrip);
assert(
  (fastFull.match(/기준이\s*달라집니다/g) || []).length === 0,
  "fast strip must not add 기준이 달라집니다"
);

const regenInput = { ...carlintInput, regenDeliveryPolish: true, rewriteCount: 1 };
const regenRepaired = applyExplainRepairToPack(spamPack, regenInput);
const regenFull = getBlogFullText(regenRepaired);
const regenSpamCount = (regenFull.match(/기준이\s*달라집니다/g) || []).length;
assert(regenSpamCount <= 1, `regen repair max 1 boilerplate, got ${regenSpamCount}`);

const humanPass = applyHumanProseDeliveryPass(stripped, carlintInput);
const humanFull = getBlogFullText(humanPass);
const humanSpam = assessTemplateBoilerplateSpam(humanPass);
assert(humanSpam.ok, `human prose pass spam: ${JSON.stringify(humanSpam.issues)}`);

const ai = detectAiWritingPatterns(humanPass, carlintInput);
assert(ai.ok, `ai pattern after sanitize: ${JSON.stringify(ai.hits)}`);

const formalCount = (humanFull.match(/\s+이다\./g) || []).length;
assert(formalCount === 0, `formal 이다. count should be 0, got ${formalCount}`);

console.log("OK test-template-boilerplate-engine");
console.log("  before spam issues:", beforeSpam.issues.length);
console.log("  after strip issues:", afterStrip.issues.length);
console.log("  regen boilerplate count:", regenSpamCount);
