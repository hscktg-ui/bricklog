/**
 * 내부 검수 문장이 고객 본문에 섞이지 않는지
 */
import assert from "node:assert/strict";
import { sanitizeBlogPackMetaLayer, hasMetaPhilosophyLeak } from "../lib/content/metaLayerSeparation.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const sample = {
  title: "평택에서 템퍼 모션베드",
  sections: [
    {
      heading: "기능",
      body: "이 글은 '템퍼는 어떤 곳인가'에 답하려고 썼어요. 확인된 정보만 남기고 과장 표현은 모두 덜어냈습니다. 템퍼 모션베드는 다리 올리기와 리클라이닝을 지원합니다.",
    },
  ],
};

const input = { brandName: "템퍼", region: "평택", topic: "모션베드" };
const scrubbed = sanitizeBlogPackMetaLayer(sample);
const full = getBlogFullText(scrubbed);

assert.ok(!/답하려고/.test(full), "title answer hint removed");
assert.ok(!/확인된 정보만/.test(full), "constitution meta removed");
assert.ok(!hasMetaPhilosophyLeak(full, input), "no meta philosophy leak");

console.log("meta-display-scrub OK");
