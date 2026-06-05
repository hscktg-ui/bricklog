/**
 * place · instagram — 블로그급 품질 스택
 */
import assert from "node:assert/strict";
import {
  scoreChannelContentQuality,
  assessChannelFirstDeliveryQuality,
} from "../lib/product/channelQualityStack.js";
import { runPlacePipeline, runInstagramPipeline } from "../lib/contentPipeline.js";

const input = {
  brandName: "꽃담",
  region: "부산 해운대",
  topic: "어버이날 꽃다발",
  industry: "꽃집",
  v4Speaker: "brand_intro",
};

const blog = {
  title: "어버이날, 말 대신 꽃으로 전하는 마음",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "어버이날을 앞두고 부모님께 드릴 꽃을 고르다가 해운대 꽃담을 알게 됐어요. 직접 들러 보니 진열이 차분했고 솔직히 인상이 좋았습니다.",
    },
    {
      heading: "매장에서 본 것",
      body: "다발 구성과 리본 색을 같이 맞춰 주셨고, 픽업 시간도 당일 안내로 확인했어요.",
    },
    {
      heading: "인상",
      body: "화려한 포장보다 오래 두고 봐도 편한 조합을 우선한다는 점이 인상적이었어요.",
    },
  ],
  conclusion: "일정만 정리해 두면 상담이 빨라집니다.",
};

const place = runPlacePipeline(input, blog, "테스트");
assert.ok(place.title?.trim());
assert.ok(place.detailBody?.trim().length >= 40);
const placeQ = scoreChannelContentQuality(place, "place", { input }, input);
assert.ok(placeQ.humanEditorPass, placeQ);

const insta = runInstagramPipeline(input, blog, "emotional", "테스트");
assert.ok((insta.body || insta.lineBreakBody || "").trim().length >= 40);
const instaQ = scoreChannelContentQuality(insta, "instagram", { input }, input);
assert.ok(instaQ.humanEditorPass, instaQ);

const fd = assessChannelFirstDeliveryQuality(place, "place", input);
assert.ok(fd.displayReady, fd);

console.log("OK: channel quality stack — place & instagram");
