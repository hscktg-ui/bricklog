/**
 * BRICLOG CLUE DISCOVERY ENGINE
 * 검색 결과가 적어도 입력·첨부·메타에서 실마리를 찾고, 엔티티 변형으로 조사를 확장한다.
 * 생성 중단·「다시 입력」·내부 수치 노출 금지. 미확인 스펙 단정 금지.
 */
import { sanitizeText, parsePhraseList } from "@/utils/sanitizeInput";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";

export const CLUE_DISCOVERY_WRITING_RULES = `【CLUE DISCOVERY · 작성 규칙】
- 사용자 입력은 정답이 아니라 단서다. 확인된 사실만 단정한다.
- 직접 정보가 있으면 활용, 없으면 단서·브랜드·지역·업종·검색 의도로 전개.
- 단서로 추론한 카테고리·제품군은 「~로 보인다」「~맥락」으로 쓰고 스펙·가격·성능은 단정하지 않는다.
- 정보 부족·조사 부족·다시 시도·다시 입력으로 작성을 거부하지 않는다.`;

const INPUT_TEXT_KEYS = [
  "brandName",
  "region",
  "topic",
  "mainKeyword",
  "subKeyword",
  "subKeywords",
  "productName",
  "v2ProductName",
  "industry",
  "industryText",
  "brandDescription",
  "storeFeatures",
  "benefit",
  "purpose",
  "purposeType",
  "includePhrases",
  "includeText",
  "include",
  "excludePhrases",
  "excludeText",
  "exclude",
  "memo",
  "memoText",
  "note",
  "notes",
  "additionalText",
  "extraText",
  "userNotes",
  "body",
  "draftBody",
  "pastedText",
  "sourceText",
  "channelSourceBrief",
  "researchBrief",
  "v2AxisBrief",
  "canonicalBrief",
  "contentThesis",
  "writingSubject",
  "baseContentLabel",
  "url",
  "sourceUrl",
  "link",
  "referenceUrl",
  "fileName",
  "filename",
  "imageName",
  "attachmentName",
  "attachmentText",
  "attachmentsText",
];

const CATEGORY_HINTS = [
  {
    pattern: /침대|매트리스|수면|bed|mattress|sleep|opimo|오피모|프레임|frame/i,
    category: "침대·수면",
    productFamily: "침대·매트리스·프레임",
    lineupHint: "수면 솔루션·침실 라인업",
    searchTerms: ["침대", "매트리스", "프레임", "수면"],
  },
  {
    pattern: /카페|coffee|원두|디저트/i,
    category: "카페·F&B",
    productFamily: "음료·공간",
    lineupHint: "메뉴·매장 경험",
    searchTerms: ["카페", "메뉴"],
  },
  {
    pattern: /꽃|플라워|flower|bouquet/i,
    category: "플라워",
    productFamily: "꽃·선물",
    lineupHint: "시즌·연출",
    searchTerms: ["꽃집", "꽃다발"],
  },
];

const ROMAN_MAP = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
};

function pushUnique(arr, value) {
  const v = String(value || "").trim();
  if (!v || v.length < 2) return;
  if (!arr.some((x) => x.toLowerCase() === v.toLowerCase())) arr.push(v);
}

function collectScalarTexts(input = {}) {
  const chunks = [];
  for (const key of INPUT_TEXT_KEYS) {
    const raw = input[key];
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (typeof item === "string") chunks.push(item);
        else if (item && typeof item === "object") {
          chunks.push(
            item.text,
            item.name,
            item.title,
            item.filename,
            item.fileName,
            item.url,
            item.content
          );
        }
      });
    } else if (typeof raw === "object") {
      chunks.push(JSON.stringify(raw).slice(0, 2000));
    } else {
      chunks.push(String(raw));
    }
  }
  for (const list of [
    parsePhraseList(input.includePhrases || input.include),
    parsePhraseList(input.subKeyword || input.subKeywords),
    parsePhraseList(input.excludePhrases || input.exclude),
    buildRegionKeywordHints(input),
  ]) {
    list.forEach((t) => chunks.push(t));
  }
  if (input.brandMemory && typeof input.brandMemory === "object") {
    chunks.push(
      input.brandMemory.brandName,
      input.brandMemory.region,
      input.brandMemory.industry,
      input.brandMemory.summary
    );
  }
  if (Array.isArray(input.attachments)) {
    for (const a of input.attachments) {
      chunks.push(
        a?.name,
        a?.fileName,
        a?.filename,
        a?.text,
        a?.extractedText,
        a?.url
      );
    }
  }
  return chunks.map((c) => sanitizeText(c)).filter(Boolean);
}

