/**
 * EQS regression — 그랩앤고플라워 여름 꽃 (GPT 품질 기준)
 */
import assert from "node:assert/strict";
import { buildEditorialQualityPack } from "../lib/product/editorialQualityStandard.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const INPUT = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "여름철 꽃 추천",
  mainKeyword: "꽃 추천",
  industry: "꽃집",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  researchFacts: [
    { fact: "파주 운정 24시간 무인 꽃집", source: "research" },
    { fact: "여름 시즌 리시안셔스·수국·해바라기", source: "research" },
  ],
  v2PreWriteVerified: true,
};

const fullFrom = (pack) => getBlogFullText(pack);

let pack = buildMissionProseFallbackPack(INPUT);
pack = finalizeContentQualityForDelivery(pack, INPUT, "blog");
const full = fullFrom(pack);

assert.ok(pack._meta?.editorialQualityStandard || pack._meta?.editorialQualityReshape, "expected EQS path");
assert.ok(/리시안셔스|해바라기|수국|거베라/.test(full), "named flowers required");
assert.ok(/6월|여름|파스텔|선명/.test(full), "season opener required");
assert.ok(/그랩앤고플라워/.test(full), "brand presence");
assert.ok(!/이용\s*볼\s*때/.test(full), "no 이용 placeholder");
assert.ok(!/전시대|매트리스/.test(full), "no furniture leak");
assert.ok((full.match(/계절·목적별로\s*달라지/g) || []).length < 2, "no template spam");

const gate = pack._meta?.contentGate;
assert.ok(gate?.score >= 70, `gate score ${gate?.score}`);

console.log("OK: editorial-quality-standard grab-flower");
console.log("  gate:", gate?.score, "chars:", full.replace(/\s/g, "").length);
