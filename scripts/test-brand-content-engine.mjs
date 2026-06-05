/**
 * Brand Content Engine — 자연 제목·기계적 나열 차단
 */
import {
  buildNaturalBrandTitles,
  isMechanicalListingTitle,
  rewriteMechanicalTitle,
  applyBrandContentEngine,
  detectBrandContentIssues,
} from "../lib/content/brandContentEngine.js";

const ctx = { brandName: "템퍼", region: "평택", topic: "모션베드 특별할인" };
const input = { brandName: "템퍼", region: "평택", topic: "모션베드 특별할인" };

const bad = "평택 · 템퍼 · 모션베드 특별할인";
if (!isMechanicalListingTitle(bad, ctx, input)) {
  console.error("FAIL: should detect mechanical title");
  process.exit(1);
}

const fixed = rewriteMechanicalTitle(bad, ctx, input);
if (isMechanicalListingTitle(fixed, ctx, input)) {
  console.error("FAIL: rewrite still mechanical:", fixed);
  process.exit(1);
}
if (!fixed.includes("템퍼") || !fixed.includes("평택")) {
  console.error("FAIL: missing brand/region in title");
  process.exit(1);
}

const titles = buildNaturalBrandTitles(ctx, input);
if (titles.length < 3) {
  console.error("FAIL: too few natural titles");
  process.exit(1);
}

const pack = applyBrandContentEngine(
  {
    title: bad,
    representativeTitle: bad,
    titles: [bad],
    sections: [{ heading: "소개", body: "본문 테스트입니다." }],
    conclusion: "지금 바로 방문해 보세요. 예약해 주세요.",
  },
  ctx,
  input
);

const issues = detectBrandContentIssues(pack, ctx, input);
if (!issues.ok && issues.issues.some((i) => i.type === "mechanical_title")) {
  console.error("FAIL: mechanical title remained");
  process.exit(1);
}
if (/방문해\s*보세요/.test(pack.conclusion || "")) {
  console.error("FAIL: CTA conclusion remained");
  process.exit(1);
}

console.log("OK: title=", pack.representativeTitle);
console.log("OK: natural titles=", titles.length);
