/**
 * Channel Story Engine — 인스타·스마트플레이스 Story Target · 해요체 SSOT
 */
process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import { applyChannelStoryGate, scoreChannelStoryPack } from "@/lib/content/channelStoryEngine.js";
import { runPlacePipeline, runInstagramPipeline } from "@/lib/contentPipeline.js";
import { buildChannelGenerationMessages } from "@/lib/llm/buildChannelPrompt.js";
import { finishChannelPack } from "@/lib/product/channelQualityStack.js";

const input = {
  brandName: "에이스침대",
  region: "파주",
  industry: "가구",
  topic: "오피모 전시 소식",
  mainKeyword: "파주 신혼가구 오피모",
};

const blogProxy = {
  title: "파주 신혼가구 오피모 전시",
  sections: [
    {
      heading: "쇼룸",
      body: "파주 에이스침대 쇼룸에서 오피모 프레임 전시를 봤어요. 화이트 톤 침실 무드가 신혼집에 잘 맞을 것 같았어요.",
    },
  ],
};

const placeRaw = {
  title: "오피모 전시",
  shortNotice: "에이스침대 파주점에서 오피모를 만나보세요. 가능합니다.",
  detailBody: "방문 시 확인하세요. A/S 문의는 매장으로. 다른 브랜드와 비교해 보세요.",
};

const placePolished = applyChannelStoryGate(placeRaw, "place", { input });
assert.ok(!/가능합니다/.test(placePolished.shortNotice + placePolished.detailBody));
assert.ok(!/다른\s*브랜드/.test(placePolished.detailBody));
assert.ok(
  /쇼룸|전시|매장|방문|다녀|봤/.test(
    `${placePolished.shortNotice}\n${placePolished.detailBody}`
  )
);
assert.equal(placePolished._meta?.channelStoryGate, true);

const instaRaw = {
  hook: "오피모 전시 안내",
  lineBreakBody: "에이스침대 파주점입니다. 확인하세요.",
  ending: "",
  hashtags: ["#가구"],
};
const instaPolished = applyChannelStoryGate(instaRaw, "instagram", { input });
assert.ok(/해요|었어요|봤|느껴|솔직/.test(instaPolished.lineBreakBody + instaPolished.hook));
assert.ok(instaPolished.hashtags.some((h) => /신혼|화이트|인테리어/.test(h)));

const placeScore = scoreChannelStoryPack(placePolished, "place", input);
assert.ok(placeScore.storyTarget, placeScore.issues.join(", "));

const placeFromPipeline = runPlacePipeline(input, blogProxy, "테스트");
assert.equal(placeFromPipeline._meta?.channelStoryEngine, "v1");

const instaFromPipeline = runInstagramPipeline(input, blogProxy, "emotional", "테스트");
assert.equal(instaFromPipeline._meta?.channelStoryEngine, "v1");

const finished = finishChannelPack(
  "place",
  { title: "t", shortNotice: "s", detailBody: "d" },
  { input, sourceChannel: "blog" }
);
assert.ok(finished._meta?.channelPackFinished);

const placePrompt = buildChannelGenerationMessages("place", { input, ...input })
  .map((m) => m.content)
  .join(" ");
assert.ok(/STORY TARGET|신혼|스토리/.test(placePrompt), "place prompt missing story brief");
assert.ok(/스마트플레이스|플레이스/.test(placePrompt));

const instaPrompt = buildChannelGenerationMessages("instagram", { input, ...input })
  .map((m) => m.content)
  .join(" ");
assert.ok(/STORY TARGET|신혼|캡션|인스타/.test(instaPrompt));

console.log("OK: channel story engine — place/insta gate, pipeline, prompt wiring");
console.log("  place target:", placePolished._meta?.storyTargetLabel);
console.log("  insta hashtags:", instaPolished.hashtags.slice(0, 4).join(" "));
