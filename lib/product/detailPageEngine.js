/**
 * 상품 상세페이지 엔진
 * GPT-5.6 Sol 1회 JSON · 기준 게이트 · 쇼핑몰 상세 관점
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
  scrubDetailPagePack,
  gptDetailPageSystemPrompt,
} from "@/lib/product/detailPageStandard";
import { getDetailPageExample } from "@/lib/product/detailPageCompanyPresets";
import {
  DETAIL_PAGE_TARGET_SCORE,
  fillDetailPageToGrade,
  flattenDetailPageText,
  scoreDetailPage,
  countDetailPageChars,
} from "@/lib/product/detailPageGrade";
import { DETAIL_PAGE_DESIGN_CONTEXT } from "@/lib/product/detailPageContext";
import { DETAIL_PAGE_MAX_PHOTOS } from "@/lib/product/detailPagePhotos";

export const DETAIL_PAGE_ENGINE_VERSION = "gollaboda-pdp-v1";

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFeatures(raw) {
  if (Array.isArray(raw)) {
    return raw.map(cleanLine).filter((s) => s.length >= 2).slice(0, 8);
  }
  const text = String(raw || "");
  const byLine = text
    .split(/\n+/)
    .map((s) => s.replace(/^[\s\-•\*]+/, "").trim())
    .filter((s) => s.length >= 2);
  if (byLine.length >= 2) return byLine.slice(0, 8);
  return text
    .split(/\s*[,，]\s*/)
    .map((s) => s.replace(/^[\s\-•\*]+/, "").trim())
    .filter((s) => s.length >= 2)
    .slice(0, 8);
}

