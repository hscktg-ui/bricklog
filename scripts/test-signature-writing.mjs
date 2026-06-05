/**
 * Signature Writing Engine — 관점·도입·업종 서명
 */
process.env.BRICLOG_MISSION = "true";

import { buildSignatureWritingPromptBlock } from "../lib/product/signatureWritingEngine.js";
import { applySignatureWritingGate } from "../lib/content/signatureWritingGate.js";

const brief = buildSignatureWritingPromptBlock({
  brandName: "템퍼",
  industry: "가구",
  topic: "모션베드",
});
if (!brief.includes("업종 서명")) {
  console.error("FAIL: industry signature brief missing");
  process.exit(1);
}
if (!brief.includes("관점을 설명")) {
  console.error("FAIL: signature core missing");
  process.exit(1);
}

const pack = {
  sections: [
    {
      heading: "브랜드 소개",
      body: "템퍼는 이번에 모션베드를 소개합니다. 제품은 이렇습니다.",
    },
  ],
};
const gated = applySignatureWritingGate(pack, {
  brandName: "템퍼",
  topic: "모션베드",
});
if (gated.sections[0].heading.includes("브랜드 소개")) {
  console.error("FAIL: heading not rewritten", gated.sections[0].heading);
  process.exit(1);
}
if (!gated._meta?.signatureWritingGate?.openingAdjusted) {
  console.error("FAIL: opening should be flagged");
  process.exit(1);
}
if (/제품은\s*이렇습니다/.test(gated.sections[0].body.split(/\n\n/)[0])) {
  console.error("FAIL: body should not lead with product voice", gated.sections[0].body.slice(0, 100));
  process.exit(1);
}
if (!/허리|침대|바꿀|왜/.test(gated.sections[0].body)) {
  console.error("FAIL: human story opening missing in body");
  process.exit(1);
}

console.log("OK: signature writing — prompt, heading rewrite, opening gate");
console.log("  heading:", pack.sections[0].heading, "→", gated.sections[0].heading);
