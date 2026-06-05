import { resolveBlogLengthTier } from "@/lib/constants";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";

const inputBase = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
};

function makeStarterPack(input, sectionCount = 3) {
  const headings = buildBrandFocusedSectionHeadings(input, sectionCount);
  const bodies = [
    "평택 템퍼 매장에서 모션베드 라인업을 직접 누워 보고 체압을 비교해 보세요. 헤드 각도와 프레임 높이를 단계별로 조절해 보는 것이 좋습니다. 할인·체험 일정은 방문 전에 전화로 먼저 확인하세요. 같은 브랜드라도 라인업마다 느낌이 달라서 짧게라도 여러 모델을 누워 보는 편이 낫습니다.",
    "프레임 높이와 헤드 각도는 사용 패턴에 따라 달라집니다. 매장에서 모션 기능을 단계별로 시연해 보세요. 상담사에게 평소 수면 자세를 말해 두면 추천이 수월합니다. 리모컨 버튼 위치와 소음도 함께 확인해 두세요.",
    "설치·배송·A/S 범위는 모델마다 다릅니다. 계약 전 견적서에 포함 항목을 적어 두세요. 엘리베이터 폭과 사다리 필요 여부도 함께 확인하세요. 설치 당일 시간대를 미리 잡아 두면 대기가 줄어듭니다.",
    "매장 방문 전 예약하면 대기 없이 체험할 수 있습니다. 주차·영업 시간도 함께 확인하세요. 혼잡한 주말은 평일 오전이 비교하기 편합니다. 동행 인원이 있으면 예약 메모에 적어 두세요.",
    "프로모션 기간에는 재고가 빠르게 소진될 수 있습니다. 원하는 사이즈를 미리 메모해 가세요. 체험 매트리스와 주문 제품이 다를 수 있으니 모델명을 적어 두세요. 행사 조건은 현장 안내와 홈페이지를 함께 대조하세요.",
    "체험 후에는 수면 자세와 루틴을 짧게 공유하면 상담이 수월합니다. 무리한 구매는 피하세요. 집에서 일주일 써 본 뒤 결정해도 늦지 않습니다. 불편한 부분은 메모해 두었다가 재방문 때 질문하세요.",
  ];
  return {
    title: "평택 템퍼 모션베드 특별할인",
    sections: headings.map((h, i) => ({
      heading: h,
      body: bodies[i % bodies.length],
    })),
    conclusion: "평택 템퍼 매장 방문을 권합니다. 체험 후에만 결정하세요.",
  };
}

function runTier(tierKey, starterSections = 3) {
  const tier = resolveBlogLengthTier(tierKey);
  const input = { ...inputBase, blogLengthTier: tierKey };
  const ctx = { ...inputBase };
  let pack = makeStarterPack(input, starterSections);
  pack = applyV17PostWritePack(pack, { ...ctx, input }, "blog");
  const norm = normalizeBlogLengthAndStructure(pack, ctx, input);
  pack = norm.pack;
  const gate = assertBlogLengthTier(input, pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  return {
    tierKey,
    promised: `${tier.min}~${tier.max}`,
    chars,
    sections: pack.sections?.length,
    gateOk: gate.ok,
    gateReasons: gate.reasons,
    inBand: chars >= tier.min && chars <= tier.max,
    under: chars < tier.min ? tier.min - chars : 0,
    over: chars > tier.max ? chars - tier.max : 0,
  };
}

console.log("\n=== BRICLOG 글분량 tier 실측 (공백 포함) ===\n");
console.log("시나리오 A: 초안 3섹션 (짧은 LLM 초안 가정)\n");
for (const t of ["short", "medium", "long"]) {
  const r = runTier(t, 3);
  console.log(
    `${r.tierKey.padEnd(6)} | 약속 ${r.promised} | 실측 ${r.chars} | 섹션 ${r.sections} | band=${r.inBand} | gate=${r.gateOk}${r.under ? ` | 부족 ${r.under}` : ""}${r.over ? ` | 초과 ${r.over}` : ""}`
  );
}

console.log("\n시나리오 B: 초안 6섹션 (중간 LLM 초안 가정)\n");
for (const t of ["short", "medium", "long"]) {
  const r = runTier(t, 6);
  console.log(
    `${r.tierKey.padEnd(6)} | 약속 ${r.promised} | 실측 ${r.chars} | 섹션 ${r.sections} | band=${r.inBand} | gate=${r.gateOk}${r.under ? ` | 부족 ${r.under}` : ""}${r.over ? ` | 초과 ${r.over}` : ""}`
  );
}

const allOk = ["short", "medium", "long"].every((t) => {
  const r = runTier(t, 6);
  return r.inBand;
});
if (!allOk) {
  console.log("\n⚠ 일부 tier가 약속 구간 밖입니다.");
  process.exit(1);
}
console.log("\nOK all tiers in band (scenario B)");
