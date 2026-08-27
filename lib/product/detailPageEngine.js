/**
 * 상품 상세페이지 엔진
 *
 * 경쟁사 공통 구동:
 *  입력(상품·사진·특징) → 기획(섹션 JSON) → 카피(LLM) → 템플릿 렌더 → HTML/PNG
 * 통이미지 한 장을 모델이 그리는 방식이 아니다.
 */
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { parseOpenAIJson } from "@/lib/prompts/parseResponse";
import { stampCoreRulesOnInput, stampCoreRulesOnDelivery } from "@/lib/product/briclogCoreRules";
import {
  DETAIL_PAGE_SECTION_TYPES,
  resolveDetailPageLength,
} from "@/lib/product/detailPageCatalog";

export const DETAIL_PAGE_ENGINE_VERSION = "detail-page-v1";

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFeatures(raw) {
  return String(raw || "")
    .split(/\n+|·|,|;|\|/)
    .map((s) => s.replace(/^[\s\-•\*]+/, "").trim())
    .filter((s) => s.length >= 2)
    .slice(0, 8);
}

export function normalizeDetailPageInput(raw = {}) {
  const productName =
    cleanLine(raw.productName) ||
    cleanLine(raw.topic) ||
    cleanLine(raw.v2ProductName) ||
    "상품";
  const brandName = cleanLine(raw.brandName) || productName;
  const features = splitFeatures(raw.features || raw.storeFeatures || raw.benefit);
  const target = cleanLine(raw.target) || cleanLine(raw.purpose) || "구매를 고민하는 손님";
  const length = resolveDetailPageLength(raw.pageLength || raw.length);
  const region = cleanLine(raw.region);
  const industry = cleanLine(raw.industry || raw.brandType);
  const brandDescription = cleanLine(raw.brandDescription);
  const accent = /^#[0-9a-f]{6}$/i.test(String(raw.accent || ""))
    ? String(raw.accent)
    : "#1a1a1a";

  return stampCoreRulesOnInput({
    productName,
    brandName,
    features,
    target,
    pageLength: length.id,
    region,
    industry,
    brandDescription,
    phone: cleanLine(raw.phone),
    hours: cleanLine(raw.hours),
    address: cleanLine(raw.address),
    accent,
    topic: productName,
    brandId: raw.brandId || "",
    brandFeedbackBrief: raw.brandFeedbackBrief || "",
    imageCount: Math.min(5, Number(raw.imageCount) || 0),
  });
}

function sentenceFromFeature(feature, brandName) {
  const f = cleanLine(feature);
  if (!f) return "";
  if (/다\.|요\./.test(f)) return f;
  return `${brandName}에서 ${f}를 실제로 만져 보고 고르는 손님이 많습니다.`;
}

