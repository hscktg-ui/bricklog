/**
 * 고객-facing 출력 메시지 — formatPostVerifyUserMessage
 */
import { formatPostVerifyUserMessage } from "../lib/product/customerOutput.js";

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

console.log("OK: customer output messages");
console.log(" ", lengthMsg.slice(0, 60));
console.log(" ", dupMsg.slice(0, 60));
