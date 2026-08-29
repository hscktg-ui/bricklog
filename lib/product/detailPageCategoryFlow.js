/**
 * 카테고리 상세 나열 SSOT.
 * 범용 히트상품 5포인트가 아니라, 그 카테고리 상위 상세가 실제로 읽는 순서.
 * 없는 품종·등급·인증은 만들지 않는다.
 */
import { resolveIndustryCategoryKey } from "@/lib/product/industryCategoryKey";

export const DETAIL_PAGE_CATEGORY_FLOW_VERSION = "gollaboda-cat-flow-v1";

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function asList(raw) {
  if (Array.isArray(raw)) return raw.map(cleanLine).filter(Boolean);
  return String(raw || "")
    .split(/\n+/)
    .map((s) => s.replace(/^[\s\-•\*]+/, "").trim())
    .filter(Boolean);
}

function extractWeight(text) {
  const m = String(text || "").match(/(\d+(?:\.\d+)?\s*(?:kg|g|킬로|키로))/i);
  return m ? m[1].replace(/\s+/g, "") : "";
}

function dashLine(label, value) {
  const a = cleanLine(label);
  const b = cleanLine(value);
  if (!a) return "";
  if (!b || b === a) return a;
  return `${a} — ${b}`;
}

const ALIAS = {
  tea_cafe: "cafe",
  pet_cafe: "cafe",
};

/**
 * @typedef {object} CategorySlot
 * @property {string} key
 * @property {string} label
 * @property {RegExp=} match
 * @property {boolean=} material
 * @property {string=} from
 * @property {((input: object, blob: string) => string)=} infer
 */

