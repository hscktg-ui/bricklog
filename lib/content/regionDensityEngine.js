/**
 * V14 — 지역 정보 밀도 (SEO 키워드 도배가 아닌 생활권·방문 맥락)
 */
const REGION_CONTEXT_SUFFIXES = [
  "생활권",
  "방문",
  "동선",
  "상권",
  "근처",
  "일대",
  "매장",
  "고객",
];

export function scoreRegionDensity(full, ctx = {}) {
  const region = String(ctx.region || ctx.input?.region || "").trim();
  if (!region || region.length < 2) {
    return { ok: true, skipped: true, region: "" };
  }

  const text = String(full || "");
  const nameCount = (text.match(new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const hasContext = REGION_CONTEXT_SUFFIXES.some((s) =>
    text.includes(`${region} ${s}`) || text.includes(`${region}${s}`) || text.includes(`${region}에서`)
  );

  /** 칼럼 톤 SSOT — 1~3회면 지역 반영 OK · 0회 또는 4회+는 실패 */
  const ok = nameCount >= 1 && nameCount <= 3;

  return {
    ok,
    region,
    nameCount,
    hasContext,
    minNames: 1,
    maxNames: 3,
    tooSparse: nameCount < 1,
    tooDense: nameCount > 3,
  };
}

function regionContextPad(ctx = {}, input = {}) {
  const region = String(ctx.region || input.region || "").trim();
  const brand = String(ctx.brandName || input.brandName || "매장").trim();
  const topic = String(input.topic || input.mainKeyword || "이용").trim();
  return `${region} 생활권에서 ${brand}까지 방문 동선·주차·영업 시간을 미리 확인하면 ${topic} 상담·체험이 수월합니다. ${region} 일대 방문 고객 흐름을 고려해 예약 가능 여부도 함께 문의해 보세요.`;
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {string} channel
 */
export function enrichRegionDensity(pack, ctx = {}, channel = "blog") {
  if (!pack || channel === "image") return pack;
  if (
    pack?._meta?.missionProseFallback ||
    pack?._meta?.forcedMissionProseRoute ||
    pack?._meta?.missionCatalogDelivery
  ) {
    return pack;
  }
  const input = ctx.input || ctx;
  const full = [
    pack.title,
    ...(pack.sections || []).map((s) => `${s.heading}\n${s.body}`),
    pack.conclusion,
    pack.detailBody,
    pack.shortNotice,
    pack.body,
  ]
    .filter(Boolean)
    .join("\n");

  const score = scoreRegionDensity(full, ctx);
  if (score.ok || score.skipped) return pack;

  const pad = regionContextPad(ctx, input);
  if (channel === "place") {
    return {
      ...pack,
      detailBody: `${pack.detailBody || ""}\n\n${pad}`.trim(),
    };
  }
  if (channel === "instagram") {
    const field = pack.lineBreakBody ? "lineBreakBody" : "body";
    return { ...pack, [field]: `${pack[field] || ""}\n\n${pad}`.trim() };
  }
  const sections = [...(pack.sections || [])];
  if (!sections.length) {
    return {
      ...pack,
      conclusion: `${pack.conclusion || ""}\n\n${pad}`.trim(),
    };
  }
  sections[0] = {
    ...sections[0],
    body: `${sections[0].body || ""}\n\n${pad}`.trim(),
  };
  return { ...pack, sections };
}