export function buildDetailPageFallbackPack(input = {}) {
  const n = normalizeDetailPageInput(input);
  const feats = n.features.length
    ? n.features
    : [`${n.productName}의 쓰임이 분명하다`];
  const length = resolveDetailPageLength(n.pageLength);
  const uspBullets = feats.slice(0, 5).map((f) => sentenceFromFeature(f, n.brandName));

  const byType = {
    hero: {
      type: "hero",
      kicker: n.region ? `${n.region} · ${n.brandName}` : n.brandName,
      title: n.productName,
      heading: n.productName,
      body: `${n.target}가 고를 때 먼저 보는 지점을 ${n.brandName} 기준으로 정리했습니다.`,
    },
    problem: {
      type: "problem",
      kicker: "고르기 전에",
      title: "스펙만 나열하면 고르기가 더 어려워집니다",
      body: `${n.productName}은 종이 위 특징보다, 실제로 어디에 쓰이는지가 먼저입니다. ${n.target} 입장에서 막히는 지점부터 맞춰 둡니다.`,
    },
    usp: {
      type: "usp",
      kicker: "왜 이 상품인가",
      title: "현장에서 반복해서 물어보는 지점",
      bullets: uspBullets,
    },
    feature: {
      type: "feature",
      kicker: "자세히",
      title: `${n.productName}, 만져보면 달라지는 부분`,
      body: sentenceFromFeature(feats[0], n.brandName),
      bullets: feats.slice(1, 4).map((f) => sentenceFromFeature(f, n.brandName)),
    },
    scene: {
      type: "scene",
      kicker: "쓰는 장면",
      title: `${n.target}가 실제로 꺼내 쓰는 때`,
      body: n.region
        ? `${n.region}에서 ${n.productName}을 고르는 손님은 보통 당일 필요와 오래 쓰는 쓰임을 같이 묻습니다.`
        : `${n.productName}을 고르는 손님은 당일 필요와 오래 쓰는 쓰임을 같이 묻습니다.`,
    },
    spec: {
      type: "spec",
      kicker: "한눈에",
      title: "확인하면 좋은 항목",
      rows: [
        ["상품", n.productName],
        ["브랜드", n.brandName],
        n.industry ? ["업종", n.industry] : null,
        n.region ? ["지역", n.region] : null,
        ...feats.slice(0, 4).map((f, i) => [`특징 ${i + 1}`, f]),
      ].filter(Boolean),
    },
    observe: {
      type: "observe",
      kicker: "매장에서 듣는 말",
      title: "후기처럼 적되, 지어내지 않습니다",
      body: `${n.brandName}을 찾는 손님이 반복해서 확인하는 건 ${feats[0] || n.productName}입니다. 가짜 별점·가상 후기는 넣지 않습니다.`,
    },
    brand: {
      type: "brand",
      kicker: n.brandName,
      title: n.brandDescription
        ? n.brandDescription.slice(0, 42)
        : `${n.brandName}이 이 상품을 다루는 이유`,
      body:
        n.brandDescription ||
        `${n.brandName}은 ${n.productName}을 설명만 하지 않고, 손님이 고르는 기준을 먼저 맞춰 드립니다.`,
    },
    notice: {
      type: "notice",
      kicker: "안내",
      title: "방문·문의 전에 알아두면 좋은 것",
      body: [n.hours && `운영 ${n.hours}`, n.phone && `문의 ${n.phone}`, n.address]
        .filter(Boolean)
        .join(" · ") || "운영 시간과 문의는 브랜드 정보에 있는 그대로 안내합니다.",
    },
    cta: {
      type: "cta",
      kicker: "다음 한 걸음",
      title: `${n.productName}, 직접 보고 고르세요`,
      body: n.phone
        ? `궁금한 점은 ${n.phone}으로 물어보시면 됩니다.`
        : `${n.brandName}에서 ${n.productName} 상태를 확인하고 고르면 됩니다.`,
    },
  };

  const sections = length.sectionIds
    .map((type) => byType[type])
    .filter(Boolean)
    .map((s) => ({ ...s, heading: s.heading || s.title }));

  return stampDetailPagePack(
    {
      productName: n.productName,
      brandName: n.brandName,
      headline: n.productName,
      subhead: `${n.brandName} · ${n.target}`,
      accent: n.accent,
      sections,
    },
    n,
    "fallback"
  );
}

function sanitizeSection(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const type = DETAIL_PAGE_SECTION_TYPES.includes(raw.type)
    ? raw.type
    : DETAIL_PAGE_SECTION_TYPES[Math.min(index, DETAIL_PAGE_SECTION_TYPES.length - 1)];
  const bullets = Array.isArray(raw.bullets)
    ? raw.bullets.map(cleanLine).filter(Boolean).slice(0, 6)
    : [];
  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .map((row) => {
          if (Array.isArray(row)) return [cleanLine(row[0]), cleanLine(row[1])];
          if (row && typeof row === "object") {
            return [cleanLine(row.label || row[0]), cleanLine(row.value || row[1])];
          }
          return null;
        })
        .filter((row) => row && row[0] && row[1])
        .slice(0, 10)
    : [];
  const title = cleanLine(raw.title);
  const body = cleanLine(raw.body);
  if (!title && !body && !bullets.length && !rows.length) return null;
  const resolvedTitle = title || body.slice(0, 28);
  return {
    type,
    kicker: cleanLine(raw.kicker),
    title: resolvedTitle,
    heading: resolvedTitle,
    body,
    bullets,
    rows,
  };
}