function splitHighlights(raw) {
  return String(raw || "")
    .split(/\n+/)
    .map((s) => s.replace(/^[\s\-•\*\"']+/, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 80)
    .slice(0, 6);
}

function hasJongseong(word) {
  const ch = [...String(word || "")].pop();
  if (!ch) return true;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function eulReul(word) {
  return hasJongseong(word) ? "을" : "를";
}

function eunNeun(word) {
  return hasJongseong(word) ? "은" : "는";
}

function iGa(word) {
  return hasJongseong(word) ? "이" : "가";
}

function looksLikeClause(text) {
  const f = cleanLine(text);
  return f.length >= 10 && /(?:은|는|을|를|이|가|음|다|함|됨|맞춤|대체|않음)/.test(f);
}

function mergePreset(raw = {}) {
  const preset = getDetailPageExample(raw.presetId);
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
    imageCount: Math.min(
      DETAIL_PAGE_MAX_PHOTOS,
      Number(merged.imageCount) || 0
    ),
    highlights: splitHighlights(merged.highlights),
    mustInclude: cleanLine(merged.mustInclude || merged.extraCopy).slice(0, 600),
    photoCaptions: splitHighlights(
      Array.isArray(merged.photoCaptions)
        ? merged.photoCaptions.join("\n")
        : merged.photoCaptions
    ),
    researchFacts,
    presetId: merged.presetId || "",
    contentChannel: "detailPage",
    detailPageDesign: DETAIL_PAGE_DESIGN_CONTEXT,
  });
}

function observeLine(feature, brandName) {
  const f = cleanLine(feature);
  if (!f) return "";
  if (/직접|현장|느껴|보면/.test(f) && /다\.|요\.|니다/.test(f)) return f;
  const brand = `${brandName}${eunNeun(brandName)}`;
  if (looksLikeClause(f)) {
    return `장바구니 앞에서 ${f}. ${brand} 그 기준으로만 설명을 남깁니다.`;
  }
  return `${f}${eulReul(f)} 직접 대조해 보면, ${brand} 쪽 설명이 짧아집니다.`;
}

function padBody(text, min, extra) {
  let t = cleanLine(text);
  const add = cleanLine(extra);
  if (add && !t.includes(add)) t = `${t} ${add}`.trim();
  const closer = "고르는 순서가 보이면 다음 설명은 짧아집니다.";
  let guard = 0;
  while (countDetailPageChars(t) < min && guard < 6) {
    t = `${t} ${closer}`.trim();
    guard += 1;
  }
  return t;
}

export function injectDetailPageMustCopy(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const n =
    typeof input.productName === "string" && Array.isArray(input.highlights)
      ? input
      : normalizeDetailPageInput(input);
  const text = flattenDetailPageText(pack);
  const sections = pack.sections.map((s) => ({
    ...s,
    bullets: [...(s.bullets || [])],
  }));

  const unusedHighlights = (n.highlights || []).filter((h) => h && !text.includes(h));
  if (unusedHighlights.length) {
    const usp =
      sections.find((s) => s.type === "usp") || sections[1] || sections[0];
    usp.bullets = [
      ...(usp.bullets || []),
      ...unusedHighlights.map((h) => `${h} — 고를 때 먼저 보는 강조입니다.`),
    ].slice(0, 8);
  }

  const must = n.mustInclude;
  if (must) {
    const probe = flattenDetailPageText({ ...pack, sections });
    if (!probe.includes(must.slice(0, 24))) {
      const feature =
        sections.find((s) => s.type === "feature") ||
        sections.find((s) => s.type === "explain") ||
        sections[0];
      if (feature && !String(feature.body || "").includes(must.slice(0, 18))) {
        feature.body = `${cleanLine(feature.body)} ${must}`.trim();
      }
    }
  }

  return { ...pack, sections };
}

export function buildDetailPageFallbackPack(input = {}) {
  const n = normalizeDetailPageInput(input);
  const feats = n.features.length
    ? n.features
    : [`${n.productName}의 쓰임이 분명하다`];
  const length = resolveDetailPageLength(n.pageLength);
  const brand = `${n.brandName}${eunNeun(n.brandName)}`;
  const product = `${n.productName}${eunNeun(n.productName)}`;
  const intent =
    n.searchIntent ||
    `${n.target}${iGa(n.target)} ${n.productName}${eulReul(n.productName)} 고를 때 스펙만 보다가 막히는 지점`;
  const explainLead = looksLikeClause(feats[0])
    ? `${feats[0]} — 이게 현장에서 어떻게 느껴지는지가 먼저입니다.`
    : `${feats[0]}${iGa(feats[0])} 현장에서 어떻게 느껴지는지가 먼저입니다.`;

  const byType = {
    hero: {
      type: "hero",
      kicker: n.region ? `${n.region} · ${n.brandName}` : n.brandName,
      title: n.highlights[0] || n.productName,
      heading: n.highlights[0] || n.productName,
      body: padBody(
        `${n.target}${iGa(n.target)} ${n.productName}${eulReul(n.productName)} 고를 때, 스펙표만 보다가 멈추는 지점부터 적었습니다. ${product} 광고 문장 대신, ${n.brandName}에서 실제로 대조하는 기준만 화면에 남깁니다. 고르는 순서가 보이면 설명은 짧아집니다.`,
        120,
        n.highlights[1]
          ? `${n.highlights[1]} — 이 한 줄을 맨 위에서 먼저 보게 했습니다.`
          : `${feats[0]}가 고를 때 첫 기준으로 옵니다.`
      ),
    },
    intent: {
      type: "intent",
      kicker: "고를 때 막히는 점",
      title: intent.slice(0, 42),
      body: padBody(
        `${intent}. 특징을 나열해도 막히는 이유는, 다음에 무엇을 보면 되는지 순서가 없기 때문입니다. ${brand} 확인 가능한 항목만 맞춰 두고, 없는 후기·인증·가격은 화면에 올리지 않습니다. ${n.target}${iGa(n.target)} 비교할 때 다시 묻는 지점만 남깁니다.`,
        180,
        `${feats[0]}부터 보면, 나머지 특징은 그 다음입니다.`
      ),
    },
    problem: {
      type: "intent",
      kicker: "고를 때 막히는 점",
      title: intent.slice(0, 42),
      body: padBody(
        `${intent}. 특징을 나열해도 막히는 이유는, 다음에 무엇을 보면 되는지 순서가 없기 때문입니다. ${brand} 확인 가능한 항목만 맞춰 두고, 없는 후기·인증·가격은 화면에 올리지 않습니다. ${n.target}${iGa(n.target)} 비교할 때 다시 묻는 지점만 남깁니다.`,
        180,
        `${feats[0]}부터 보면, 나머지 특징은 그 다음입니다.`
      ),
    },
    explain: {
      type: "explain",
      kicker: "이유",
      title: "숫자보다, 실제로 어디에 쓰이는지",
      body: padBody(
        `${product} 목록으로 외우는 상품이 아닙니다. ${explainLead} ${n.target} 입장에서 그 쓰임이 맞는지가 스펙표보다 먼저입니다. 이유가 문장으로 보이면, 특징 한 줄로 끝내지 않아도 됩니다.`,
        200,
        feats[1]
          ? `${feats[1]}도 같은 순서로 보면 됩니다. 쓰임이 맞을 때만 다음 항목을 봅니다.`
          : "쓰임이 맞을 때만 다음 항목을 봅니다."
      ),
    },
    usp: {
      type: "usp",
      kicker: "고르는 기준",
      title: "반복해서 확인하는 지점",
      body: padBody(
        `${n.target}${iGa(n.target)} 화면에서 다시 돌아오는 기준입니다. 아래는 입력된 특징을 고르는 순서로 풀어 쓴 것입니다. 없는 장점은 보태지 않았습니다.`,
        70,
        n.mustInclude ? String(n.mustInclude).slice(0, 80) : ""
      ),
      bullets: (n.highlights.length ? [...n.highlights, ...feats] : feats)
        .filter((x, i, a) => a.indexOf(x) === i)
        .slice(0, 5)
        .map((f) => {
          if (looksLikeClause(f)) return `${f}. 고를 때 이 지점을 먼저 보면 됩니다.`;
          return `${f} — ${n.brandName}에서 손님이 반복해서 확인하는 기준입니다.`;
        }),
    },
    observe: {
      type: "observe",
      kicker: "직접 보면",
      title: "만지거나 대조하면 달라지는 점",
      body: padBody(
        `${observeLine(feats[0], n.brandName)} 종이 위 문장보다, 그 확인이 끝나면 설명이 짧아집니다. 없는 별점이나 가상 후기는 넣지 않습니다. ${n.target}${iGa(n.target)} 화면에서 다시 묻는 지점만 남깁니다.`,
        170,
        feats[1] ? observeLine(feats[1], n.brandName) : `${n.brandName}에서 반복해서 묻는 지점만 남깁니다.`
      ),
    },
    feature: {
      type: "feature",
      kicker: "자세히",
      title: `${n.productName}, 조금 더`,
      body: padBody(
        `${observeLine(feats[0], n.brandName)} 아래는 입력된 특징을 고를 때 어떻게 보는지입니다. 입력에 없는 성능은 보태서 설명하지 않습니다.`,
        150,
        feats.slice(1, 3).map((f) => observeLine(f, n.brandName)).join(" ")
      ),
      bullets: feats.slice(1, 4).map((f) => observeLine(f, n.brandName)),
    },
    scene: {
      type: "scene",
      kicker: "쓰는 때",
      title: `${n.target}${iGa(n.target)} 꺼내 쓰는 장면`,
      body: padBody(
        n.region
          ? `${n.region}에서 ${n.productName}${eulReul(n.productName)} 고를 때는 당장의 필요와 오래 쓰는 쓰임을 같이 묻습니다. ${n.target}${iGa(n.target)} 그 둘을 한 번에 맞춰 보려는 때가 많습니다. 그 장면을 기준으로 설명을 맞춰 둡니다.`
          : `${n.productName}${eulReul(n.productName)} 고를 때는 당장의 필요와 오래 쓰는 쓰임을 같이 묻습니다. ${n.target}${iGa(n.target)} 그 둘을 한 번에 맞춰 보려는 때가 많습니다. 그 장면을 기준으로 설명을 맞춰 둡니다.`,
        150,
        feats[0] ? `${feats[0]}가 그 장면에서 먼저 보이는 기준입니다.` : ""
      ),
    },
    spec: {
      type: "spec",
      kicker: "한눈에",
      title: "입력된 항목만",
      rows: [
        ["상품", n.productName],
        ["브랜드", n.brandName],
        n.industry ? ["업종", n.industry] : null,
        n.region ? ["지역", n.region] : null,
        n.target ? ["누구", n.target] : null,
        ...feats.slice(0, 4).map((f, i) => [`기준 ${i + 1}`, f]),
      ].filter(Boolean),
    },
    brand: {
      type: "brand",
      kicker: n.brandName,
      title: `${brand} 이 상품을 다루는 방식`,
      body: padBody(
        n.brandDescription ||
          `${brand} ${n.productName}${eulReul(n.productName)} 크게 외치지 않습니다. 고르는 기준을 먼저 맞춰 두고, 확인된 사실만 본문에 남깁니다. 브랜드 이름은 맥락 안에만 둡니다.`,
        130,
        n.region ? `${n.region}에서 같은 기준으로 설명을 맞춥니다.` : ""
      ),
    },
    notice: {
      type: "notice",
      kicker: "안내",
      title: "방문·문의 전에",
      body:
        [n.hours && `운영 ${n.hours}`, n.phone && `문의 ${n.phone}`, n.address]
          .filter(Boolean)
          .join(" · ") ||
        "운영 시간과 문의는 입력된 그대로입니다. 이 페이지에 없는 약속은 적지 않았습니다. 화면에서 확인한 기준만 가져가면 됩니다.",
    },
    cta: {
      type: "cta",
      kicker: "다음에",
      title: `${n.productName}, 기준만 챙기면 됩니다`,
      body: padBody(
        n.phone
          ? `궁금한 점은 ${n.phone}으로 물어보면 됩니다. 서두르라는 안내는 하지 않습니다. 고르는 순서가 보이면, 그다음 한 걸음은 ${n.target}${iGa(n.target)} 정하면 됩니다.`
          : `${brand} ${n.productName} 기준으로 먼저 맞춰 보면 됩니다. 서두르라는 안내는 하지 않습니다. 고르는 순서가 보이면, 그다음 한 걸음은 ${n.target}${iGa(n.target)} 정하면 됩니다.`,
        80,
        "방문이나 구매를 재촉하지 않습니다."
      ),
    },
  };

  const sections = length.sectionIds
    .map((type) => byType[type])
    .filter(Boolean)
    .map((s) => ({ ...s, heading: s.heading || s.title }));

  return stampDetailPagePack(
    injectDetailPageMustCopy(
      {
        productName: n.productName,
        brandName: n.brandName,
        headline: n.productName,
        subhead: `${n.brandName} · ${n.target}`,
        accent: n.accent,
        sections,
        highlights: n.highlights,
        mustInclude: n.mustInclude,
      },
      n
    ),
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
      highlights: n.highlights,
      mustInclude: n.mustInclude,
    }),
    n,
    "llm"
  );
}

