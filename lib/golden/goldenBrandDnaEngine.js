/**
 * Golden Dataset — 브랜드 DNA 반영도
 */
function researchProductTokens(input = {}) {
  const out = [];
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (topic.length >= 4) out.push(topic);
  for (const raw of input.researchFacts || []) {
    const s = String(raw?.fact ?? raw ?? "").trim();
    if (!s) continue;
    for (const part of s.split(/[,，·/]/)) {
      const t = part.trim();
      if (t.length >= 2 && t.length <= 28) out.push(t);
    }
  }
  return [...new Set(out)];
}

export function extractBrandDnaFields(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const slogan = String(input.slogan || input.brandSlogan || "").trim();
  const products = [
    input.mainKeyword,
    input.subKeyword,
    input.product,
    input.service,
    ...(String(input.storeFeatures || "").split(/[,，·]/).map((s) => s.trim())),
    ...researchProductTokens(input),
  ].filter(Boolean);

  const ops = [];
  const blob = `${input.brandDescription || ""} ${input.storeFeatures || ""} ${(input.researchFacts || []).map((f) => f.fact || f).join(" ")}`;
  if (/24\s*시간|무인|셀프/i.test(blob)) ops.push("24시간·무인");
  if (/예약|픽업|배송/i.test(blob)) ops.push("예약·픽업·배송");
  if (/상담|문의/i.test(blob)) ops.push("상담·문의");

  const diff = String(input.brandDifferentiator || input.differentiator || "").trim();

  return { brand, region, slogan, products, ops, diff, blob };
}

/**
 * @param {string} full
 * @param {object} input
 */
export function scoreGoldenBrandDna(full = "", input = {}) {
  const text = String(full || "");
  const dna = extractBrandDnaFields(input);
  let score = 0;
  const found = [];

  if (dna.brand && text.includes(dna.brand.slice(0, Math.min(4, dna.brand.length)))) {
    score += 28;
    found.push("brand");
  }
  if (dna.region && text.includes(dna.region.split(" ")[0] || dna.region)) {
    score += 22;
    found.push("region");
  }
  if (dna.slogan && dna.slogan.length >= 4 && text.includes(dna.slogan.slice(0, 6))) {
    score += 12;
    found.push("slogan");
  }
  const productHit = dna.products.filter((p) => p.length >= 2 && text.includes(p.slice(0, Math.min(8, p.length))));
  if (productHit.length) {
    score += Math.min(20, productHit.length * 8);
    found.push("product");
  }
  if (dna.ops.some((o) => text.includes(o.split("·")[0]))) {
    score += 10;
    found.push("ops");
  }
  if (dna.diff && text.includes(dna.diff.slice(0, Math.min(10, dna.diff.length)))) {
    score += 8;
    found.push("diff");
  }

  const capped = Math.min(100, score);
  return {
    score: capped,
    ok: found.length >= 2,
    found,
    dna,
  };
}
