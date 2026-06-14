/**
 * prod blog delivery belief finish
 */
import assert from "node:assert/strict";
import { finishBlogPackForDelivery, DELIVERY_BELIEF_FLOOR } from "../lib/product/blogDeliveryFinish.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const input = {
  brandName: "꽃담",
  region: "부산 해운대",
  topic: "어버이날 꽃다발",
  industry: "꽃집",
  v4Speaker: "brand_intro",
};

const pack = {
  title: "어버이날 꽃다발 고르기",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "어버이날을 앞두고 부모님께 드릴 꽃을 고르다가 해운대 꽃담을 알게 됐어요. 직접 들러 보니 진열이 차분했고 솔직히 인상이 좋았습니다.",
    },
    {
      heading: "매장에서 본 것",
      body: "다발 구성과 리본 색을 같이 맞춰 주셨고, 픽업 시간도 당일 안내로 확인했어요.",
    },
  ],
  conclusion: "일정만 정리해 두면 상담이 빨라집니다.",
};

const finished = finishBlogPackForDelivery(pack, input);
assert.equal(finished._meta?.deliveryBlogBeliefFinish, true);
assert.ok(finished.sections?.length >= 2);

const belief = scoreHumanBelief(getBlogFullText(finished), input, finished);
assert.ok(belief.score >= 0);
assert.ok(DELIVERY_BELIEF_FLOOR > 0);

console.log("OK: blog delivery finish — belief", belief.score);
