/**
 * Human Belief v1.5 — 광고 smell · 조사 박힘 · 로컬 편집
 */
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { scoreGroundedSpecificity } from "../lib/content/groundedSpecificityGate.js";
import { applyHumanBeliefGate } from "../lib/content/humanBeliefGate.js";
import { buildStyleAnchorBrief } from "../lib/memory/styleAnchorEngine.js";
import { buildBriclogMissionPromptBlock } from "../lib/product/briclogMission.js";

const mission = buildBriclogMissionPromptBlock();
if (!mission.includes("HUMAN BELIEF")) {
  console.error("FAIL: mission missing human belief");
  process.exit(1);
}

const anchor = buildStyleAnchorBrief({
  styleAnchors: [{ title: "템퍼 모션베드", snippet: "허리가 먼저 아파서 침대부터 바꿨어요. 매장에서 누워보고 각도 조절이 편한지 확인했습니다." }],
  brandFeedbackBrief: "과장 표현 빼기",
});
if (!anchor.includes("STYLE ANCHOR")) {
  console.error("FAIL: style anchor missing");
  process.exit(1);
}

const adPack = {
  title: "테스트",
  sections: [
    {
      heading: "소개",
      body: "템퍼는 최고의 선택입니다. 제품은 이렇습니다. 지금 바로 문의하세요. 많은 분들께 추천드립니다.",
    },
  ],
};
const gated = applyHumanBeliefGate(adPack, { brandName: "템퍼", topic: "모션베드" });
const afterBody = gated.sections[0].body;
if (/제품은 이렇습니다/.test(afterBody)) {
  console.error("FAIL: local editor should strip brochure voice");
  process.exit(1);
}

const belief = gated._meta?.humanBelief || scoreHumanBelief(afterBody, { brandName: "템퍼" });
if (belief.ok) {
  console.error("FAIL: ad copy should fail human belief", belief);
  process.exit(1);
}

const goodPack = {
  sections: [
    {
      heading: "왜 바꾸려 하는가",
      body: "허리가 아파 침대부터 손댔습니다. 매장에서 직접 누워보고 각도를 조절해 봤고, 3월까지 행사 조건을 확인했습니다.",
    },
  ],
};
const facts = [{ fact: "3월까지 행사" }, { fact: "각도 조절" }];
const grounded = scoreGroundedSpecificity(goodPack, { brandName: "템퍼" }, facts);
if (!grounded.ok && grounded.factAnchors < 1) {
  console.error("FAIL: grounded pack should anchor facts", grounded);
  process.exit(1);
}

console.log("OK: human belief v1.5 — ad detect, local strip, style anchor, grounding");
console.log("  ad belief score:", belief.score, "issues:", belief.issues.join(", "));
