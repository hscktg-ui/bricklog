import assert from "node:assert/strict";
import {
  stripInstaBridgeSpam,
  humanizeInstaCaptionPack,
  assessInstaCaptionHumanTone,
} from "../lib/content/instaCaptionHumanize.js";
import { applyInstagramUnifiedProsePass } from "../lib/content/channelUnifiedProseEngine.js";

process.env.BRICLOG_MISSION = "true";

assert.equal(
  stripInstaBridgeSpam("이어서 이어서 향이 좋았어요."),
  "향이 좋았어요."
);
assert.equal(
  stripInstaBridgeSpam("이어서 첫 줄\n\n이어서 둘째 줄"),
  "첫 줄\n\n둘째 줄"
);

const spammy = humanizeInstaCaptionPack({
  hook: "성수 카페",
  body: "이어서 이어서 원두 향이 좋아요.\n\n이어서 저장각이에요.",
  ending: "마지막으로 방문해 보세요.",
});
assert.ok(!/(?:이어서\s*){2,}/.test(spammy.lineBreakBody || spammy.body || ""));
assert.equal(spammy._meta.instaCaptionHumanized, true);

const assessed = assessInstaCaptionHumanTone("훅\n\n본문 한 줄\n\n마무리");
assert.equal(assessed.ok, true);
assert.equal(assessed.duplicateBridge, false);

const input = { brandName: "모카", topic: "원두", region: "성수" };
const pack = applyInstagramUnifiedProsePass(
  {
    hook: "성수 원두",
    body: "이어서 이어서 향이 좋습니다.\n\n또한 저장해두세요.",
    ending: "이어서 방문해보세요.",
  },
  input
);
const full = [pack.hook, pack.body, pack.ending].filter(Boolean).join("\n");
assert.ok(!/(?:이어서\s*){2,}/.test(full), `still has bridge spam: ${full}`);

console.log("OK: insta-caption-humanize");
