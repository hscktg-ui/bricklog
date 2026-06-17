/**
 * Channel unified prose — place + instagram
 */
import {
  applyChannelUnifiedProsePass,
  applyPlaceUnifiedProsePass,
  applyInstagramUnifiedProsePass,
  assessChannelUnifiedProse,
  buildPlaceNoticeThesis,
} from "../lib/content/channelUnifiedProseEngine.js";

process.env.BRICLOG_MISSION = "true";

const input = {
  brandName: "모카 브루",
  topic: "봄 시즌 원두",
  region: "성수",
};

let failed = 0;
function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const placePack = {
  title: "성수 모카 브루 봄 원두 안내",
  shortNotice: "신제품이 나왔습니다. 또한 방문하실 수 있습니다.",
  detailBody: "원두가 다양합니다.\n\n매장에서 확인할 수 있습니다.\n\n정성껏 준비하여 운영하고 있습니다.",
};

const place = applyPlaceUnifiedProsePass(placePack, input);
assert("place thesis", /안내/.test(buildPlaceNoticeThesis(input)));
assert("place AI transition removed", !/또한/.test(place.shortNotice || ""));
assert("place detail structured", /·\s|이어서/.test(place.detailBody || ""));
assert("place human tone", place._meta?.placeNoticeHumanized === true);
assert("place process narration removed", !/정성껏 준비하여/.test(place.detailBody || ""));
assert("place unified meta", place._meta?.channelUnifiedProsePass === true);

const instaPack = {
  hook: "성수 원두 맛집",
  body: "원두가 좋습니다.\n\n향이 좋습니다.\n\n또한 저장해두세요.",
  ending: "특히 방문해보세요.",
  hashtags: ["성수카페", "원두"],
};

const insta = applyInstagramUnifiedProsePass(instaPack, input);
const instaFull = [insta.hook, insta.body, insta.ending].join("\n");
assert("insta staccato merged", !/원두가 좋습니다\.\s*향이/.test(insta.body || ""));
assert("insta no 특히 opener", !/^특히 /m.test(insta.ending || ""));
assert("insta no duplicate bridge", !/(?:이어서\s*){2,}/.test(instaFull));
assert("insta human tone", insta._meta?.instaCaptionHumanized === true);
assert("insta emotion", /생각보다|느껴|좋을/.test(instaFull));
assert("insta unified meta", insta._meta?.channelUnifiedProsePass === true);

const viaRouter = applyChannelUnifiedProsePass(placePack, "place", input);
assert("router place", viaRouter._meta?.channelUnifiedProseChannel === "place");

const assessed = assessChannelUnifiedProse(place, "place", input);
assert("place assessment ok", assessed.ok === true);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: channel unified prose");
