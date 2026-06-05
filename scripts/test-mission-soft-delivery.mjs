/**
 * 미션 모드 — topic_dominance + information_yield soft gate 시 UI 미리보기 배달
 */
process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import { resolveBlogUiDelivery, salvageBlogPackForDelivery } from "@/lib/generation/postVerifySalvage.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { assertPostWriteDeliverable } from "@/lib/content/v2PipelineGate.js";
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback.js";

const input = enrichMinimalBlogInput({
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  industry: "가구",
  blogLengthTier: "short",
  v2PreWriteVerified: true,
});

let pack = buildMissionProseFallbackPack(input);
pack = applyHumanityFinishPass(pack, { input }, "blog");

// 2섹션만 남긴 thin pack — 예전엔 미리보기 차단
pack = {
  ...pack,
  sections: pack.sections.slice(0, 2),
};

const gate = assertPostWriteDeliverable(input, pack);
const delivery = resolveBlogUiDelivery(pack, input, { withheld: false });

assert.ok(
  delivery.ok,
  `mission soft gate should preview deliver gate=${JSON.stringify(gate.reasons)} delivery=${delivery.userMessage}`
);
assert.ok(delivery.pack?.sections?.length >= 2);

const salvaged = salvageBlogPackForDelivery(pack, input);
assert.ok(
  salvaged.sections.length >= 2,
  "salvage should keep or rebuild sections"
);

console.log("OK: mission soft-info preview delivery");
