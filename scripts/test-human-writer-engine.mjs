/**
 * BRICLOG Human Writer Engine — 금지 소제목·재작성
 */
import {
  buildHumanWriterEnginePromptBlock,
  isHumanWriterForbiddenHeading,
  rewriteHumanWriterHeading,
} from "../lib/product/humanWriterEngine.js";
import { buildBriclogMissionPromptBlock } from "../lib/product/briclogMission.js";
import {
  applyHumanWriterHeadingGate,
  scoreHumanWriterHeadingCompliance,
} from "../lib/content/humanWriterHeadingGate.js";
import {
  isSignatureWritingEnforced,
  rewriteSignatureHeading,
} from "../lib/product/signatureWritingEngine.js";

const block = buildHumanWriterEnginePromptBlock();
if (!block.includes("Reader First")) {
  console.error("FAIL: human writer block missing priority");
  process.exit(1);
}
if (!block.includes("조사 결과를 직접 출력하지 않는다")) {
  console.error("FAIL: human writer core missing");
  process.exit(1);
}

const mission = buildBriclogMissionPromptBlock();
if (!mission.includes("HUMAN WRITER ENGINE")) {
  console.error("FAIL: mission block should include human writer");
  process.exit(1);
}

if (!isHumanWriterForbiddenHeading("브랜드 이해와 제품군")) {
  console.error("FAIL: should detect forbidden heading");
  process.exit(1);
}

const pack = {
  sections: [
    { heading: "브랜드 이해", body: "본문." },
    { heading: "방문 전 체크포인트", body: "본문2." },
  ],
};
const gated = applyHumanWriterHeadingGate(pack, {
  brandName: "템퍼",
  topic: "모션베드",
});
if (gated.sections[0].heading.includes("브랜드 이해")) {
  console.error("FAIL: heading should be rewritten", gated.sections[0].heading);
  process.exit(1);
}
const ctx = { brandName: "템퍼", topic: "모션베드" };
const expected = isSignatureWritingEnforced()
  ? rewriteSignatureHeading("브랜드 이해", ctx)
  : rewriteHumanWriterHeading("브랜드 이해", ctx);
if (gated.sections[0].heading !== expected) {
  console.error("FAIL: unexpected rewrite", gated.sections[0].heading, "expected", expected);
  process.exit(1);
}

const score = scoreHumanWriterHeadingCompliance(gated);
if (!score.ok) {
  console.error("FAIL: gated pack should pass", score.forbidden);
  process.exit(1);
}

console.log("OK: human writer engine — prompt, forbidden headings, gate");
console.log("  rewrite example:", pack.sections[0].heading, "→", gated.sections[0].heading);
