/**
 * Run: node --import ./scripts/register-alias.mjs scripts/test-channel-derivation-voice.mjs
 */
import {
  adaptInputForChannelDerivation,
  isVisitReviewBlogSource,
  scrubVisitorReviewPhrases,
} from "../lib/content/channelDerivationVoice.js";
import { shouldFeedbackFullRegen } from "../lib/feedback/feedbackBlogDelivery.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const blog = {
  title: "강남 카페 방문 후기",
  _meta: { contentPersona: "visit_review", v4Speaker: "plain_review" },
};

assert(isVisitReviewBlogSource({}, blog), "visit review detect");

const place = adaptInputForChannelDerivation(
  { contentPersona: "visit_review" },
  blog,
  "place"
);
assert(place.contentPersona === "info_intro", "place persona switch");
assert(place.channelDeriveVoice === "smartplace_notice", "place voice");

const insta = adaptInputForChannelDerivation(
  { contentPersona: "visit_review" },
  blog,
  "instagram"
);
assert(insta.contentPersona === "brand_story", "insta persona switch");

const scrubbed = scrubVisitorReviewPhrases("오늘 다녀왔는데 분위기가 좋았어요.\n예약은 플레이스에서 확인하세요.");
assert(!/다녀왔/.test(scrubbed), "visitor scrub");
assert(/예약/.test(scrubbed), "ops line kept");

assert(
  shouldFeedbackFullRegen({
    tagIds: ["length_wrong"],
    memo: "분량이 너무 짧아요",
    existingPack: { sections: [{ heading: "a", body: "b" }] },
  }),
  "length feedback full regen"
);

console.log("OK: channel derivation voice + length feedback regen");
