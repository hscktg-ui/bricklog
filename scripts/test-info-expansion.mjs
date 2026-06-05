import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { buildSectionPlan } from "@/lib/content/sectionPlannerEngine";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { getBlogFullText } from "@/utils/qualityCheck";

const cases = [
  { industry: "가구", topic: "모션베드 할인", brand: "템퍼", region: "평택" },
  { industry: "카페", topic: "시그니처 브런치", brand: "모닝컵", region: "강남" },
  { industry: "세차", topic: "프리미엄 코팅", brand: "샤인워시", region: "수원" },
];

for (const c of cases) {
  const input = { ...c, blogLengthTier: "short" };
  const ctx = { ...c };
  const plan = buildSectionPlan(ctx, input);
  const sameBody = `${c.brand} ${c.topic} 안내입니다. `.repeat(8);
  let pack = {
    title: `${c.region} ${c.brand}`,
    sections: [{ heading: "소개", body: sameBody }],
    conclusion: "방문해 보세요.",
  };
  const normalized = normalizeBlogLengthAndStructure(pack, ctx, input);
  pack = normalized.pack;
  const full = getBlogFullText(pack);
  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2 });
  const info = scoreInformationYield(full, { ...ctx, input }, "blog");
  const uniqueSections = new Set((pack.sections || []).map((s) => s.heading)).size;
  console.log(
    c.industry,
    "| chars",
    normalized.charCount,
    "| sections",
    pack.sections?.length,
    "| unique headings",
    uniqueSections,
    "| dup",
    dup.ok,
    "| info",
    info.score,
    "| plan",
    plan.categoryKey
  );
}
console.log("OK info expansion smoke");
