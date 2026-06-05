/**
 * V14 — 업종별 정보 밀도 (필수 주제 포함 여부)
 */
export const INDUSTRY_DENSITY_REQUIREMENTS = {
  furniture: [
    { id: "product_line", patterns: [/제품|라인업|모델|모션|매트리스|프레임/] },
    { id: "compare", patterns: [/비교|체험|누워|지지|쿠션/] },
    { id: "promo", patterns: [/할인|행사|프로모|특별|혜택|증정/] },
    { id: "visit", patterns: [/방문|매장|예약|상담|체험/] },
    { id: "delivery", patterns: [/설치|배송|AS|교환/] },
  ],
  flower: [
    { id: "product", patterns: [/꽃|구성|다발|박스|시즌/] },
    { id: "price", patterns: [/가격|비용|예산/] },
    { id: "reserve", patterns: [/예약|주문|문의/] },
    { id: "delivery", patterns: [/배송|픽업|포장/] },
  ],
  hospital: [
    { id: "care", patterns: [/진료|검사|치료|상담/] },
    { id: "flow", patterns: [/접수|예약|방문|흐름/] },
    { id: "prep", patterns: [/준비|서류|주의|안내/] },
  ],
  saas: [
    { id: "problem", patterns: [/문제|병목|한계|어려움/] },
    { id: "feature", patterns: [/기능|도구|자동|생성/] },
    { id: "use", patterns: [/활용|적용|도입|사용/] },
    { id: "effect", patterns: [/효과|결과|개선|절감/] },
  ],
  default: [
    { id: "topic", patterns: [] },
    { id: "visit", patterns: [/방문|예약|문의|이용/] },
    { id: "benefit", patterns: [/혜택|할인|행사|안내/] },
  ],
};

export function resolveIndustryDensityKey(ctx = {}, input = {}) {
  const industry = String(
    input.industry || ctx.industryLabel || ctx.industryKey || ""
  ).toLowerCase();
  const topic = String(
    input.topic || input.mainKeyword || ctx.topic || ""
  ).toLowerCase();
  if (/가구|침대|매트리스|furniture|bed|모션베드|템퍼/.test(`${industry} ${topic}`)) {
    return "furniture";
  }
  if (/꽃|플라워|flower/.test(industry)) return "flower";
  if (/병원|의원|hospital|clinic/.test(industry)) return "hospital";
  if (/saas|ai|platform|플랫폼|마케팅/.test(industry)) return "saas";
  return "default";
}

/**
 * @param {string} full
 * @param {object} ctx
 */
export function scoreIndustryDensity(full, ctx = {}) {
  const input = ctx.input || ctx;
  const key = resolveIndustryDensityKey(ctx, input);
  const reqs = INDUSTRY_DENSITY_REQUIREMENTS[key] || INDUSTRY_DENSITY_REQUIREMENTS.default;
  const text = String(full || "");
  const topicTokens = String(input.topic || input.mainKeyword || ctx.topic || "")
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const hits = reqs.filter((r) => {
    if (r.id === "topic" && topicTokens.length) {
      return topicTokens.some((t) => text.includes(t));
    }
    return r.patterns.some((re) => re.test(text));
  });

  const minHits = key === "default" ? 2 : Math.min(4, Math.ceil(reqs.length * 0.55));
  return {
    ok: hits.length >= minHits,
    key,
    hits: hits.length,
    required: reqs.length,
    minHits,
    missing: reqs.filter((r) => !hits.includes(r)).map((r) => r.id),
  };
}

function furnitureDensityPad(ctx = {}, input = {}) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "프로모션").trim();
  return `${region ? `${region} ` : ""}${brand} 매장에서 ${topic} 관련 모델·매트리스·모션 기능을 비교해 보세요. 행사·할인·증정 조건, 설치·배송·A/S, 방문·예약 방법은 매장 안내 기준으로 최종 확인하시면 됩니다.`;
}

function flowerDensityPad(ctx = {}, input = {}) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  return `${brand} 상품 구성·가격대·시즌 추천·포장·배송·예약 방법을 문의 시 함께 안내받을 수 있습니다.`;
}

function hospitalDensityPad(ctx = {}, input = {}) {
  const brand = String(ctx.brandName || input.brandName || "").trim();
  return `${brand || "병원"} 진료·검사·예약·방문 전 준비·진료 흐름은 공식 안내를 기준으로 확인하세요. 개인 상태에 따라 달라질 수 있습니다.`;
}

function defaultDensityPad(ctx = {}, input = {}) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const topic = String(input.topic || input.mainKeyword || "안내").trim();
  return `${brand} ${topic} — 방문·예약·혜택·이용 방법을 확인 가능한 범위에서 정리했습니다.`;
}

const DENSITY_PAD_BUILDERS = {
  furniture: furnitureDensityPad,
  flower: flowerDensityPad,
  hospital: hospitalDensityPad,
  default: defaultDensityPad,
};

/** V14 — 동일 문단 반복 시 섹션별 다른 업종 패드 */
export function buildIndustryDensityPad(ctx = {}, input = {}, slot = 0) {
  const key = resolveIndustryDensityKey(ctx, input);
  const fn = DENSITY_PAD_BUILDERS[key] || defaultDensityPad;
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const base = fn(ctx, input);
  const extras = [
    `${region ? `${region} ` : ""}${brand} — ${topic} 체험·비교 시 지지감·각도·행사 조건을 함께 확인하세요.`,
    `구매 전 설치·배송 일정, 교환·A/S, 예산 범위를 정리해 두면 상담이 빨라집니다.`,
    `프로모션 기간에는 인기 모델 재고·체험 예약 가능 여부를 매장에 먼저 문의하세요.`,
  ];
  return slot > 0 ? extras[(slot - 1) % extras.length] : base;
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {string} channel
 */
export function injectIndustryDensity(pack, ctx = {}, channel = "blog") {
  if (!pack || channel === "image") return pack;
  const input = ctx.input || ctx;
  const full = [
    ...(pack.sections || []).map((s) => s.body),
    pack.conclusion,
    pack.detailBody,
    pack.body,
  ]
    .filter(Boolean)
    .join("\n");
  const score = scoreIndustryDensity(full, ctx);
  if (score.ok) return pack;

  const key = score.key;
  const pad =
    key === "furniture"
      ? furnitureDensityPad(ctx, input)
      : key === "flower"
        ? flowerDensityPad(ctx, input)
        : key === "hospital"
          ? hospitalDensityPad(ctx, input)
          : defaultDensityPad(ctx, input);

  if (channel === "place" && pack.detailBody) {
    return { ...pack, detailBody: `${pack.detailBody}\n\n${pad}`.trim() };
  }
  if (channel === "instagram" && (pack.body || pack.lineBreakBody)) {
    const field = pack.lineBreakBody ? "lineBreakBody" : "body";
    return { ...pack, [field]: `${pack[field]}\n\n${pad}`.trim() };
  }
  const sections = [...(pack.sections || [])];
  if (!sections.length) return pack;
  const idx = Math.min(sections.length - 1, 1);
  sections[idx] = {
    ...sections[idx],
    body: `${sections[idx].body || ""}\n\n${pad}`.trim(),
  };
  return { ...pack, sections };
}