/** @type {Record<string, object>} */
const FLOWS = {
  grocery: {
    id: "grocery",
    label: "양곡·쌀",
    analysis:
      "상위 쌀 상세는 산지 → 품종·등급(있을 때만) → 햅쌀·생산년도 → 도정 → 중량 → 포장 → 짓는 법 → 원재료 순으로 고른다.",
    doNotInvent: ["품종", "등급", "인증", "생산년도"],
    intentKicker: "",
    chooseTitle: "고를 때 이 칸부터",
    explainKicker: "표기",
    uspKicker: "",
    uspTitle: "포장에서 대조하는 점",
    specKicker: "표기",
    specTitle: "",
    sceneKicker: "",
    sceneTitle: "씻고 밥을 짓는 순서",
    observeKicker: "",
    observeTitle: "포장 창을 보면",
    /** @type {CategorySlot[]} */
    slots: [
      {
        key: "origin",
        label: "산지",
        material: true,
        match: /산지|수확|여주|이천|철원|경기미|전남|충청|강원/,
        from: "region",
      },
      { key: "variety", label: "품종", from: "variety", match: /추청|고시히카리|삼광|진상|아끼바레|품종/ },
      { key: "grade", label: "등급", match: /특등|1등급|2등급|등급/ },
      {
        key: "harvest",
        label: "햅쌀",
        match: /햅쌀|생산년도|20(2[0-9]|3[0-9])년/,
        infer: (input) => {
          const name = String(input.productName || "");
          if (!/햅쌀/.test(name)) return "";
          const m = name.match(/([가-힣]+?\s*햅쌀)/);
          return m ? m[1].replace(/\s+/g, " ").trim() : "햅쌀";
        },
      },
      { key: "mill", label: "도정", match: /도정/ },
      {
        key: "weight",
        label: "중량",
        material: true,
        match: /\d+\s*(kg|g|킬로|키로)/i,
        infer: (input) => extractWeight(input.productName),
      },
      { key: "pack", label: "포장", match: /진공|포장|지대|포대|지퍼/ },
      { key: "cook", label: "짓는 법", match: /밥|취사|물\s*비율|씻/ },
      {
        key: "ingredient",
        label: "원재료",
        material: true,
        match: /원재료|백미|현미|잡곡/,
        infer: (input) =>
          /쌀|햅쌀|백미|현미|잡곡/.test(`${input.productName || ""}`) ? "쌀" : "",
      },
    ],
  },
  cafe: {
    id: "cafe",
    label: "원두·카페",
    analysis:
      "상위 원두 상세는 원산지·블렌드 → 로스팅 → 분쇄 → 중량 → 추출 → 보관 순으로 고른다.",
    doNotInvent: ["원산지", "산지 배합 비율", "인증"],
    intentKicker: "",
    chooseTitle: "고를 때 이 칸부터",
    explainKicker: "봉투",
    uspKicker: "",
    uspTitle: "내려 마시기 전에 대조하는 점",
    specKicker: "표기",
    specTitle: "",
    sceneKicker: "",
    sceneTitle: "분쇄 굵기 고르고 내려 마시는 순서",
    observeKicker: "",
    observeTitle: "봉투를 보면",
    slots: [
      {
        key: "origin",
        label: "원산지",
        material: true,
        from: "origin",
        match: /원산지|에티오피아|브라질|콜롬비아|케냐|과테말라|산지/,
      },
      {
        key: "bean",
        label: "원두",
        material: true,
        match: /블렌드|싱글|생두|아라비카|로부스타|원두/,
        infer: (input) => {
          const name = String(input.productName || "");
          const blend = name.match(/([가-힣A-Za-z0-9 ]*블렌드)/);
          if (blend) return blend[1].replace(/\s+/g, " ").trim();
          return /원두|블렌드|커피/.test(name) ? "원두 포장" : "";
        },
      },
      { key: "roast", label: "로스팅", material: true, match: /로스트|로스팅|배전|중배전|약배전|강배전/ },
      { key: "grind", label: "분쇄", match: /분쇄|그라인드/ },
      {
        key: "weight",
        label: "중량",
        material: true,
        match: /\d+\s*(kg|g)/i,
        infer: (input) => extractWeight(input.productName),
      },
      { key: "brew", label: "추출", match: /추출|핸드드립|에스프레소|내려/ },
      { key: "keep", label: "보관", match: /보관|밀봉|신선/ },
    ],
  },
  furniture: {
    id: "furniture",
    label: "가구",
    analysis: "상위 가구 상세는 소재 → 크기 → 하중 → 조립 → 마감 순으로 고른다.",
    doNotInvent: ["하중", "인증", "원산지"],
    intentKicker: "이 카테고리에서 고르는 순서",
    chooseTitle: "고를 때 이 칸부터",
    uspKicker: "소재 · 자재",
    uspTitle: "놓기 전에 대조하는 항목",
    specKicker: "항목",
    specTitle: "카테고리 기준으로 적은 표",
    sceneKicker: "조립",
    sceneTitle: "놓고 쓰는 순서",
    observeKicker: "마감",
    observeTitle: "가까이 보면 알 수 있는 점",
    slots: [
      { key: "material", label: "소재", material: true, match: /소재|원목|패브릭|가죽|철제|자재/ },
      { key: "size", label: "크기", match: /크기|가로|세로|높이|mm|cm|치수/ },
      { key: "load", label: "하중", match: /하중|kg/ },
      { key: "assemble", label: "조립", match: /조립|설치/ },
      { key: "finish", label: "마감", match: /마감|도장|코팅/ },
    ],
  },
  salon: {
    id: "salon",
    label: "살롱",
    analysis: "상위 시술 상세는 시술 → 시간 → 재료 → 손상·유지 순으로 고른다.",
    doNotInvent: ["인증"],
    intentKicker: "이 카테고리에서 고르는 순서",
    chooseTitle: "고를 때 이 칸부터",
    uspKicker: "재료",
    uspTitle: "시술 전에 대조하는 항목",
    specKicker: "항목",
    specTitle: "카테고리 기준으로 적은 표",
    sceneKicker: "시술",
    sceneTitle: "받고 난 뒤 유지하는 순서",
    observeKicker: "결",
    observeTitle: "가까이 보면 알 수 있는 점",
    slots: [
      { key: "service", label: "시술", match: /펌|염색|커트|클리닉|시술/ },
      { key: "time", label: "시간", match: /시간|분/ },
      { key: "material", label: "재료", material: true, match: /약|염모|재료|제/ },
      { key: "keep", label: "유지", match: /유지|손상|케어/ },
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "식당",
    analysis: "상위 음식 상세는 원재료 → 조리 → 양 → 보관 순으로 고른다.",
    doNotInvent: ["원산지", "인증"],
    intentKicker: "이 카테고리에서 고르는 순서",
    chooseTitle: "고를 때 이 칸부터",
    uspKicker: "소재 · 재료",
    uspTitle: "먹기 전에 대조하는 항목",
    specKicker: "항목",
    specTitle: "카테고리 기준으로 적은 표",
    sceneKicker: "조리",
    sceneTitle: "데우거나 차려 먹는 순서",
    observeKicker: "재료",
    observeTitle: "가까이 보면 알 수 있는 점",
    slots: [
      {
        key: "ingredient",
        label: "원재료",
        material: true,
        match: /원재료|고기|해물|채소|쌀/,
      },
      { key: "cook", label: "조리", match: /조리|삶|굽|볶/ },
      { key: "amount", label: "양", match: /인분|g|kg/ },
      { key: "keep", label: "보관", match: /보관|냉장|냉동/ },
    ],
  },
  default: {
    id: "default",
    label: "기본",
    analysis: "카테고리 분석이 없으면 넣은 특징만, 고르는 사람 순서로 나열한다.",
    doNotInvent: ["인증", "1위"],
    intentKicker: "고를 때 보는 순서",
    chooseTitle: "고를 때 이 칸부터",
    uspKicker: "소재 · 재료",
    uspTitle: "반복해서 확인하는 지점",
    specKicker: "항목",
    specTitle: "입력된 항목만",
    sceneKicker: "쓰는 때",
    sceneTitle: "꺼내 쓰는 장면",
    observeKicker: "직접 보면",
    observeTitle: "만지거나 대조하면 달라지는 점",
    slots: [
      { key: "who", label: "누구", from: "target" },
      { key: "stuck", label: "막히는 점", from: "searchIntent" },
      { key: "feat", label: "특징", match: /./, repeat: true },
    ],
  },
};

export function categoryKeyFromDetailInput(input = {}) {
  const features = asList(input.features || input.storeFeatures).join(" ");
  const key = resolveIndustryCategoryKey({
    industry: input.industry || input.industryLabel,
    topic: input.topic || input.productName,
    mainKeyword: input.mainKeyword || input.productName,
    brandName: input.brandName,
    storeFeatures: features,
  });
  return ALIAS[key] || key;
}

export function resolveDetailPageCategoryFlow(input = {}) {
  const key = categoryKeyFromDetailInput(input);
  return FLOWS[key] || FLOWS.default;
}

function takeFrom(input, slot) {
  if (slot.from && input[slot.from]) return cleanLine(input[slot.from]);
  if (typeof slot.infer === "function") return cleanLine(slot.infer(input, "") || "");
  return "";
}

function fillSlots(flow, input) {
  const feats = [
    ...asList(input.features),
    ...asList(input.highlights),
    ...asList(input.researchFacts),
  ];
  const used = new Set();
  const filled = [];

  for (const slot of flow.slots || []) {
    if (slot.repeat && slot.match) {
      for (const f of feats) {
        if (used.has(f) || !slot.match.test(f)) continue;
        used.add(f);
        filled.push({
          key: slot.key,
          label: slot.label,
          value: f,
          material: !!slot.material,
          source: f,
        });
      }
      continue;
    }
    let value = "";
    let source = "";
    if (slot.from) {
      value = takeFrom(input, slot);
    }
    if (slot.match) {
      const hit = feats.find((f) => !used.has(f) && slot.match.test(f));
      if (hit) {
        used.add(hit);
        source = hit;
        if (!value) value = hit;
      }
    }
    if (!value) {
      value = takeFrom(input, slot);
    }
    if (!value) continue;
    filled.push({
      key: slot.key,
      label: slot.label,
      value,
      material: !!slot.material,
      source,
    });
  }

  const leftover = feats.filter((f) => !used.has(f));
  return { filled, leftover };
}

export function buildDetailPageCategoryListing(input = {}) {
  const flow = resolveDetailPageCategoryFlow(input);
  const { filled, leftover } = fillSlots(flow, input);
  const stepLines = filled.slice(0, 4).map((s) => dashLine(s.label, s.value));
  const materials = filled.filter((s) => s.material);
  const materialLines = (materials.length ? materials : filled.slice(0, 4)).map((s) =>
    dashLine(s.label, s.value)
  );
  const specRows = [
    ...filled
      .map((s) => [s.label, s.value === s.label ? "" : s.value])
      .filter((row) => row[0] && row[1]),
    ...leftover.map((f) => ["특징", f]),
  ].slice(0, 10);
  const restLines = filled.slice(4).map((s) => dashLine(s.label, s.value));
  const pointLines = filled.slice(0, 5).map((s) => dashLine(s.label, s.value));
  const pointTitle = filled
    .slice(0, 5)
    .map((s) => s.label)
    .join(" · ");
  const firstLook = filled
    .slice(0, 2)
    .map((s) => s.label)
    .join(" · ");

  return {
    version: DETAIL_PAGE_CATEGORY_FLOW_VERSION,
    key: flow.id,
    label: flow.label,
    analysis: flow.analysis,
    textFlow: (flow.slots || []).map((s) => s.label),
    doNotInvent: flow.doNotInvent || [],
    filled,
    leftover,
    stepLines,
    materialLines,
    restLines,
    pointLines,
    specRows,
    firstLook,
    intentKicker: flow.intentKicker,
    chooseTitle: flow.chooseTitle || "고를 때 이 칸부터",
    explainKicker: flow.explainKicker || "표기",
    explainTitle: flow.explainTitle || pointTitle || "이 카테고리에서 먼저 보는 칸",
    problemKicker: flow.problemKicker || "",
    uspKicker: flow.uspKicker,
    uspTitle: flow.uspTitle,
    specKicker: flow.specKicker,
    specTitle: flow.specTitle,
    sceneKicker: flow.sceneKicker,
    sceneTitle: flow.sceneTitle,
    observeKicker: flow.observeKicker,
    observeTitle: flow.observeTitle,
  };
}

export function formatCategoryFlowForPrompt(input = {}) {
  const listing = buildDetailPageCategoryListing(input);
  const filled = listing.filled
    .map((s) => `${s.label}: ${s.value}`)
    .join(" / ");
  const skip = listing.doNotInvent.length
    ? `없는 항목은 만들지 말 것: ${listing.doNotInvent.join("·")}.`
    : "";
  return [
    "텍스트 나열은 범용 히트상품 5포인트가 아니라 이 카테고리 네이버 쇼핑 랭킹 상세가 읽는 순서다.",
    `카테고리 ${listing.label}(${listing.key}). ${listing.analysis}`,
    `고르는 순서: ${listing.textFlow.join(" → ")}`,
    filled ? `입력에서 채운 항목만: ${filled}` : "입력에 없는 슬롯은 비운다.",
    "intent bullets = 쓰지 않는다. explain bullets = 핵심 소구점(카테고리 칸 3~5). usp bullets = 소재·재료 항목.",
    "spec rows 라벨은 산지/원재료/도정/로스팅처럼 카테고리 단어. 「기준 1」 금지.",
    skip,
  ]
    .filter(Boolean)
    .join("\n");
}

export function summarizeCategoryFlow(listing) {
  const L = listing || {};
  return {
    id: L.key || "default",
    version: L.version || DETAIL_PAGE_CATEGORY_FLOW_VERSION,
    labels: (L.filled || []).map((s) => s.label),
  };
}