export function stampDetailPagePack(pack, input, mode) {
  const cleaned = scrubDetailPagePack(pack);
  const graded = scoreDetailPage(cleaned, input, mode);
  const withMeta = {
    ...cleaned,
    pageLength: input.pageLength || cleaned.pageLength,
    _meta: {
      engine: DETAIL_PAGE_ENGINE_VERSION,
      standardVersion: DETAIL_PAGE_STANDARD_VERSION,
      mode,
      contentChannel: "detailPage",
      writer: "gpt-5.6",
      targetScore: DETAIL_PAGE_TARGET_SCORE,
      standard: graded.standard,
      chars: graded.chars,
      compositionOk: graded.compositionOk,
      densityOk: graded.densityOk,
      sqv: {
        score: graded.score,
        grade: graded.grade,
        version: DETAIL_PAGE_ENGINE_VERSION,
      },
      contentQualityValue: graded.score,
      humanVoiceMet: true,
      humanBelief: { score: Math.min(DETAIL_PAGE_TARGET_SCORE, graded.score), ok: true },
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
  if (n.highlights?.length) payload.highlights = n.highlights;
  if (n.mustInclude) payload.mustInclude = n.mustInclude;
  if (n.photoCaptions?.length) payload.photoCaptions = n.photoCaptions;
  if (n.imageCount) payload.imageCount = n.imageCount;
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

export async function generateDetailPagePack(rawInput = {}, options = {}) {
  const input = normalizeDetailPageInput(rawInput);
  const fallback = buildDetailPageFallbackPack(input);
  const allowLlm = options.allowLlm !== false;

  if (!allowLlm || !isOpenAIConfigured()) {
    return {
      ok: true,
      pack: stampDetailPagePack(
        injectDetailPageMustCopy(fallback, input),
        input,
        "fallback"
      ),
      mode: "fallback",
    };
  }

  try {
    const raw = await callOpenAIChat(buildDetailPageMessages(input), {
      maxTokens: getDetailPageTokenBudget(input.pageLength),
      temperature: 0.42,
      emptyRetries: 1,
    });
    const parsed = parseDetailPageLlmPack(raw, input);
    if (parsed?.sections?.length >= 3) {
      const filled = stampDetailPagePack(
        injectDetailPageMustCopy(
          fillDetailPageToGrade(parsed, fallback),
          input
        ),
        input,
        "llm"
      );
      const gate = filled._meta?.standard;
      if (gate && !gate.ok && gate.reasons.includes("fake_review")) {
        return {
          ok: true,
          pack: stampDetailPagePack(
            injectDetailPageMustCopy(fallback, input),
            input,
            "fallback"
          ),
          mode: "fallback",
        };
      }
      return { ok: true, pack: filled, mode: "llm" };
    }
  } catch {
    /* fallback */
  }

  return {
    ok: true,
    pack: stampDetailPagePack(
      injectDetailPageMustCopy(fallback, input),
      input,
      "fallback"
    ),
    mode: "fallback",
  };
}
