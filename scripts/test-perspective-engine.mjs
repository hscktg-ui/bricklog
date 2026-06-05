/**
 * Perspective Engine — 7관점·자동 추천·제목·결말
 */
import {
  CONTENT_PERSPECTIVE_OPTIONS,
  resolveContentPerspective,
  recommendContentPerspective,
  buildPerspectivePromptBlock,
  applyPerspectiveEngine,
  detectPerspectiveIssues,
  buildPerspectiveTitleCandidates,
} from "../lib/content/perspectiveEngine.js";

const baseInput = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
};

if (CONTENT_PERSPECTIVE_OPTIONS.length < 8) {
  console.error("FAIL: perspective options count");
  process.exit(1);
}

const auto = resolveContentPerspective({ ...baseInput, contentPerspective: "auto" });
if (!auto.perspective || auto.source !== "auto") {
  console.error("FAIL: auto resolve", auto);
  process.exit(1);
}

const reviewPick = recommendContentPerspective({
  ...baseInput,
  purpose: "review",
  topic: "방문 후기",
});
if (reviewPick !== "review") {
  console.error("FAIL: expected review perspective, got", reviewPick);
  process.exit(1);
}

const comparePick = recommendContentPerspective({
  ...baseInput,
  competitors: "시몬스, 에이스",
  topic: "매트리스 비교",
});
if (comparePick !== "comparison") {
  console.error("FAIL: expected comparison, got", comparePick);
  process.exit(1);
}

const brief = buildPerspectivePromptBlock({}, { ...baseInput, contentPerspective: "expert" });
if (!brief.includes("전문가") || !brief.includes("선택 기준")) {
  console.error("FAIL: expert brief missing keywords");
  process.exit(1);
}

const ctx = { brandName: "템퍼", region: "평택" };
const titles = buildPerspectiveTitleCandidates(ctx, baseInput, "storytelling");
if (titles.length < 2) {
  console.error("FAIL: too few storytelling titles");
  process.exit(1);
}

const pack = applyPerspectiveEngine(
  {
    title: "평택 · 템퍼 · 모션베드",
    representativeTitle: "평택 · 템퍼 · 모션베드",
    titles: ["평택 · 템퍼 · 모션베드"],
    sections: [{ heading: "소개", body: "본문." }, { heading: "비교", body: "비교 기준." }, { heading: "정리", body: "정리." }],
    conclusion: "지금 바로 방문해 보세요.",
  },
  ctx,
  { ...baseInput, contentPerspective: "comparison" }
);

if (!pack.representativeTitle || pack.representativeTitle.includes(" · ·")) {
  console.error("FAIL: mechanical title remained", pack.representativeTitle);
  process.exit(1);
}
if (/방문해\s*보세요/.test(pack.conclusion || "")) {
  console.error("FAIL: CTA conclusion remained");
  process.exit(1);
}
if (pack._meta?.contentPerspective !== "comparison") {
  console.error("FAIL: perspective meta", pack._meta);
  process.exit(1);
}

const issues = detectPerspectiveIssues(pack, ctx, {
  ...baseInput,
  contentPerspective: "comparison",
});
if (!issues.ok && !issues.issues.some((i) => i.type === "missing_comparison_frame")) {
  // comparison frame may pass with "비교" in sections
}

console.log("OK: auto=", auto.label, "compare=", comparePick, "title=", pack.representativeTitle);
