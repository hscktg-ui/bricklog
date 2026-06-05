/**
 * 칼럼·매거진 기승전결 + 톤 앤드 검수
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import {
  scoreMagazineColumnArc,
  scoreToneBookends,
  loadColumnMagazineProfile,
} from "../lib/content/columnMagazineArchetype.js";
import { scoreBriclogEngine } from "../lib/product/briclogEngineScore.js";

const INPUT = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  mainKeyword: "오피모 전시 소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [{ fact: "파주 — 파주 매장 체험·행사 조건" }],
};

const profile = loadColumnMagazineProfile();
const raw = buildMissionProseFallbackPack(INPUT);
const pack = applyV17PostWritePack(raw, { input: INPUT, ...INPUT }, "blog");
const arc = scoreMagazineColumnArc(pack);
const bookends = scoreToneBookends(pack);
const engine = scoreBriclogEngine(pack, { input: INPUT, ...INPUT });

console.log("=== column magazine arc ===");
console.log("profile samples:", profile.sampleCount);
console.log("arc:", arc.score, arc.ok, arc.reasons.join(", ") || "ok");
console.log("gi/seung/jeon/gyeol:", arc.gi, arc.seung, arc.jeon, arc.gyeol);
console.log("bookends:", bookends.score, bookends.ok, bookends.openVoice, "→", bookends.closeVoice);
console.log("engine:", engine.total, engine.ok, "magazineArc:", engine.components.magazineArc);

if (!arc.ok || !bookends.ok || !engine.components.magazineArcOk) {
  process.exitCode = 1;
}
