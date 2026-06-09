import { readFileSync, writeFileSync, mkdirSync } from "fs";
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
} catch {}

const { generateBlogWithLLMFirst } = await import("../lib/llm/contentOrchestrator.js");

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  v2AxisRequired: false,
  v2PipelineEnforced: false,
  v3EngineEnforced: false,
  betaTestGuardEnforced: false,
  researchFacts: [
    { fact: "경주 황리단길 인근 다실 티 전문 카페", source: "research" },
    { fact: "가을 시즌 밀크티 보이차 허브티 시즌 메뉴", source: "research" },
    { fact: "창가 단독석 2~4인 테이블 조용한 분위기", source: "research" },
    { fact: "티 세트 스콘 마들렌 디저트 함께 주문", source: "research" },
    { fact: "보이차는 따뜻하게 우려 차분한 향", source: "research" },
    { fact: "허브티는 카모마일 페퍼민트 등 선택", source: "research" },
  ],
  _skipDefaultResearch: true,
};

const r = await generateBlogWithLLMFirst(INPUT);
const raw = r.blogContent || {};
let pack = finalizeContentQualityForDelivery(raw, INPUT, "blog") || raw;
const full = getBlogFullText(pack);

const report = {
  ok: r.ok,
  mode: r.mode,
  withheld: r.withheld,
  userMessage: r.userMessage,
  meta: r.meta,
  rawMeta: raw._meta,
  golden: pack._meta?.goldenGate,
  publishReady: pack._meta?.publishReady,
  chars: full.replace(/\s/g, "").length,
};

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "deep-report.json"), JSON.stringify(report, null, 2), "utf8");
writeFileSync(join(outDir, "article-deep.md"), full, "utf8");

console.log(JSON.stringify(report, null, 2));
console.log("\n---\n", full);
