/**
 * Visit review unified prose — staccato merge, phrase cap, field realism
 */
import {
  applyVisitReviewUnifiedProsePass,
  assessVisitReviewUnifiedProse,
  buildVisitReviewThesis,
} from "../lib/content/visitReviewUnifiedProseEngine.js";
import { applyHumanProseDeliveryPass } from "../lib/content/humanProseDeliveryEngine.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const input = {
  brandName: "템퍼",
  topic: "모션베드 체험",
  region: "평택",
  industry: "가구/침대",
};

const staccatoPack = {
  title: "평택 템퍼 모션베드",
  sections: [
    {
      heading: "매장",
      body: "매장은 넓습니다.\n\n제품 종류도 다양합니다.\n\n직원 설명도 친절했습니다.",
    },
    {
      heading: "체험",
      body: "침대를 직접 확인할 수 있습니다. 또한 경험할 수 있습니다. 확인해보시기 바랍니다.",
    },
    {
      heading: "정리",
      body: "좋은 원목을 선별하여 제작한 가구입니다. 특히 운영하고 있습니다.",
    },
  ],
};

let failed = 0;
function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const thesis = buildVisitReviewThesis(input);
assert("thesis is one-line visit story", /다녀와|체험|후기/.test(thesis));

const unified = applyVisitReviewUnifiedProsePass(staccatoPack, input);
const full = (unified.sections || []).map((s) => s.body).join("\n\n");

assert("staccato merged into flowing prose", !/매장은 넓습니다\.\s*제품/.test(full));
assert("phrase cap reduces duplicate 확인", (full.match(/직접 확인/g) || []).length <= 1);
assert("process narration rewritten", !/선별하여 제작/.test(full));
assert("AI opener stripped from sentence start", !/^또한 /m.test(full));
assert("field realism markers present", /들어|분위기|눈에|체험|직접/.test(full));
assert("emotion markers present", /생각보다|인상|느껴|의외|만족/.test(full));
assert("cross-section bridge", /이어서|그 흐름|같은 기준/.test(full));
assert("thesis stored in meta", unified._meta?.visitReviewThesis?.length > 10);

const assessed = assessVisitReviewUnifiedProse(unified, input);
assert("unified prose assessment ok", assessed.ok === true);

const delivery = applyHumanProseDeliveryPass(staccatoPack, input);
assert("human prose v3 stamped", delivery._meta?.humanProseDeliveryVersion === "human-prose-v3");
assert("visit review pass in pipeline", delivery._meta?.visitReviewUnifiedPass === true);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: visit review unified prose");
