import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
const input = {
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  mainKeyword: "루체3",
  industry: "가구/침대",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  researchFacts: [
    { fact: "파주 매장 루체3 전시", source: "research" },
    { fact: "전시 기간 매장 안내", source: "research" },
  ],
};

try {
  const r = await generateBlogWithLLMFirst(input);
  console.log(
    JSON.stringify(
      {
        ok: r.ok,
        mode: r.mode,
        withheld: r.withheld,
        sections: r.blogContent?.sections?.length,
        userMessage: r.userMessage,
        failReasons: r.meta?.failReasons,
      },
      null,
      2
    )
  );
} catch (e) {
  console.error("THROW", e.message);
  console.error(e.stack);
  process.exit(1);
}
