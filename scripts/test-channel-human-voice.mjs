/**
 * 채널별 휴먼 보이스 SSOT 회귀
 */
import { getChannelHumanVoice, getChannelLoadingSteps, BRICLOG_MAIN_PROMISE } from "../lib/product/channelHumanVoice.js";
import { CHANNEL_PRODUCTS } from "../lib/channels/channelProducts.js";
import { getGenerationSteps, getCompleteMessage } from "../lib/loading/generationSteps.js";
import { resolveDeliveryTrustBadge } from "../lib/product/deliveryTrustDisplay.js";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

assert("main promise mentions speed", /1~2분/.test(BRICLOG_MAIN_PROMISE));
assert("blog role", getChannelHumanVoice("blog").role === "칼럼니스트");
assert("place role", getChannelHumanVoice("place").role === "브랜드 담당자");
assert("detail role", getChannelHumanVoice("detailPage").role === "상세 디자인");
assert("detail alias", getChannelHumanVoice("detail").role === "상세 디자인");

const blogSteps = getGenerationSteps("blog");
assert("blog loading mentions column", blogSteps.some((s) => /칼럼/.test(s.text)));

const placeSteps = getGenerationSteps("place");
assert("place loading mentions brand", placeSteps.some((s) => /담당자|브랜드/.test(s.text)));

const instaSteps = getGenerationSteps("instagram");
assert("insta loading mentions marketer", instaSteps.some((s) => /마케터/.test(s.text)));

assert("channel products wired", CHANNEL_PRODUCTS.blog.voiceRole === "칼럼니스트");
assert("place products wired", CHANNEL_PRODUCTS.place.voiceRole === "브랜드 담당자");
assert("detail products wired", CHANNEL_PRODUCTS.detailPage.voiceRole === "상세 디자인");
assert("detail product name", CHANNEL_PRODUCTS.detailPage.menuLabel === "상세페이지");

const badge = resolveDeliveryTrustBadge(
  { sections: [{ body: "test" }], _meta: { publishReady: true, contentQualityDelivered: true } },
  { channel: "place" }
);
assert("trust hint uses voice", /브랜드 담당자/.test(badge.hint));

assert("complete message blog", /칼럼/.test(getCompleteMessage("blog")));
assert("complete message detail", /상세/.test(getCompleteMessage("detailPage")));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: channel human voice");
