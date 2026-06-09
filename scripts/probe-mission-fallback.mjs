import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.BRICLOG_MISSION = "true";

const { enrichMinimalBlogInput } = await import("../lib/llm/blogDeliveryFallback.js");
const { buildMissionProseFallbackPack } = await import("../lib/llm/missionProseFallback.js");
const { applyV17PostWritePack } = await import("../lib/content/v17PostProcess.js");
const { applyHumanityFinishPass } = await import("../lib/content/humanityFinishPass.js");
const { ensureBlogDisplayPack } = await import("../lib/generation/ensureBlogDisplayPack.js");

const input = enrichMinimalBlogInput({
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴",
  industry: "티카페",
  blogLengthTier: "medium",
});

function stats(p, label) {
  console.log(label, {
    sections: p?.sections?.length ?? 0,
    chars: p ? getBlogFullText(p).replace(/\s/g, "").length : 0,
  });
}

let pack = buildMissionProseFallbackPack(input);
stats(pack, "mission raw");
pack = applyV17PostWritePack(pack, { input }, "blog");
stats(pack, "after v17");
pack = applyHumanityFinishPass(pack, { input }, "blog");
stats(pack, "after humanity");
pack = ensureBlogDisplayPack(pack, input);
stats(pack, "after ensureBlogDisplayPack");
