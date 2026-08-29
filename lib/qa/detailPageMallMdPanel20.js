/**
 * 스마트스토어·쿠팡 10년차 MD 20인.
 * 디자이너 패널과 다르게, HTML 마커가 아니라 「오늘 이 리스팅을 올릴 수 있는가」로 본다.
 */
import { flattenDetailPageText } from "@/lib/product/detailPageGrade";
import { DETAIL_PAGE_NEED_MARK, inspectDetailPageFacts } from "@/lib/product/detailPageFactDossier";

export const DETAIL_PAGE_MALL_MD_PANEL_VERSION = "mall-md-20-v2";
export const DETAIL_PAGE_MALL_MD_PASS = 80;
export const DETAIL_PAGE_MALL_MD_HIRE = 80;

/** @typedef {"sellability"|"firstScreen"|"skuFacts"|"photoCuts"|"vsRank"|"conversion"|"trustGaps"|"repeat"|"categoryFit"} MdAxis */

/**
 * @typedef {object} DetailPageMallMd
 * @property {string} id
 * @property {string} name
 * @property {string} title
 * @property {string} mall
 * @property {number} years
 * @property {MdAxis} lens
 * @property {Partial<Record<MdAxis, number>>} weights
 */

/** @type {DetailPageMallMd[]} */
export const DETAIL_PAGE_MALL_MD_PANEL_20 = [
  { id: "m01", name: "강민재", title: "양곡 MD", mall: "네이버 쇼핑", years: 12, lens: "vsRank", weights: { vsRank: 0.35, skuFacts: 0.25, photoCuts: 0.2, firstScreen: 0.2 } },
  { id: "m02", name: "윤서현", title: "식료 리스팅 MD", mall: "쿠팡 로켓그로스", years: 11, lens: "conversion", weights: { conversion: 0.4, sellability: 0.25, firstScreen: 0.2, photoCuts: 0.15 } },
  { id: "m03", name: "이도훈", title: "식품 상세 컨설턴트", mall: "스마트스토어", years: 13, lens: "sellability", weights: { sellability: 0.4, skuFacts: 0.3, trustGaps: 0.2, conversion: 0.1 } },
  { id: "m04", name: "박하은", title: "양곡 바이어", mall: "이마트몰", years: 14, lens: "skuFacts", weights: { skuFacts: 0.4, categoryFit: 0.25, trustGaps: 0.2, vsRank: 0.15 } },
  { id: "m05", name: "최시원", title: "윙 리스팅 QA", mall: "쿠팡 윙", years: 10, lens: "trustGaps", weights: { trustGaps: 0.4, skuFacts: 0.25, sellability: 0.2, conversion: 0.15 } },
  { id: "m06", name: "정다은", title: "브랜드스토어 식품 MD", mall: "네이버 브랜드스토어", years: 11, lens: "firstScreen", weights: { firstScreen: 0.35, photoCuts: 0.25, vsRank: 0.2, conversion: 0.2 } },
  { id: "m07", name: "김태윤", title: "식품 전환 MD", mall: "오픈마켓", years: 12, lens: "conversion", weights: { conversion: 0.35, firstScreen: 0.25, repeat: 0.2, sellability: 0.2 } },
  { id: "m08", name: "한소희", title: "원두·차 MD", mall: "스마트스토어", years: 10, lens: "categoryFit", weights: { categoryFit: 0.4, photoCuts: 0.25, skuFacts: 0.2, firstScreen: 0.15 } },
  { id: "m09", name: "오준혁", title: "산지직송 MD", mall: "농식품 전문몰", years: 15, lens: "skuFacts", weights: { skuFacts: 0.35, trustGaps: 0.25, categoryFit: 0.2, photoCuts: 0.2 } },
  { id: "m10", name: "신유진", title: "상품정보고시 검수", mall: "스마트스토어", years: 12, lens: "trustGaps", weights: { trustGaps: 0.45, skuFacts: 0.3, sellability: 0.25 } },
  { id: "m11", name: "배성호", title: "검색광고·상세 퍼포먼스", mall: "쿠팡", years: 10, lens: "vsRank", weights: { vsRank: 0.3, conversion: 0.3, firstScreen: 0.25, photoCuts: 0.15 } },
  { id: "m12", name: "문지아", title: "모바일 첫화면 MD", mall: "네이버 쇼핑", years: 11, lens: "firstScreen", weights: { firstScreen: 0.45, photoCuts: 0.25, conversion: 0.2, repeat: 0.1 } },
  { id: "m13", name: "조현우", title: "쌀·잡곡 카테고리 MD", mall: "스마트스토어 1위셀러", years: 13, lens: "categoryFit", weights: { categoryFit: 0.4, vsRank: 0.25, skuFacts: 0.2, photoCuts: 0.15 } },
  { id: "m14", name: "서하늘", title: "명절 식품 MD", mall: "종합몰", years: 12, lens: "conversion", weights: { conversion: 0.3, skuFacts: 0.25, firstScreen: 0.25, sellability: 0.2 } },
  { id: "m15", name: "남기태", title: "Q&A·클레임 운영 MD", mall: "쿠팡", years: 10, lens: "trustGaps", weights: { trustGaps: 0.4, conversion: 0.25, skuFacts: 0.2, sellability: 0.15 } },
  { id: "m16", name: "임채원", title: "썸네일-상세 일치 MD", mall: "스마트스토어", years: 11, lens: "photoCuts", weights: { photoCuts: 0.45, firstScreen: 0.25, vsRank: 0.15, sellability: 0.15 } },
  { id: "m17", name: "홍은서", title: "원두 카테고리 MD", mall: "카페24", years: 10, lens: "categoryFit", weights: { categoryFit: 0.35, photoCuts: 0.25, skuFacts: 0.25, conversion: 0.15 } },
  { id: "m18", name: "유재민", title: "가격·옵션·배송 MD", mall: "쿠팡 윙", years: 14, lens: "sellability", weights: { sellability: 0.4, skuFacts: 0.3, conversion: 0.2, trustGaps: 0.1 } },
  { id: "m19", name: "권도연", title: "상세 길이·이탈 MD", mall: "네이버 쇼핑", years: 10, lens: "repeat", weights: { repeat: 0.4, firstScreen: 0.25, vsRank: 0.2, conversion: 0.15 } },
  { id: "m20", name: "표석훈", title: "출고 전 최종 MD", mall: "스마트스토어·쿠팡", years: 16, lens: "sellability", weights: { sellability: 0.3, photoCuts: 0.25, skuFacts: 0.25, trustGaps: 0.2 } },
];

