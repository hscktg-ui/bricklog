/**
 * 오피모 전시 — 사용자 샘플 회귀 (모션 스펙·소바·반복·찾게 되는가)
 */
process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "@/lib/constants.js";

const input = {
  brandName: "에이스침대",
  region: "파주",
  industry: "가구",
  topic: "오피모 전시 소식",
  blogLengthTier: "short",
};

let pack = buildMissionProseFallbackPack(input);
pack = applyV17PostWritePack(pack, { input }, "blog");
pack = applyHumanityFinishPass(pack, { input }, "blog");

const full = getBlogFullText(pack);
const headings = (pack.sections || []).map((s) => s.heading).join("\n");
const tier = resolveBlogLengthTier("short");

const forbiddenBody = [
  /옆모드|등모드|헤드업|풋업|체압\s*분산/,
  /소파·테이블·수납/,
  /10분\s*넘게\s*누워/,
  /스프링\s*타입|레이어\s*구성/,
  /프레임\s*높이|모션\s*각도|제로지/,
  /이\s*지역\s*이\s*매장|근처\s*해당\s*브랜드|생활권\s*이곳/,
  /브랜드이다|이\s*매장는|매장는/,
  /확인했다\.|였었다\.|했었다\.|검토했다\.|비교했다\.|생겼었다/,
  /본\s*톤·연출|기능\s*단정\s*없이/,
  /\.라는\s*설명|이다\.라는/,
  /인기를\s*끌고|알려져\s*있다|출시했다/,
  /\b이\s*주제\b/,
  /프레임·침실\s*연출·전시\s*구성\s*흐름/,
];

for (const re of forbiddenBody) {
  assert.ok(!re.test(full), `forbidden: ${re}`);
}

assert.ok(!(/찾게\s*되는가|찾게\s*되었는가/.test(headings)), `bad headings:\n${headings}`);
assert.ok(!/왜\s+.+\s*찾게/.test(headings), `why headings:\n${headings}`);

const blockquotes = full.match(/^> .+/gm) || [];
const uniqueBq = new Set(blockquotes.map((l) => l.replace(/\s/g, "").slice(0, 40)));
assert.ok(uniqueBq.size <= 2, `blockquote dupes: ${blockquotes.length}`);

assert.ok(/쇼룸|전시|신혼|화이트|오피모/.test(full));
assert.ok(/해요|었어요|봤어요|들었어요/.test(full));
assert.ok(countBlogBodyCharsWithSpaces(pack) >= tier.min, `tier min ${tier.min}`);

const dupHeadings = (pack.sections || []).map((s) => s.heading.replace(/\s/g, ""));
assert.ok(new Set(dupHeadings).size === dupHeadings.length, `duplicate headings: ${headings}`);

console.log("OK: opimo exhibition user-sample regression");
console.log("  sections:", pack.sections?.length);
console.log("  chars:", countBlogBodyCharsWithSpaces(pack));
console.log("  headings:", pack.sections?.map((s) => s.heading?.slice(0, 40)).join(" | "));
