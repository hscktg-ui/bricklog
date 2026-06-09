import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.BRICLOG_MISSION = "true";

const { enrichMinimalBlogInput } = await import("../lib/llm/blogDeliveryFallback.js");
const { buildMissionProseFallbackPack } = await import("../lib/llm/missionProseFallback.js");
const { applyV14PostWritePack } = await import("../lib/content/v14PostProcess.js");
const { applyDuplicateKiller } = await import("../lib/content/duplicateKillerEngine.js");
const { applyKnowledgeCoverageGate } = await import("../lib/content/knowledgeCoverageGate.js");
const { isSubstantiveSectionBody } = await import("../lib/content/sectionWriterBodies.js");

const input = enrichMinimalBlogInput({
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴",
  industry: "티카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
});

function stats(p, label) {
  console.log(label, {
    sections: p?.sections?.length ?? 0,
    chars: p ? getBlogFullText(p).replace(/\s/g, "").length : 0,
    meta: p?._meta?.editorialQualityStandard,
  });
}

let pack = buildMissionProseFallbackPack(input);
stats(pack, "raw");
const ctx = { input };
pack = applyV14PostWritePack(pack, ctx, "blog");
stats(pack, "v14");
pack = applyDuplicateKiller(pack, ctx, "blog");
stats(pack, "duplicate");
if (pack?.sections?.length) {
  const filtered = (pack.sections || []).filter((s) => isSubstantiveSectionBody(s.body));
  console.log("substantive filter", filtered.length, "of", pack.sections.length);
  for (const [i, s] of pack.sections.entries()) {
    console.log(` sec${i}`, isSubstantiveSectionBody(s.body), s.body.slice(0, 60));
  }
}