/** 주제·제품 토큰의 표기 변형 (오피모3 → OPIMO III 등) */
export function expandEntityVariants(token, ctx = {}) {
  const raw = String(token || "").trim();
  if (!raw || raw.length < 2) return [];

  const variants = [raw];
  const compact = raw.replace(/\s+/g, "");
  pushUnique(variants, compact);

  const latin = compact.replace(/[^A-Za-z0-9가-힣]/g, "");
  const hangul = latin.replace(/[A-Za-z0-9]/g, "");
  const alnum = latin.replace(/[^A-Za-z0-9]/g, "");

  if (alnum) {
    pushUnique(variants, alnum);
    pushUnique(variants, alnum.toUpperCase());
    const m = alnum.match(/^([A-Za-z]+)(\d+)$/i);
    if (m) {
      const letters = m[1].toUpperCase();
      const num = m[2];
      pushUnique(variants, `${letters}${num}`);
      pushUnique(variants, `${letters}-${num}`);
      pushUnique(variants, `${letters} ${num}`);
      if (ROMAN_MAP[num]) {
        pushUnique(variants, `${letters} ${ROMAN_MAP[num]}`);
        pushUnique(variants, `${letters}-${ROMAN_MAP[num]}`);
      }
    }
    const m2 = alnum.match(/^([A-Za-z]+)(I{1,3}|IV|V|VI{0,3})$/i);
    if (m2) {
      pushUnique(variants, `${m2[1].toUpperCase()} ${m2[2].toUpperCase()}`);
    }
  }

  if (hangul && hangul.length >= 2) {
    pushUnique(variants, hangul);
    const koNum = hangul.match(/^(.+?)([0-9一二三四五六七八九十]+)$/);
    if (koNum) {
      pushUnique(variants, `${koNum[1]} ${koNum[2]}`);
      pushUnique(variants, `${koNum[1]}-${koNum[2]}`);
    }
    if (/오피모|opiomo|opimo/i.test(hangul + alnum)) {
      ["OPIMO", "OPIMO-III", "OPIMO III", "오피모", "오피모3"].forEach((v) =>
        pushUnique(variants, v)
      );
      ["FRAME", "BED", "프레임", "침대 프레임"].forEach((v) =>
        pushUnique(variants, v)
      );
    }
  }

  const brand = String(ctx.brandName || "").trim();
  if (brand) {
    variants.slice(0, 8).forEach((v) => pushUnique(variants, `${brand} ${v}`));
  }

  return variants.slice(0, 24);
}

function pickPrimaryTopic(input) {
  return (
    sanitizeText(input.topic) ||
    sanitizeText(input.mainKeyword) ||
    sanitizeText(input.productName) ||
    sanitizeText(input.writingSubject) ||
    ""
  );
}

function matchCategorySignals(textBlob, industry) {
  const blob = `${textBlob} ${industry || ""}`;
  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(blob)) return hint;
  }
  if (/가구|인테리어|침실|home/i.test(blob)) {
    return {
      category: "가구·인테리어",
      productFamily: "가구·침실",
      lineupHint: "브랜드 가구 라인업",
      searchTerms: ["가구", "침실", "인테리어"],
    };
  }
  return null;
}

/**
 * @param {Record<string, unknown>} input
 */
