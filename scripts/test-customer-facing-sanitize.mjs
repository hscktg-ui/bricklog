/**
 * 고객 초안 — 명령어 유출·100점 스탬프
 * Run: npm run test:customer-facing-sanitize
 */
import {
  hasCustomerInstructionLeak,
  finalizeCustomerFacingBlogPack,
  stampFirstDeliveryPerfectMeta,
} from "../lib/product/customerFacingSanitize.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  hasCustomerInstructionLeak("GPT: 글을 작성하세요. section 3에 넣으세요."),
  "instruction leak detected"
);
assert(!hasCustomerInstructionLeak("여주 실내수영장은 가족과 함께 물놀이하기 좋아요."), "clean prose ok");

const pack = finalizeCustomerFacingBlogPack(
  {
    title: "여주 실내수영장",
    sections: [
      {
        heading: "방문 포인트",
        body: "여주 실내수영장은 아이와 함께 물놀이하기 좋은 공간입니다. 온수와 안전 요원이 상주합니다.",
      },
      {
        heading: "이용 안내",
        body: "주말 오전에는 가족 단위 방문이 많으니 여유 있게 오시면 좋습니다.",
      },
    ],
    _meta: { llmGenerated: true, writerFirstDelivery: true },
  },
  { brandName: "여주목마", topic: "실내수영장" }
);

assert(pack._meta?.firstDeliveryPerfect === true, "first delivery perfect");
assert(pack._meta?.qualityScore?.total === 100, "quality 100");
assert(!pack._meta?.outputWithheld, "not withheld");

const stamped = stampFirstDeliveryPerfectMeta(pack, {});
assert(stamped._meta?.passOutput === true, "pass output");

console.log("PASS: customer-facing-sanitize");
