/**
 * V14 — 지역 정보 밀도 (SEO 키워드 도배가 아닌 생활권·방문 맥락)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
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

function regionContextPad(ctx = {}, input = {}, opts = {}) {
  const region = String(ctx.region || input.region || "").trim();
  const brand = String(ctx.brandName || input.brandName || "매장").trim();
  const facet = String(
    input.topicFacet ||
      input.mainKeyword?.split(/[,，]/)[0]?.trim() ||
      input.topic?.split(/[,，]/)[0]?.trim() ||
      "이용"
  ).trim();
  const { key, flavor } = getIndustryFlavorForInput(input);
  const space = flavor.spaceWord || "매장";
  const regionRef = opts.softRegion ? "이 지역" : region;
  const regionTail = opts.softRegion ? "일대" : `${region} 일대`;

  if (key === "education") {
    return `${regionRef} 생활권에서 ${brand}까지 등원·상담 동선·주차를 미리 확인하면 ${facet}·반 편성 상담이 수월합니다. ${regionTail} 학부모·학생 흐름을 고려해 등록 가능 여부도 함께 문의해 보세요.`;
  }
  if (key === "craft") {
    return `${regionRef} 생활권에서 ${brand} ${space}까지 방문 동선·주차·영업 시간을 미리 확인하면 ${facet} 예약·체험이 수월합니다. ${regionTail} 방문객 흐름을 고려해 클래스 잔여석도 함께 문의해 보세요.`;
  }
  if (key === "salon") {
    return `${regionRef} 생활권에서 ${brand} ${space}까지 방문 동선·주차·영업 시간을 미리 확인하면 ${facet} 상담·시술 예약이 수월합니다. ${regionTail} 방문 고객 흐름을 고려해 예약 가능 여부도 함께 문의해 보세요.`;
  }
  return `${regionRef} 생활권에서 ${brand}까지 방문 동선·주차·영업 시간을 미리 확인하면 ${facet} 상담·체험이 수월합니다. ${regionTail} 방문 고객 흐름을 고려해 예약 가능 여부도 함께 문의해 보세요.`;
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

const REGION_CONTEXT_BUCKET_RES = [
  /생활권|상권|인근\s*상권/,
  /방문\s*동선|이동\s*동선|주차|접근성/,
  /방문\s*이유|방문\s*목적|체험\s*목적/,
];

/** reset·coreQuality region_density — 지역명·생활권 버킷 동시 보강 */
export function ensureRegionNamePreserved(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  const region = String(input.region || "").trim();
  if (!region || region.length < 2) return pack;
  let next = pack;
  const full = getBlogFullText(next);
  const re = new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  let nameCount = (full.match(re) || []).length;
  const bucketHits = REGION_CONTEXT_BUCKET_RES.filter((r) => r.test(full)).length;

  if (nameCount < 1 || bucketHits < 1) {
    next = ensureRegionContextBuckets(next, input);
    const after = getBlogFullText(next);
    nameCount = (after.match(re) || []).length;
  }

  if (nameCount >= 1) return next;

  const brand = String(input.brandName || "매장").trim();
  const sections = [...(next.sections || [])];
  const firstBody = String(sections[0]?.body || "").trim();
  const lead = `${region} ${brand}`.replace(/\s+/g, " ").trim();
  sections[0] = {
    ...sections[0],
    body: firstBody.startsWith(region) ? firstBody : `${lead} — ${firstBody}`.replace(/\s+/g, " ").trim(),
  };
  return { ...next, sections };
}

/** coreQuality region_density_low — 생활권·방문 맥락 버킷 보강 */
export function ensureRegionContextBuckets(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  const region = String(input.region || "").trim();
  if (!region || region.length < 2) return pack;
  const full = getBlogFullText(pack);
  const bucketHits = REGION_CONTEXT_BUCKET_RES.filter((re) => re.test(full)).length;
  const nameCount = (full.match(new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [])
    .length;
  if (bucketHits >= 1 && nameCount >= 1) return pack;

  const pad = regionContextPad(
    { region, brandName: input.brandName, input },
    input,
    { softRegion: nameCount >= 2 }
  ).split("\n\n")[0];
  const sections = [...pack.sections];
  sections[0] = {
    ...sections[0],
    body: `${sections[0].body || ""}\n\n${pad}`.trim(),
  };
  return { ...pack, sections };
}
