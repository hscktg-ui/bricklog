/**
 * 수제간식업체 소개 — 방문후기 패드·상담메모·해시태그 회귀
 */
import assert from "node:assert/strict";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { hasInformationalPackDefects } from "@/lib/content/informationalTopicPackGate.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";

const input = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제간식업체 소개",
  mainKeyword: "수제간식업체 소개",
  blogLengthTier: "long",
};

assert.ok(isInformationalTopicInput(input), "topic must route informational");

let pack = buildMissionProseFallbackPack(input);
pack = applyHumanityFinishPass(pack, { input, ...input }, "blog");

const full = [
  pack.title,
  pack.representativeTitle,
  getBlogFullText(pack),
  pack.conclusion,
  ...(pack.hashtags || []),
].join("\n");

const defects = [
  [/솔직\s*후기/, "솔직 후기 title"],
  [/당일\s*상담\s*메모/, "상담 메모 pad"],
  [/누워보니/, "누워보니 visit pad"],
  [/직접\s*다녀온/, "직접 다녀온 heading"],
  [/#[\w가-힣]+/, "hashtag"],
  [/향와|질감와|성분와/, "broken particle"],
  [/확인해\s*확인해|둘러확인해/, "stutter pad"],
  [/쇼룸에서/, "showroom visit"],
];

for (const [re, label] of defects) {
  assert.ok(!re.test(full), `defect: ${label}`);
}

assert.equal((pack.hashtags || []).length, 0, "blog hashtags must be empty");
assert.ok(!hasInformationalPackDefects(pack, input), "gate defects remain");

console.log("OK snack informational defect gate");
console.log("title:", pack.title);
console.log("sections:", pack.sections?.length, "chars:", getBlogFullText(pack).length);
