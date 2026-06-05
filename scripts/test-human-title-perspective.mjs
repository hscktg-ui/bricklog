/**
 * Human Title Engine + Perspective title/intro — tests
 */
import {
  buildHumanClickTitles,
  isMechanicalListingTitle,
  rewriteMechanicalTitle,
  titleIncludesAllEntities,
} from "../lib/content/humanTitleEngine.js";
import {
  applyPerspectiveEngine,
  buildPerspectiveTitleCandidates,
} from "../lib/content/perspectiveEngine.js";
import { stripEditorAuditSentences } from "../lib/content/editorQualityEngine.js";
import {
  applyBrandContentEngine,
  rewriteMechanicalTitle as brandRewrite,
} from "../lib/content/brandContentEngine.js";

const ctx = { brandName: "템퍼", region: "평택" };
const input = { brandName: "템퍼", region: "평택", topic: "모션베드 특별할인" };

const badDot = "평택 · 템퍼 · 모션베드 특별할인";
const badSpace = "평택 템퍼 모션베드 특별할인";

for (const bad of [badDot, badSpace]) {
  if (!isMechanicalListingTitle(bad, ctx, input)) {
    console.error("FAIL: should detect mechanical", bad);
    process.exit(1);
  }
  const fixed = rewriteMechanicalTitle(bad, ctx, input, "customer");
  if (isMechanicalListingTitle(fixed, ctx, input)) {
    console.error("FAIL: rewrite still mechanical:", fixed);
    process.exit(1);
  }
  if (!titleIncludesAllEntities(fixed, ctx, input)) {
    console.error("FAIL: missing entities in", fixed);
    process.exit(1);
  }
}

const brandTitle = buildHumanClickTitles(ctx, input, "brand")[0];
const compareTitle = buildHumanClickTitles(ctx, input, "comparison")[0];
if (brandTitle === compareTitle) {
  console.error("FAIL: perspective titles should differ", brandTitle, compareTitle);
  process.exit(1);
}

const pack = applyPerspectiveEngine(
  {
    title: badSpace,
    representativeTitle: badSpace,
    sections: [{ heading: "소개", body: "본문." }],
    conclusion: "지금 바로 방문해 보세요.",
  },
  ctx,
  { ...input, contentPerspective: "comparison" }
);
if (isMechanicalListingTitle(pack.representativeTitle, ctx, input)) {
  console.error("FAIL: perspective pack title mechanical", pack.representativeTitle);
  process.exit(1);
}
if (!pack.sections[0]?.body?.includes("비교")) {
  console.error("FAIL: comparison intro missing", pack.sections[0]?.body);
  process.exit(1);
}

const leak =
  "이 글은 모션베드에 답하려고 썼어요. 확인된 정보만 남기고 과장 표현은 모두 덜어냈습니다. 방문 전 확인하면 도움이 되는 항목부터 간단히 짚어봅니다.";
const cleaned = stripEditorAuditSentences(leak);
if (/답하려고|짚어봅니다|확인된\s*정보/.test(cleaned)) {
  console.error("FAIL: audit leak remained", cleaned);
  process.exit(1);
}

const brandPack = applyBrandContentEngine(
  { title: badSpace, representativeTitle: badSpace, sections: [], conclusion: "" },
  ctx,
  input
);
if (isMechanicalListingTitle(brandPack.representativeTitle, ctx, input)) {
  console.error("FAIL: brand engine title", brandPack.representativeTitle);
  process.exit(1);
}

console.log("OK: brandTitle=", brandTitle);
console.log("OK: compareTitle=", compareTitle);
console.log("OK: perspective=", pack.representativeTitle);
