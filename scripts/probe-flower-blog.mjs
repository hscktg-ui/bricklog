/**
 * 꽃집 블로그 생성 프로브 — Haeshin DNA 품질 확인
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}

const { generateBlogWithLLMFirst } = await import("../lib/llm/contentOrchestrator.js");

const INPUT = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "여름철 꽃 추천",
  mainKeyword: "꽃 추천",
  industry: "꽃집",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  v2PreWriteVerified: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  researchFacts: [
    { fact: "파주 운정 24시간 무인 꽃집", source: "research" },
    { fact: "여름 시즌 리시안셔스·수국·해바라기·거베라", source: "research" },
    { fact: "당일 구매·무인 셀프 결제 가능", source: "research" },
  ],
  _skipDefaultResearch: true,
};

const r = await generateBlogWithLLMFirst(INPUT);
const pack =
  finalizeContentQualityForDelivery(r.blogContent || {}, INPUT, "blog") || r.blogContent || {};
const full = getBlogFullText(pack);
const gate = pack._meta?.goldenGate || r.meta?.goldenGate;

console.log("=== META ===");
console.log(
  JSON.stringify(
    {
      ok: r.ok,
      withheld: r.withheld,
      mode: r.mode,
      userMessage: r.userMessage,
      sections: pack.sections?.length,
      chars: full.replace(/\s/g, "").length,
      goldenScore: gate?.score,
      goldenVerdict: gate?.verdict,
      haeshinScore: gate?.haeshin?.score,
      publishReady: pack._meta?.publishReady,
    },
    null,
    2
  )
);

console.log("\n=== TITLE ===");
console.log(pack.title || "(no title)");

console.log("\n=== BODY ===");
for (const sec of pack.sections || []) {
  if (sec.heading) console.log(`\n## ${sec.heading}`);
  console.log(sec.body || "");
}

console.log("\n=== CONCLUSION ===");
console.log(pack.conclusion || "");
