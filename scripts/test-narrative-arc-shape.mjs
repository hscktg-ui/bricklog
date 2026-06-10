/**
 * Narrative arc shape — jumbled mission pack → 기승전결 정렬
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyHumanVoiceDeliveryPass } from "../lib/content/humanVoiceDeliveryPass.js";
import {
  applyNarrativeArcShape,
  scoreNarrativeCoherence,
  detectSectionArcRole,
  reorderSectionsByArc,
} from "../lib/product/narrativeArcShapeEngine.js";
import { scoreMagazineColumnArc } from "../lib/content/columnMagazineArchetype.js";

const flowerInput = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "오늘의꽃",
  industry: "꽃집",
  blogLengthTier: "short",
  mainKeyword: "파주 꽃집, 오늘의꽃",
};

const raw = buildMissionProseFallbackPack(flowerInput);
assert.ok(raw?.sections?.length >= 3, "mission pack sections");

const beforeArc = scoreMagazineColumnArc(raw);
const jumbled = {
  ...raw,
  sections: [...raw.sections].reverse(),
};
const reordered = reorderSectionsByArc(jumbled.sections);
const roles = reordered.map((s) => detectSectionArcRole(s));
const giIdx = roles.indexOf("gi");
const gyeolIdx = roles.lastIndexOf("gyeol");
if (giIdx >= 0 && gyeolIdx >= 0) {
  assert.ok(giIdx < gyeolIdx, `gi(${giIdx}) should precede gyeol(${gyeolIdx})`);
}

const shaped = applyNarrativeArcShape(jumbled, flowerInput);
assert.ok(shaped._meta?.narrativeArcShape, "narrative arc stamped");
const afterArc = scoreMagazineColumnArc(shaped);
assert.ok(
  afterArc.score >= beforeArc.score - 5,
  `arc score should not regress badly: ${beforeArc.score} -> ${afterArc.score}`
);

const voiced = applyHumanVoiceDeliveryPass(shaped, flowerInput);
const coherence = scoreNarrativeCoherence(voiced, flowerInput);
const padHits = (voiced.sections || []).flatMap((s) =>
  String(s.body || "")
    .split(/\n\n+/)
    .filter((p) => /관련\s+안내를\s+직접\s+들었어요/.test(p))
);
assert.ok(padHits.length <= 1, `mission pad paragraphs should be pruned: ${padHits.length}`);

const headings = (voiced.sections || []).map((s) => s.heading).join("|");
assert.ok(!/체크\s*포인트|비교할\s*때\s*막히는/.test(headings), "generic headings removed");

console.log("OK: narrative-arc-shape", {
  sections: voiced.sections?.length,
  arcBefore: beforeArc.score,
  arcAfter: afterArc.score,
  coherence: coherence.score,
  coherenceOk: coherence.ok,
  headings: voiced.sections?.map((s) => s.heading),
});