export function discoverClues(input = {}) {
  const brand = sanitizeText(input.brandName) || "";
  const region = sanitizeText(input.region) || "";
  const topic = pickPrimaryTopic(input);
  const industry =
    sanitizeText(input.industry) ||
    sanitizeText(input.industryText) ||
    "";
  const productName =
    sanitizeText(input.productName) ||
    sanitizeText(input.v2ProductName) ||
    topic;

  const sources = collectScalarTexts(input);
  const textBlob = [brand, region, topic, productName, industry, ...sources]
    .filter(Boolean)
    .join("\n");

  const entityVariants = expandEntityVariants(topic || productName, {
    brandName: brand,
    industry,
  });
  for (const s of sources.slice(0, 12)) {
    expandEntityVariants(s.slice(0, 40), { brandName: brand, industry }).forEach(
      (v) => pushUnique(entityVariants, v)
    );
  }

  const category = matchCategorySignals(textBlob, industry);
  const inferences = [];

  if (category) {
    inferences.push({
      kind: "category",
      label: category.category,
      detail: `${category.productFamily} — ${category.lineupHint} (입력·표기 단서 기반 추론, 스펙 단정 금지)`,
      confidence: "medium",
    });
  }
  if (brand) {
    inferences.push({
      kind: "brand_line",
      label: "브랜드 계열",
      detail: `「${brand}」브랜드·${region || "지역"} 맥락에서 ${topic || "주제"}를 설명`,
      confidence: "high",
    });
  }
  if (entityVariants.length > 1) {
    inferences.push({
      kind: "entity_variants",
      label: "표기 변형",
      detail: `동일 주제 후보 표기: ${entityVariants.slice(0, 6).join(" · ")}`,
      confidence: "medium",
    });
  }

  const clues = [];
  const pushClue = (axis, text, source, meta = {}) => {
    const t = String(text || "").trim();
    if (t.length < 3) return;
    clues.push({ axis, text: t, source, ...meta });
  };

  pushClue("topic", topic, "user_topic", { verified: Boolean(topic) });
  if (productName && productName !== topic) {
    pushClue("topic", productName, "product_name");
  }
  for (const v of entityVariants.slice(0, 8)) {
    pushClue("topic", `주제 표기 변형 「${v}」— 검색·조사용 단서`, "entity_variant");
  }
  for (const s of sources.slice(0, 16)) {
    const axis =
      s.includes(region) && region ? "region" : s.includes(brand) && brand ? "brand" : "context";
    pushClue(axis, s.slice(0, 220), "input_field");
  }
  for (const inf of inferences) {
    pushClue("category", inf.detail, "inference", { confidence: inf.confidence });
  }

  const searchQueries = [];
  const addQuery = (q) => {
    const s = String(q || "").trim();
    if (s.length >= 4) pushUnique(searchQueries, s);
  };

  if (brand && topic) addQuery(`${brand} ${topic}`);
  for (const v of entityVariants.slice(0, 4)) {
    if (brand) addQuery(`${brand} ${v}`);
    addQuery(`${v} 특징`);
  }
  if (brand) addQuery(`${brand} 라인업`);
  if (category && brand) {
    addQuery(`${brand} ${category.searchTerms[0] || category.category}`);
    addQuery(`${region} ${category.searchTerms[0] || category.category}`.trim());
  }
  if (region && brand) addQuery(`${region} ${brand} 매장`);

  const seen = new Set();
  const facts = clues
    .map((c) => ({
      axis: c.axis === "context" ? "topic" : c.axis,
      fact: c.text,
      source: c.source,
      confidence: c.confidence || (c.verified ? "high" : "medium"),
    }))
    .filter((f) => {
      const k = f.fact.slice(0, 80).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const brief = buildClueDiscoveryBrief({
    brand,
    region,
    topic,
    industry,
    entityVariants,
    inferences,
    clues,
    searchQueries,
  });

  return {
    brand,
    region,
    topic,
    productName,
    industry,
    textBlob,
    entityVariants,
    inferences,
    clues,
    facts,
    searchQueries,
    brief,
    canWrite: Boolean(brand && region && (topic || facts.length >= 2)),
  };
}

export function buildClueDiscoveryBrief(discovery) {
  const lines = [
    CLUE_DISCOVERY_WRITING_RULES,
    "【CLUE DISCOVERY · 입력에서 찾은 단서】",
    `브랜드: ${discovery.brand || "(미입력)"}`,
    `지역: ${discovery.region || "(미입력)"}`,
    `주제: ${discovery.topic || "(미입력)"}`,
  ];
  if (discovery.entityVariants?.length) {
    lines.push(
      `표기 변형(단서): ${discovery.entityVariants.slice(0, 8).join(" · ")}`
    );
  }
  if (discovery.inferences?.length) {
    lines.push(
      "추론(단정 금지):",
      ...discovery.inferences.map((i) => `· ${i.label}: ${i.detail}`)
    );
  }
  if (discovery.clues?.length) {
    lines.push(
      "입력 실마리:",
      ...discovery.clues.slice(0, 12).map((c) => `· [${c.source}] ${c.text}`)
    );
  }
  lines.push('작성 전 자문: "내가 놓친 단서는 없는가?"');
  return lines.join("\n");
}

export function cluesToResearchFacts(discovery) {
  return (discovery?.facts || []).map((f) => ({
    axis: f.axis,
    fact: f.fact,
    source: f.source || "clue_discovery",
  }));
}

export function mergeClueFacts(existingFacts, discovery) {
  const clueFacts = cluesToResearchFacts(discovery);
  const seen = new Set();
  return [...existingFacts, ...clueFacts].filter((f) => {
    const k = String(f.fact || "")
      .slice(0, 90)
      .toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
