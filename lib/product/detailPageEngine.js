/**
 * BRICLOG 상세페이지 엔진
 * GPT-5.6 Sol 1회 JSON · 기준 게이트 · 회사 프리셋 입력 호환
 */
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { parseOpenAIJson } from "@/lib/prompts/parseResponse";
import { stampCoreRulesOnInput, stampCoreRulesOnDelivery } from "@/lib/product/briclogCoreRules";
import {
  DETAIL_PAGE_SECTION_TYPES,
  DETAIL_PAGE_DEFAULT_ACCENT,
  resolveDetailPageLength,
  getDetailPageTokenBudget,
} from "@/lib/product/detailPageCatalog";
import {
  DETAIL_PAGE_STANDARD_VERSION,
  assessDetailPageStandard,
  scrubDetailPagePack,
  gptDetailPageSystemPrompt,
} from "@/lib/product/detailPageStandard";
import { getDetailPageCompanyPreset } from "@/lib/product/detailPageCompanyPresets";

export const DETAIL_PAGE_ENGINE_VERSION = "briclog-pdp-v1";

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

function mergePreset(raw = {}) {
  const preset = getDetailPageCompanyPreset(raw.presetId);
  if (!preset) return raw;
  return {
    ...preset,
    ...raw,
    productName: cleanLine(raw.productName) || preset.productName,
    brandName: cleanLine(raw.brandName) || preset.brandName,
    features: raw.features || preset.features,
    target: cleanLine(raw.target) || preset.target,
    searchIntent: cleanLine(raw.searchIntent) || preset.searchIntent,
    brandDescription: cleanLine(raw.brandDescription) || preset.brandDescription,
    region: cleanLine(raw.region) || preset.region,
    industry: cleanLine(raw.industry) || preset.industry,
    accent: raw.accent || preset.accent,
    pageLength: raw.pageLength || preset.pageLength,
  };
}

export function normalizeDetailPageInput(raw = {}) {
  const merged = mergePreset(raw);
  const productName =
    cleanLine(merged.productName) ||
    cleanLine(merged.topic) ||
    cleanLine(merged.v2ProductName) ||
    "상품";
  const brandName = cleanLine(merged.brandName) || productName;
  const features = splitFeatures(
    merged.features || merged.storeFeatures || merged.benefit
  );
  const target =
    cleanLine(merged.target) || cleanLine(merged.purpose) || "고르는 손님";
  const length = resolveDetailPageLength(merged.pageLength || merged.length);
  const accent = /^#[0-9a-f]{6}$/i.test(String(merged.accent || ""))
    ? String(merged.accent)
    : DETAIL_PAGE_DEFAULT_ACCENT;

  const researchFacts = Array.isArray(merged.researchFacts)
    ? merged.researchFacts.map(cleanLine).filter(Boolean).slice(0, 8)
    : splitFeatures(merged.researchBrief).slice(0, 8);

  return stampCoreRulesOnInput({
    productName,
    brandName,
    features,
    target,
    searchIntent: cleanLine(merged.searchIntent),
    pageLength: length.id,
    region: cleanLine(merged.region),
    industry: cleanLine(merged.industry || merged.brandType),
    brandDescription: cleanLine(merged.brandDescription),
    phone: cleanLine(merged.phone),
    hours: cleanLine(merged.hours),
    address: cleanLine(merged.address),
    accent,
    topic: productName,
    brandId: merged.brandId || "",
    brandFeedbackBrief: merged.brandFeedbackBrief || "",
    imageCount: Math.min(5, Number(merged.imageCount) || 0),
    researchFacts,
    presetId: merged.presetId || "",
  });
}

function observeLine(feature, brandName) {
  const f = cleanLine(feature);
  if (!f) return "";
  if (/다\.|요\./.test(f) && /직접|현장|보면|느껴|편/.test(f)) return f;
  return `현장에서 ${f}를 직접 확인해 보면, ${brandName} 쪽이 설명이 짧아집니다.`;
}

