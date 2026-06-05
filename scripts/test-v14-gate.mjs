import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";
import { applyV14PostWritePack } from "@/lib/content/v14PostProcess";
import { assertV14PreOutput } from "@/lib/content/v14ContentGate";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  mainKeyword: "모션베드 특별할인",
  industry: "가구/침대",
  blogLengthTier: "short",
};
const ctx = { brandName: "템퍼", region: "평택", topic: "모션베드 특별할인" };
const headings = buildBrandFocusedSectionHeadings(input, 6);
const body =
  "평택 템퍼 매장에서 모션베드 특별할인 관련 모델을 직접 비교해 보세요. 할인·행사·체험·설치·배송·A/S를 매장 안내 기준으로 확인하세요.";
let pack = {
  title: "평택 템퍼 모션베드 특별할인",
  sections: headings.map((h) => ({ heading: h, body })),
  conclusion: "평택 템퍼 매장 방문을 권합니다.",
};
pack = applyV14PostWritePack(pack, { ...ctx, input }, "blog");
const normalized = normalizeBlogLengthAndStructure(pack, ctx, input);
pack = normalized.pack;
const gate = assertV14PreOutput(pack, "blog", { ...ctx, input });
const badPlan =
  /(기능 설명: 실제 운영|브랜드 자산으로 남기는|콘텐츠는 문장 장식)/.test(
    [pack.title, ...(pack.sections || []).map((s) => s.heading + s.body)].join("\n")
  );
console.log("v14_ok", gate.ok, "reasons", gate.reasons, "bad_plan", badPlan);
if (badPlan) process.exit(1);
if (gate.reasons?.includes("outline_only_output")) process.exit(1);
if (gate.reasons?.includes("meta_philosophy_leak")) process.exit(1);
console.log("OK v14 gate (plan/meta clear)");
