/**
 * Story Target Engine — 타깃 키워드·장면·스토리텔링 SSOT
 */
process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import {
  resolveStoryTarget,
  buildStoryTargetProblemOpening,
  buildStoryTargetSceneLines,
  buildStoryTargetWriterBrief,
} from "@/lib/product/storyTargetEngine.js";
import { buildHumanStoryProblemOpeningLead } from "@/lib/product/humanStoryEngine.js";

const newlywedInput = {
  brandName: "에이스침대",
  region: "파주",
  industry: "가구",
  topic: "오피모 전시 소식",
  mainKeyword: "파주 신혼가구 오피모",
};

const resolved = resolveStoryTarget(newlywedInput);
assert.ok(resolved, "resolved");
assert.equal(resolved.target.id, "newlywed", `expected newlywed, got ${resolved.target.id}`);

const opening = buildHumanStoryProblemOpeningLead(newlywedInput);
assert.ok(/신혼|침실|설렘|고민/.test(opening), opening);

const scenes = buildStoryTargetSceneLines(newlywedInput, 2);
assert.ok(scenes.length >= 1);
assert.ok(/쇼룸|전시|화이트|신혼/.test(scenes.join(" ")));
assert.ok(!/체압\s*분산|모션\s*기능/.test(scenes.join(" ")));

const brief = buildStoryTargetWriterBrief(newlywedInput);
assert.ok(/신혼가구/.test(brief));
assert.ok(/#화이트인테리어|#신혼가구/.test(brief));

const exhibitionOnly = resolveStoryTarget({
  brandName: "에이스침대",
  region: "대구",
  industry: "가구",
  topic: "오피모 전시",
});
assert.equal(exhibitionOnly?.target?.id, "exhibition");

console.log("OK: story target engine — newlywed > exhibition, scenes, brief");
console.log("  target:", resolved.target.label);
console.log("  opening:", opening.slice(0, 56) + "…");