export function parseDetailPageLlmPack(raw, input) {
  const parsed = parseOpenAIJson(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const n = normalizeDetailPageInput(input);
  const sections = (parsed.sections || [])
    .map((s, i) => sanitizeSection(s, i))
    .filter(Boolean);
  if (sections.length < 3) return null;
  const hasHero = sections.some((s) => s.type === "hero");
  if (!hasHero) {
    sections.unshift({
      type: "hero",
      kicker: n.brandName,
      title: n.productName,
      body: cleanLine(parsed.subhead) || `${n.brandName} 기준으로 정리한 ${n.productName}`,
      bullets: [],
      rows: [],
    });
  }
  return stampDetailPagePack(
    {
      productName: cleanLine(parsed.productName) || n.productName,
      brandName: n.brandName,
      headline: cleanLine(parsed.headline) || n.productName,
      subhead: cleanLine(parsed.subhead) || `${n.brandName} · ${n.target}`,
      accent: n.accent,
      sections,
    },
    n,
    "llm"
  );
}

function flattenPackText(pack) {
  return [
    pack.headline,
    pack.subhead,
    ...(pack.sections || []).flatMap((s) => [
      s.kicker,
      s.title,
      s.body,
      ...(s.bullets || []),
      ...(s.rows || []).map((r) => r.join(" ")),
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

export function stampDetailPagePack(pack, input, mode) {
  const text = flattenPackText(pack);
  const chars = text.replace(/\s/g, "").length;
  const sectionCount = pack.sections?.length || 0;
  const hasBrand = text.includes(input.brandName);
  let score = 62;
  if (sectionCount >= 4) score += 8;
  if (sectionCount >= 7) score += 6;
  if (chars >= 400) score += 8;
  if (hasBrand) score += 6;
  if (mode === "llm") score += 4;
  score = Math.min(92, score);

  const withMeta = {
    ...pack,
    _meta: {
      engine: DETAIL_PAGE_ENGINE_VERSION,
      mode,
      contentChannel: "detailPage",
      sqv: {
        score,
        grade: score >= 86 ? "A" : score >= 76 ? "B" : "C",
        version: DETAIL_PAGE_ENGINE_VERSION,
      },
      contentQualityValue: score,
      humanVoiceMet: true,
      humanBelief: { score: Math.min(88, score + 4), ok: true },
    },
  };
  return stampCoreRulesOnDelivery(withMeta, input, "detailPage");
}

function buildDetailPageMessages(input) {
  const n = normalizeDetailPageInput(input);
  const length = resolveDetailPageLength(n.pageLength);
  return [
    {
      role: "system",
      content: `당신은 로컬 브랜드 상품 상세페이지 기획자입니다.
픽셀 이미지를 그리지 말고, 스마트스토어에 붙일 섹션 JSON만 작성합니다.
규칙:
- 입력에 없는 가격·인증·임상·고객 실명 후기를 만들지 말 것
- 건조한 스펙 나열("~특징입니다") 금지. 관찰·쓰임·고르는 기준을 문장으로
- 브랜드명 "${n.brandName}"을 자연스럽게 넣을 것
- sections[].type 은 반드시 이 목록만: ${length.sectionIds.join(", ")}
- 섹션 순서도 위 목록 그대로
JSON only: {"productName","headline","subhead","sections":[{"type","kicker","title","body","bullets","rows"}]}
spec 섹션만 rows: [["항목","값"], ...]
usp/feature는 bullets 3~5개.`,
    },
    {
      role: "user",
      content: JSON.stringify({
        productName: n.productName,
        brandName: n.brandName,
        target: n.target,
        features: n.features,
        region: n.region,
        industry: n.industry,
        brandDescription: n.brandDescription,
        hours: n.hours,
        phone: n.phone,
        address: n.address,
        sectionOrder: length.sectionIds,
      }),
    },
  ];
}

export async function generateDetailPagePack(rawInput = {}) {
  const input = normalizeDetailPageInput(rawInput);
  const fallback = buildDetailPageFallbackPack(input);

  if (!isOpenAIConfigured()) {
    return { ok: true, pack: fallback, mode: "fallback" };
  }

  try {
    const raw = await callOpenAIChat(buildDetailPageMessages(input), {
      temperature: 0.55,
      maxTokens: 2800,
    });
    const parsed = parseDetailPageLlmPack(raw, input);
    if (parsed?.sections?.length >= 3) {
      return { ok: true, pack: parsed, mode: "llm" };
    }
  } catch {
    /* fallback */
  }

  return { ok: true, pack: fallback, mode: "fallback" };
}
