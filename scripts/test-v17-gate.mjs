import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess";
import { assertV17PreOutput } from "@/lib/content/v17ContentGate";
import { expandTopicUnits } from "@/lib/content/topicExpansionEngine";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
  blogLengthTier: "short",
};
const ctx = { brandName: "템퍼", region: "평택", topic: "모션베드 특별할인" };
const headings = buildBrandFocusedSectionHeadings(input, 6);
const body =
  "평택 템퍼 매장에서 모션베드 특별할인 모델을 비교해 보세요. 할인·체험·설치·배송·A/S·방문 예약을 확인하세요.";
let pack = {
  title: "평택 템퍼 모션베드 특별할인",
  sections: headings.slice(0, 4).map((h) => ({ heading: h, body })),
  conclusion: "평택 템퍼 매장 방문을 권합니다.",
};
pack = applyV17PostWritePack(pack, { ...ctx, input }, "blog");
pack = normalizeBlogLengthAndStructure(pack, ctx, input).pack;
const units = expandTopicUnits(ctx, input);
console.log("topic_units", units.length, units.slice(0, 4).join(" | "));
const gate = assertV17PreOutput(pack, "blog", { ...ctx, input });
const bad = /(브랜드 메모리|기능 설명: 실제 운영|콘텐츠 일관성)/.test(
  JSON.stringify(pack)
);
console.log("v17_ok", gate.ok, "reviewer", gate.reviewerScore, "bad_meta", bad);
if (bad) process.exit(1);
if (gate.reasons?.includes("outline_only_output")) process.exit(1);
if (gate.reasons?.includes("meta_philosophy_leak")) process.exit(1);
console.log("OK v17");