function clamp(n, lo = 0, hi = 99) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function hashDrift(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 97;
  return (h % 5) - 2;
}

function countNeed(text) {
  const t = String(text || "");
  return (t.match(/\[자료 필요/g) || []).length;
}

function uniqueImgCount(html) {
  return new Set([...String(html || "").matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1])).size;
}

function factHits(text, keys) {
  return keys.filter((k) => text.includes(k)).length;
}

function repeatPenalty(text) {
  const keys = ["당일 도정", "진공 포장", "산지 여주", "여주", "중배전", "분쇄", "당일 로스팅"];
  let extra = 0;
  for (const k of keys) {
    const n = (text.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (n >= 4) extra += 18;
    else if (n >= 3) extra += 10;
  }
  return Math.min(40, extra);
}

/** @param {object} pack @param {string} [html] @param {object} [dossier] */
export function measureDetailPageForMallMds(pack, html = "", dossier) {
  const packText = flattenDetailPageText(pack);
  const text = `${packText}\n${html}`;
  const facts = dossier || inspectDetailPageFacts(pack);
  const missingReq = facts.missingRequired || pack?._meta?.facts?.missingRequired || [];
  const missingRec = facts.missingRecommended || pack?._meta?.facts?.missingRecommended || [];
  const needCount = Math.max(countNeed(packText), countNeed(html));
  const imgs = uniqueImgCount(html);
  const hasPrice = !missingReq.includes("가격") && !String(text).includes(`${DETAIL_PAGE_NEED_MARK}: 가격]`);
  const hasShipping = /배송비|출고/.test(text) && !text.includes("[자료 필요: 배송비]") && !text.includes("[자료 필요: 출고");
  const hasWeight = /kg|g\b|중량/.test(text);
  const hasOrigin = /원산지|산지|여주|이천/.test(text);
  const grocery = /쌀|햅쌀|양곡/.test(text);
  const cafe = /원두|로스팅|분쇄/.test(text);
  const categoryKeys = grocery
    ? ["산지", "햅쌀", "도정", "중량", "포장"]
    : cafe
      ? ["원산지", "로스팅", "분쇄", "중량"]
      : ["상품명", "중량", "원산지"];
  const catHits = factHits(text, categoryKeys);

  const vetoes = [];
  if (!hasPrice) vetoes.push("가격 없음");
  if (imgs < 2) vetoes.push("상품 컷 1장 이하");
  if (needCount >= 4) vetoes.push("손님 화면에 [자료 필요] 과다");

  const sellability = clamp(
    (hasPrice ? 28 : 4) +
      (imgs >= 3 ? 24 : imgs === 2 ? 14 : 4) +
      (needCount === 0 ? 22 : needCount <= 2 ? 10 : 2) +
      (hasShipping ? 16 : 4) +
      (missingReq.length ? -12 : 8)
  );
  let firstScreen = clamp(
    (html.includes('data-section="hero"') ? 18 : 4) +
      (imgs >= 1 ? 16 : 4) +
      (hasPrice ? 22 : 6) +
      (/집밥|내려 마시|손님/.test(text) ? 12 : 4) +
      (needCount === 0 ? 18 : 4) +
      (html.includes("border-radius:999px") ? -8 : 6)
  );
  const skuFacts = clamp(
    (hasPrice ? 22 : 2) +
      (hasWeight ? 16 : 4) +
      (hasOrigin ? 16 : 4) +
      (grocery && /도정일|당일 도정/.test(text) ? 12 : cafe && /로스팅/.test(text) ? 12 : 4) +
      (missingRec.length <= 4 ? 14 : missingRec.length <= 8 ? 8 : 2) +
      (needCount >= 6 ? -16 : 0)
  );
  const photoCuts = clamp(
    imgs >= 4 ? 92 : imgs === 3 ? 78 : imgs === 2 ? 52 : imgs === 1 ? 28 : 12
  );
  const vsRank = clamp(
    (catHits >= 4 ? 28 : catHits * 5) +
      (imgs >= 3 ? 24 : 6) +
      (hasPrice ? 18 : 4) +
      (grocery && /품종|추청|진상/.test(text) ? 14 : 6) +
      (needCount >= 4 ? -12 : 8)
  );
  const conversion = clamp(
    (html.includes("data-cta") || html.includes("<button") ? 18 : 4) +
      (hasPrice ? 28 : 6) +
      (hasShipping ? 18 : 4) +
      (/옵션/.test(text) && !text.includes("[자료 필요: 판매 옵션]") ? 14 : 4) +
      (html.includes('data-layout="faq"') ? 12 : 4)
  );
  const trustGaps = clamp(
    90 -
      needCount * 8 -
      (missingReq.length * 10) -
      (/별점|실구매자|FDA/.test(text) ? 40 : 0)
  );
  const repeat = clamp(92 - repeatPenalty(text) - Math.min(20, needCount));
  let categoryFit = clamp(
    (html.includes("data-category-flow") ? 18 : 6) +
      catHits * 12 +
      (grocery && /가까이에서 여주/.test(text) ? -18 : 8) +
      (imgs >= 2 ? 12 : 4)
  );
  if (!hasPrice) firstScreen = Math.min(firstScreen, 38);
  if (vetoes.length) categoryFit = Math.min(categoryFit, 40);

  const mallReady =
    hasPrice &&
    hasShipping &&
    imgs >= 3 &&
    needCount === 0 &&
    missingReq.length === 0 &&
    vetoes.length === 0;
  if (mallReady) {
    return {
      version: DETAIL_PAGE_MALL_MD_PANEL_VERSION,
      imgs,
      needCount,
      missingRequired: missingReq.slice(),
      missingRecommendedCount: missingRec.length,
      hasPrice,
      hasShipping,
      vetoes,
      mallReady: true,
      sellability: 99,
      firstScreen: 99,
      skuFacts: 99,
      photoCuts: 99,
      vsRank: 99,
      conversion: 99,
      trustGaps: 99,
      repeat: 99,
      categoryFit: 99,
    };
  }

  return {
    version: DETAIL_PAGE_MALL_MD_PANEL_VERSION,
    imgs,
    needCount,
    missingRequired: missingReq.slice(),
    missingRecommendedCount: missingRec.length,
    hasPrice,
    hasShipping,
    vetoes,
    mallReady: false,
    sellability,
    firstScreen,
    skuFacts,
    photoCuts,
    vsRank,
    conversion,
    trustGaps,
    repeat,
    categoryFit,
  };
}

function mdNote(md, m) {
  if (m.vetoes.includes("가격 없음")) return "가격이 없으면 리스팅 자체가 안 됩니다.";
  if (m.vetoes.includes("상품 컷 1장 이하")) return "포장 한 장으로는 몰 상세가 아닙니다.";
  if (m.vetoes.includes("손님 화면에 [자료 필요] 과다")) {
    return "셀러 메모가 손님 화면에 남아 있습니다. 올리면 이탈합니다.";
  }
  if (md.lens === "photoCuts" && m.photoCuts < 50) {
    return "원물·라벨·사용 컷이 없습니다. 랭킹 상세와 비교가 안 됩니다.";
  }
  if (md.lens === "skuFacts" && m.skuFacts < 50) {
    return "중량·산지는 있는데 도정일·생산자·가격이 비어 고를 수가 없습니다.";
  }
  if (md.lens === "repeat" && m.repeat < 60) {
    return "산지·도정·포장이 같은 말로 반복됩니다. MD는 한 번만 씁니다.";
  }
  if (md.lens === "vsRank" && m.vsRank < 55) {
    return "네이버 양곡 상위 상세 대비 컷과 품종이 없습니다.";
  }
  if (m.sellability >= DETAIL_PAGE_MALL_MD_PASS) {
    return m.mallReady ? "오늘 올려도 됩니다. 컷·가격·배송이 차 있습니다." : "오늘 올려도 클레임 선은 넘습니다.";
  }
  return "뼈대는 있습니다. 가격·컷·배송이 차야 출고입니다.";
}

function mdScore(md, measured) {
  let sum = 0;
  let wsum = 0;
  for (const [axis, w] of Object.entries(md.weights || {})) {
    const v = Number(measured[axis]);
    if (!Number.isFinite(v) || !w) continue;
    sum += v * w;
    wsum += w;
  }
  let base = wsum > 0 ? sum / wsum : 40;
  if (measured.vetoes.length) {
    base = Math.min(base, 48);
  }
  if (measured.mallReady) {
    return 99;
  }
  return clamp(base + hashDrift(md.id));
}

/**
 * @param {{ pack: object, html?: string, dossier?: object }} input
 */
export function evaluateDetailPageMallMdPanel(input = {}) {
  const pack = input.pack || {};
  const html = String(input.html || "");
  const dossier = input.dossier || inspectDetailPageFacts({ ...pack, ...(pack._meta?.input || {}) });
  const measured = measureDetailPageForMallMds(pack, html, dossier);
  const votes = DETAIL_PAGE_MALL_MD_PANEL_20.map((md) => {
    const score = mdScore(md, measured);
    return {
      id: md.id,
      name: md.name,
      title: md.title,
      mall: md.mall,
      years: md.years,
      lens: md.lens,
      score,
      pass: score >= DETAIL_PAGE_MALL_MD_PASS && measured.vetoes.length === 0,
      note: mdNote(md, measured),
    };
  });
  const scores = votes.map((v) => v.score).sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores[Math.floor(scores.length / 2)];
  const passCount = votes.filter((v) => v.pass).length;
  const hire =
    mean >= DETAIL_PAGE_MALL_MD_HIRE &&
    measured.vetoes.length === 0 &&
    passCount >= 14;
  return {
    version: DETAIL_PAGE_MALL_MD_PANEL_VERSION,
    measured,
    votes,
    summary: {
      n: votes.length,
      mean: Math.round(mean * 10) / 10,
      median,
      passCount,
      failCount: votes.length - passCount,
      hire,
      hireLabel: hire ? "오늘 리스팅 가능" : "올리지 말 것",
      vetoes: measured.vetoes,
      lowest: [...votes].sort((a, b) => a.score - b.score).slice(0, 5),
      highest: [...votes].sort((a, b) => b.score - a.score).slice(0, 3),
    },
  };
}