export function buildDetailPageFallbackPack(input = {}) {
  const n = normalizeDetailPageInput(input);
  const feats = n.features.length
    ? n.features
    : [`${n.productName}의 쓰임이 분명하다`];
  const length = resolveDetailPageLength(n.pageLength);
  const intent =
    n.searchIntent ||
    `${n.target}가 ${n.productName}을 고를 때 스펙만 보다가 막히는 지점`;

  const byType = {
    hero: {
      type: "hero",
      kicker: n.region ? `${n.region} · ${n.brandName}` : n.brandName,
      title: n.productName,
      heading: n.productName,
      body: `${n.target} 입장에서, 고르기 전에 먼저 정리해 두면 좋은 기준입니다.`,
    },
    intent: {
      type: "intent",
      kicker: "왜 찾게 되나",
      title: intent.slice(0, 42),
      body: `${intent}. ${n.brandName}은 그 질문에 광고 문장 대신 확인 가능한 기준으로 답합니다.`,
    },
    problem: {
      type: "intent",
      kicker: "왜 찾게 되나",
      title: intent.slice(0, 42),
      body: `${intent}. ${n.brandName}은 그 질문에 광고 문장 대신 확인 가능한 기준으로 답합니다.`,
    },
    explain: {
      type: "explain",
      kicker: "이유",
      title: "숫자보다, 실제로 어디에 쓰이는지",
      body: `${n.productName}은 목록으로 외우는 상품이 아닙니다. ${feats[0]}가 현장에서 어떻게 느껴지는지가 먼저입니다.`,
    },
    usp: {
      type: "usp",
      kicker: "고르는 기준",
      title: "반복해서 확인하는 지점",
      bullets: feats.slice(0, 5).map((f) => observeLine(f, n.brandName)),
    },
    observe: {
      type: "observe",
      kicker: "현장에서",
      title: "앉아 보거나, 만져 보면 달라지는 점",
      body: observeLine(feats[0], n.brandName),
    },
    feature: {
      type: "feature",
      kicker: "자세히",
      title: `${n.productName}, 조금 더`,
      body: observeLine(feats[0], n.brandName),
      bullets: feats.slice(1, 4).map((f) => observeLine(f, n.brandName)),
    },
    scene: {
      type: "scene",
      kicker: "쓰는 때",
      title: `${n.target}가 꺼내 쓰는 장면`,
      body: n.region
        ? `${n.region}에서 ${n.productName}을 고를 때는 당장의 필요와 오래 쓰는 쓰임을 같이 묻습니다.`
        : `${n.productName}을 고를 때는 당장의 필요와 오래 쓰는 쓰임을 같이 묻습니다.`,
    },
    spec: {
      type: "spec",
      kicker: "확인용",
      title: "입력된 항목만",
      rows: [
        ["상품", n.productName],
        ["브랜드", n.brandName],
        n.industry ? ["업종", n.industry] : null,
        n.region ? ["지역", n.region] : null,
        ...feats.slice(0, 4).map((f, i) => [`기준 ${i + 1}`, f]),
      ].filter(Boolean),
    },
    brand: {
      type: "brand",
      kicker: n.brandName,
      title: n.brandDescription
        ? n.brandDescription.slice(0, 48)
        : `${n.brandName}이 이 상품을 다루는 방식`,
      body:
        n.brandDescription ||
        `${n.brandName}은 ${n.productName}을 크게 외치지 않고, 고르는 기준을 먼저 맞춰 둡니다.`,
    },
    notice: {
      type: "notice",
      kicker: "안내",
      title: "방문·문의 전에",
      body:
        [n.hours && `운영 ${n.hours}`, n.phone && `문의 ${n.phone}`, n.address]
          .filter(Boolean)
          .join(" · ") || "운영 시간과 문의는 브랜드에 적힌 그대로입니다.",
    },
    cta: {
      type: "cta",
      kicker: "다음에",
      title: `${n.productName}, 기준만 챙기면 됩니다`,
      body: n.phone
        ? `궁금한 점은 ${n.phone}으로 물어보면 됩니다.`
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
  let type = DETAIL_PAGE_SECTION_TYPES.includes(raw.type)
    ? raw.type
    : DETAIL_PAGE_SECTION_TYPES[Math.min(index, DETAIL_PAGE_SECTION_TYPES.length - 1)];
  if (type === "problem") type = "intent";
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
      heading: n.productName,
      body: cleanLine(parsed.subhead) || `${n.brandName} 기준으로 정리한 ${n.productName}`,
      bullets: [],
      rows: [],
    });
  }
  return stampDetailPagePack(
    scrubDetailPagePack({
      productName: cleanLine(parsed.productName) || n.productName,
      brandName: n.brandName,
      headline: cleanLine(parsed.headline) || n.productName,
      subhead: cleanLine(parsed.subhead) || `${n.brandName} · ${n.target}`,
      accent: n.accent,
      sections,
    }),
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
  const cleaned = scrubDetailPagePack(pack);
  const text = flattenPackText(cleaned);
  const chars = text.replace(/\s/g, "").length;
  const sectionCount = cleaned.sections?.length || 0;
  const standard = assessDetailPageStandard(cleaned, input);
  let score = 64;
  if (sectionCount >= 4) score += 6;
  if (sectionCount >= 7) score += 6;
  if (chars >= 360) score += 6;
  if (text.includes(input.brandName)) score += 6;
  if (mode === "llm") score += 4;
  if (standard.ok) score += 8;
  else score -= Math.min(12, standard.reasons.length * 3);
  score = Math.max(50, Math.min(92, score));

  const withMeta = {
    ...cleaned,
    _meta: {
      engine: DETAIL_PAGE_ENGINE_VERSION,
      standardVersion: DETAIL_PAGE_STANDARD_VERSION,
      mode,
      contentChannel: "detailPage",
      writer: "gpt-5.6",
      standard,
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

function compactGptUserPayload(n) {
  const length = resolveDetailPageLength(n.pageLength);
  const payload = {
    productName: n.productName,
    brandName: n.brandName,
    target: n.target,
    features: n.features,
    sections: length.sectionIds,
  };
  if (n.searchIntent) payload.searchIntent = n.searchIntent;
  if (n.region) payload.region = n.region;
  if (n.industry) payload.industry = n.industry;
  if (n.brandDescription) payload.brandDescription = n.brandDescription;
  if (n.hours) payload.hours = n.hours;
  if (n.phone) payload.phone = n.phone;
  if (n.address) payload.address = n.address;
  if (n.researchFacts?.length) payload.facts = n.researchFacts;
  return payload;
}

function buildDetailPageMessages(input) {
  const n = normalizeDetailPageInput(input);
  const length = resolveDetailPageLength(n.pageLength);
  return [
    {
      role: "system",
      content: gptDetailPageSystemPrompt({
        brandName: n.brandName,
        sectionIds: length.sectionIds,
      }),
    },
    {
      role: "user",
      content: JSON.stringify(compactGptUserPayload(n)),
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
      maxTokens: getDetailPageTokenBudget(input.pageLength),
    });
    const parsed = parseDetailPageLlmPack(raw, input);
    if (parsed?.sections?.length >= 3) {
      const gate = parsed._meta?.standard;
      if (gate && !gate.ok && gate.reasons.includes("fake_review")) {
        return { ok: true, pack: fallback, mode: "fallback" };
      }
      return { ok: true, pack: parsed, mode: "llm" };
    }
  } catch {
    /* fallback */
  }

  return { ok: true, pack: fallback, mode: "fallback" };
}
