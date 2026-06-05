import { V3_CONTENT_STRATEGIES } from "@/lib/content/v3/constants";

/**
 * V3 5단계 — 콘텐츠 전략 수립
 */
export function resolveContentStrategyV3(input = {}, ctx = {}) {
  const topic = String(input.topic || "").trim();
  const purpose = input.purposeType || input.purpose || "";
  const topicL = topic.toLowerCase();

  let id = "brand";

  if (/출시|신제품|런칭|오픈|이벤트|행사|프로모/.test(topic)) {
    id = /뉴스|보도|속보/.test(topic) ? "news" : "event";
  } else if (/후기|체험|다녀|써봤|방문/.test(topic)) {
    id = "review";
  } else if (
    /비교|스펙|가이드|선택|알아보|궁금|소개|사야\s*할|고르는\s*법|종류|계절|여름|가을|봄|겨울|시즌/.test(
      topic
    )
  ) {
    id = "informational";
  } else if (
    input.region?.trim() &&
    (/파주|운정|지역|동네|근처|매장/.test(topic) ||
      purpose === "local" ||
      purpose === "visit")
  ) {
    id = "local";
  } else if (
    ctx.topicAnalysis?.productName &&
    /모델|시리즈|제품|침대|소파|매트리스|오피모/i.test(topic)
  ) {
    id = "product";
  } else if (purpose === "season" || purpose === "trend") {
    id = "brand";
  }

  const strategy = V3_CONTENT_STRATEGIES.find((s) => s.id === id) || V3_CONTENT_STRATEGIES[0];

  return {
    id: strategy.id,
    label: strategy.label,
    hint: strategy.hint,
    writingOrder: [
      "브랜드 맥락(포지션·특징)",
      "지역 검색·방문 맥락",
      "주제·제품 팩트(조사 항목만)",
      "조사 확정 항목 인용",
      "브랜드 메모리·톤",
      "SEO 키워드 자연 배치",
      "본문 작성",
    ],
  };
}

export function formatStrategyBrief(strategy) {
  return [
    "【V3 · 5. 콘텐츠 전략】",
    `유형: ${strategy.label} — ${strategy.hint}`,
    `작성 순서: ${strategy.writingOrder.join(" → ")}`,
    "브랜드·지역·주제 없이 바로 본문부터 쓰지 말 것.",
  ].join("\n");
}
