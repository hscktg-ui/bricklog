/**
 * 루트앤컷 미용실 — 동일 입력 · 전(레거시 폴백) vs 후(Human Story 엔진) vs 골든 샘플
 */
process.env.BRICLOG_MISSION = "true";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURED_SAMPLE_SEEDS } from "@/lib/landing/featuredSampleSeeds.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { applySignatureWritingGate } from "@/lib/content/signatureWritingGate.js";
import { scoreHumanStoryOpening } from "@/lib/product/humanStoryEngine.js";
import { scoreHumanEditorGuard } from "@/lib/content/humanEditorGuardPass.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** 품질 검수·샘플에 쓰인 입력 (featured seed 기준) */
export const SALON_COMPARE_INPUT = {
  brandName: "루트앤컷",
  region: "서울 강남 역삼",
  topic: "두피 케어 + 염색 솔직 후기",
  mainKeyword: "강남 미용실 두피 염색",
  industry: "미용실",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "역삼역 도보 5분 · 네이버 예약·전화" },
    { fact: "두피 진단 후 케어·염색 순서 상담" },
    { fact: "주차 건물 지하 기계식 · SUV 사전 문의" },
    { fact: "평일 오전·초저녁 한산" },
  ],
};

function packToMarkdown(pack, label) {
  const lines = [`## ${label}`, "", `**제목:** ${pack.title || "(없음)"}`, ""];
  for (const sec of pack.sections || []) {
    lines.push(`### ${sec.heading}`, "", sec.body || "", "");
  }
  if (pack.conclusion) {
    lines.push("### 맺음말", "", pack.conclusion, "");
  }
  return lines.join("\n");
}

function firstParagraph(body = "") {
  return String(body || "").split(/\n\n+/)[0]?.trim() || "";
}

function buildLegacyBeforePack(input) {
  let pack = buildMissionProseFallbackPack(input);
  const p = pack.sections?.[0];
  if (!p) return pack;

  const legacyOpen = `솔직히 서울 강남 역삼 루트앤컷는 두피·염색 때문에 검색하다가 예약했어요.`;
  const legacyGi = `요즘 서울 강남 역삼 미용실을 알아보면서 루트앤컷 후보에 올려뒀어요. 두피·염색 때문에 왜 지금 찾게 됐는지부터 짚어 볼게요.`;
  const paras = String(p.body || "").split(/\n\n+/).filter(Boolean);
  const rest = paras.filter(
    (para) =>
      !/염색은 하고 싶은데|두피가 먼저 걱정|그래서.*후보/.test(para)
  );
  pack = {
    ...pack,
    sections: [
      {
        ...p,
        heading: "왜 미용실을 알아보게 됐는지",
        body: [legacyOpen, legacyGi, ...rest.slice(2)].filter(Boolean).join("\n\n"),
      },
      ...pack.sections.slice(1),
    ],
    _meta: { ...(pack._meta || {}), compareVariant: "legacy_fallback_before_human_story" },
  };
  return pack;
}

/** 현재 앱 배달에 가까운 파이프라인 */
function buildAfterPack(input) {
  let pack = buildMissionProseFallbackPack(input);
  const ctx = { input };
  pack = applyV17PostWritePack(pack, ctx, "blog");
  pack = applySignatureWritingGate(pack, ctx);
  pack = applyHumanityFinishPass(pack, ctx, "blog");
  return { ...pack, _meta: { ...(pack._meta || {}), compareVariant: "human_story_engine_after" } };
}

function goldenPackFromSeed() {
  const seed = FEATURED_SAMPLE_SEEDS.find((s) => s.id === "salon_scalp_dye");
  return {
    title: seed.blogTitle,
    representativeTitle: seed.blogTitle,
    sections: seed.blogSections.map((s) => ({ heading: s.heading, body: s.body })),
    conclusion: seed.blogConclusion,
    _meta: { compareVariant: "golden_handwritten_sample" },
  };
}

function scoreLine(pack, input) {
  const full = getBlogFullText(pack);
  const story = scoreHumanStoryOpening(full, input);
  const guard = scoreHumanEditorGuard(full, input);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const open0 = firstParagraph(pack.sections?.[0]?.body);
  return { chars, story, guard, open0 };
}

