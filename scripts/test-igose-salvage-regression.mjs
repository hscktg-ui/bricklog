/**
 * Salvage path must not inject boundary 이곳 for 에이스침대 persona.
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { salvageBlogPackForDelivery } from "../lib/generation/postVerifySalvage.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";

const input = prepareBriclogPreWriteContext({
  brandName: "에이스침대",
  region: "광교",
  topic: "로얄에이스 매트리스 라인업 소개",
  mainKeyword: "로얄에이스 매트리스",
  industry: "가구/침대",
  blogLengthTier: "medium",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
});

const raw = buildMissionProseFallbackPack(input);
const salvaged = salvageBlogPackForDelivery(raw, input);
const full = getBlogFullText(salvaged);
const corrupt = (full.match(/[가-힣]이곳[가-힣]/g) || []).length;

assert.equal(
  corrupt,
  0,
  `salvage should not inject boundary 이곳 (${corrupt}): ${full.slice(0, 200)}`
);

console.log("OK: salvage path clean for ace persona, chars=", full.replace(/\s/g, "").length);
