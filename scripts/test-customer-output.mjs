/**
 * 고객-facing 출력 메시지 — formatPostVerifyUserMessage · 힌트 패널 제목
 */
import {
  formatPostVerifyUserMessage,
  isBlogGenerationFailureHint,
  resolveBlogHintPanelTitle,
} from "../lib/product/customerOutput.js";

const lengthGate = {
  ok: false,
  reasons: ["length_tier_under"],
  failReasons: ["length_tier_under"],
};
const dupGate = {
  ok: false,
  reasons: ["duplicate_content", "sentence_similarity_80"],
};

const lengthMsg = formatPostVerifyUserMessage(lengthGate);
const dupMsg = formatPostVerifyUserMessage(dupGate);

if (!lengthMsg.includes("아직 올리지 않았") || !lengthMsg.includes("분량")) {
  console.error("FAIL: length message", lengthMsg);
  process.exit(1);
}
if (!dupMsg.includes("반복")) {
  console.error("FAIL: dup message", dupMsg);
  process.exit(1);
}
if (/베타\s*검수|SEO|파이프라인/i.test(`${lengthMsg} ${dupMsg}`)) {
  console.error("FAIL: internal terms leaked");
  process.exit(1);
}

const techFailMsg =
  "이번에는 글이 준비되지 않았어요. 잠시 후 「조사 후 글 받기」를 다시 눌러 주세요.";
if (!isBlogGenerationFailureHint(techFailMsg)) {
  console.error("FAIL: technical fail hint not detected");
  process.exit(1);
}
const failTitle = resolveBlogHintPanelTitle(techFailMsg, true);
if (failTitle === "브랜드·주제 조사 중") {
  console.error("FAIL: failure CTA must not show research title", failTitle);
  process.exit(1);
}
if (failTitle !== "잠시 후 다시 시도해 주세요") {
  console.error("FAIL: failure title", failTitle);
  process.exit(1);
}

const researchProgress = "브랜드·지역·주제를 알아보는 중이에요.";
if (resolveBlogHintPanelTitle(researchProgress, true) !== "브랜드·주제 조사 중") {
  console.error("FAIL: in-progress research title");
  process.exit(1);
}

console.log("OK: customer output messages");
console.log(" ", lengthMsg.slice(0, 60));
console.log(" ", dupMsg.slice(0, 60));
console.log(" ", failTitle);
