import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";
import { hasMetaPhilosophyLeak, hasOperatorMetaLeak } from "@/lib/content/metaLayerSeparation";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  mainKeyword: "모션베드 특별할인",
  blogLengthTier: "long",
};
const ctx = { brandName: "템퍼", region: "평택", topic: "모션베드 특별할인" };
const headings = buildBrandFocusedSectionHeadings(input, 8);
const body =
  "평택 템퍼 매장에서 모션베드 특별할인 관련 모델을 직접 누워보고 비교할 수 있습니다. 행사 조건·할인·체험 일정은 매장 안내 기준으로 확인하세요.";
const base = {
  title: "평택 · 템퍼 · 모션베드 특별할인",
  sections: headings.slice(0, 3).map((h) => ({ heading: h, body })),
  conclusion:
    "평택 템퍼 매장에서 모션베드 특별할인 조건을 직접 비교해 보시길 권합니다.",
};
const { pack } = normalizeBlogLengthAndStructure(base, ctx, input);
const full = [
  pack.title,
  ...(pack.sections || []).map((s) => `${s.heading}\n${s.body}`),
  pack.conclusion,
].join("\n");

const badRe =
  /(콘텐츠는\s*문장|기능\s*설명:\s*실제\s*운영|활용\s*방식:\s*팀|발행\s*직전|브랜드\s*맥락|기존\s*AI\s*글|템퍼\s*콘텐츠|검수\s*기준|운영\s*관점)/;
const saasHeadings = (pack.sections || []).some((s) =>
  /기능 설명:|활용 방식:|검수 루틴/.test(s.heading || "")
);

console.log("chars", full.length);
console.log("bad_regex", badRe.test(full));
console.log("saas_headings", saasHeadings);
console.log("operator_leak", hasOperatorMetaLeak(full, ctx));
console.log("philosophy_leak", hasMetaPhilosophyLeak(full, ctx));
console.log("headings:", (pack.sections || []).map((s) => s.heading).join(" | "));

if (badRe.test(full) || saasHeadings) {
  console.error("FAIL temper length pad");
  process.exit(1);
}
console.log("OK temper length pad");