const golden = goldenPackFromSeed();
const before = buildLegacyBeforePack(SALON_COMPARE_INPUT);
const after = buildAfterPack(SALON_COMPARE_INPUT);

const scores = {
  golden: scoreLine(golden, SALON_COMPARE_INPUT),
  before: scoreLine(before, SALON_COMPARE_INPUT),
  after: scoreLine(after, SALON_COMPARE_INPUT),
};

const afterFull = [
  after.title,
  ...after.sections.map((s) => s.body),
  after.conclusion,
].join("\n");
if (/파주|운정미용|야당미용/.test(afterFull)) {
  console.error("FAIL: foreign region leak in after pack");
  process.exit(1);
}
if ((afterFull.match(/비교할\s*때\s*가격·조건·이용\s*절차/g) || []).length >= 2) {
  console.error("FAIL: checklist pad still heavy in after");
  process.exit(1);
}

const md = [
  "# 루트앤컷 미용실 블로그 — Human Story 엔진 전·후 비교",
  "",
  "## 동일 입력",
  "",
  "```json",
  JSON.stringify(SALON_COMPARE_INPUT, null, 2),
  "```",
  "",
  "## 점수 요약",
  "",
  "| 구분 | 본문 글자수 | Human Story 도입 | Human Editor Guard |",
  "|------|------------|-------------------|-------------------|",
  `| A. 골든 샘플 (수동 작성·검수에 넣은 글) | ${scores.golden.chars} | ${scores.golden.story.ok ? "✅" : "❌"} ${scores.golden.story.score} | ${scores.golden.guard.score} |`,
  `| B. 엔진 적용 **전** (구 폴백 도입) | ${scores.before.chars} | ${scores.before.story.ok ? "✅" : "❌"} ${scores.before.story.score} | ${scores.before.guard.score} |`,
  `| C. 엔진 적용 **후** (현재 폴백+후처리) | ${scores.after.chars} | ${scores.after.story.ok ? "✅" : "❌"} ${scores.after.story.score} | ${scores.after.guard.score} |`,
  "",
  "## 첫 섹션 도입만 비교",
  "",
  "### A. 골든 샘플",
  "",
  `> ${scores.golden.open0.replace(/\n/g, " ")}`,
  "",
  "### B. 엔진 적용 전 (브랜드·검색 먼저)",
  "",
  `> ${scores.before.open0.replace(/\n/g, " ")}`,
  "",
  "### C. 엔진 적용 후 (사람 문제 먼저)",
  "",
  `> ${scores.after.open0.replace(/\n/g, " ")}`,
  "",
  "---",
  "",
  packToMarkdown(golden, "A. 골든 샘플 (수동 · 품질 검수용)"),
  "---",
  "",
  packToMarkdown(before, "B. 자동 생성 · Human Story 적용 전"),
  "---",
  "",
  packToMarkdown(after, "C. 자동 생성 · Human Story 적용 후"),
  "",
].join("\n");

const outPath = path.join(
  root,
  "artifacts/blog-samples/compare-루트앤컷-human-story-전후.md"
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, "utf8");

console.log("=== 루트앤컷 · 동일 입력 비교 ===\n");
console.log("입력:", SALON_COMPARE_INPUT.brandName, "/", SALON_COMPARE_INPUT.region);
console.log("");
console.log("| | 글자수 | Story 도입 | Guard |");
console.log("|---|--------|------------|-------|");
for (const [label, s] of [
  ["A 골든", scores.golden],
  ["B 적용전", scores.before],
  ["C 적용후", scores.after],
]) {
  console.log(
    `| ${label} | ${s.chars} | ${s.story.ok ? "OK" : "FAIL"} (${s.story.score}) | ${s.guard.score} |`
  );
}
console.log("\n--- 첫 문단 ---\n");
console.log("[A 골든]\n", scores.golden.open0.slice(0, 220), "…\n");
console.log("[B 적용전]\n", scores.before.open0.slice(0, 220), "…\n");
console.log("[C 적용후]\n", scores.after.open0.slice(0, 220), "…\n");
console.log("\n전문:", outPath);
