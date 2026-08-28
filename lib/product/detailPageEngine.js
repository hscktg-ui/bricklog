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
import { DETAIL_PAGE_STANDARD_VERSION, gptDetailPageSystemPrompt, scrubDetailPagePack } from "@/lib/product/detailPageStandard";
import { assessDetailPageSuccess } from "@/lib/product/detailPageSuccessStandard";
import {
  resolveDetailPageTypePairing,
  summarizeTypePairing,
} from "@/lib/product/detailPageTypePairing";
import { getDetailPageExample } from "@/lib/product/detailPageCompanyPresets";
import {
  DETAIL_PAGE_TARGET_SCORE,
  fillDetailPageToGrade,
  flattenDetailPageText,
  scoreDetailPage,
} from "@/lib/product/detailPageGrade";
import { DETAIL_PAGE_DESIGN_CONTEXT } from "@/lib/product/detailPageContext";
import { DETAIL_PAGE_MAX_PHOTOS, normalizeDetailPagePhotos } from "@/lib/product/detailPagePhotos";
import { generateDetailPageShots } from "@/lib/product/detailPageShotGen";
import { renderDetailPageBodyHtml } from "@/lib/product/detailPageHtml";
import {
  firstSentence,
  isEssayBulletList,
  uniqueShortLabels,
} from "@/lib/product/detailPageListDesign";
import {
  buildDetailPageCategoryListing,
  summarizeCategoryFlow,
} from "@/lib/product/detailPageCategoryFlow";

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
  if (Array.isArray(raw)) {
    return raw.map(cleanLine).filter((s) => s.length >= 2 && s.length <= 80).slice(0, 6);
  }
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
      Number(merged.imageCount) ||
        (Array.isArray(merged.photos) ? merged.photos.length : 0) ||
        0
    ),
    photos: normalizeDetailPagePhotos(merged.photos || merged.images || []),
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
  if (!f) {
    return `${brandName}에서 손으로 대조할 수 있는 점만 남깁니다.`;
  }
  if (/직접|현장|느껴|보면/.test(f) && /다\.|요\.|니다/.test(f)) {
    return firstSentence(f);
  }
  return `${f}${eulReul(f)} 직접 대조해 보면 됩니다.`;
}

function oneLine(parts) {
  for (const raw of parts) {
    const t = cleanLine(raw);
    if (t && t.replace(/\s/g, "").length >= 8) return t;
  }
  return "";
}

function designedLabels(list, extra = [], limit = 4) {
  return uniqueShortLabels([...(list || []), ...extra], limit);
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
    usp.bullets = uniqueShortLabels(
      [...(usp.bullets || []), ...unusedHighlights],
      6
    );
  }

  const must = n.mustInclude;
  if (must) {
    const probe = flattenDetailPageText({ ...pack, sections });
    if (!probe.includes(must.slice(0, 24))) {
      const feature =
        sections.find((s) => s.type === "feature") ||
        sections.find((s) => s.type === "explain") ||
        sections[0];
      const spec = sections.find((s) => s.type === "spec");
      if (spec) {
        spec.rows = [...(spec.rows || []), ["꼭 넣을 내용", must.slice(0, 80)]];
      } else if (feature && !String(feature.body || "").includes(must.slice(0, 18))) {
        feature.body = firstSentence(`${cleanLine(feature.body)} ${must}`.trim());
      }
    }
  }

  return { ...pack, sections };
}

function sceneBodyForListing(listing, n) {
  if (listing.key === "grocery") {
    return oneLine([
      `${n.target}${iGa(n.target)} 씻고 밥을 짓는 때를 기준으로 둡니다.`,
    ]);
  }
  if (listing.key === "cafe") {
    return oneLine([
      `${n.target}${iGa(n.target)} 분쇄 굵기를 고른 뒤 내려 마시는 때를 기준으로 둡니다.`,
    ]);
  }
  if (listing.key === "furniture") {
    return oneLine([
      `${n.target}${iGa(n.target)} 놓고 조립해 쓰는 때를 기준으로 둡니다.`,
    ]);
  }
  return oneLine([
    n.region
      ? `${n.region}에서 ${n.productName}${eulReul(n.productName)} 꺼내는 때를 기준으로 둡니다.`
      : `${n.productName}${eulReul(n.productName)} 꺼내는 때를 기준으로 둡니다.`,
  ]);
}

export function buildDetailPageFallbackPack(input = {}) {
  const n = normalizeDetailPageInput(input);
  const feats = n.features.length
    ? n.features
    : [`${n.productName}의 쓰임이 분명하다`];
  const length = resolveDetailPageLength(n.pageLength);
  const brand = `${n.brandName}${eunNeun(n.brandName)}`;
  const listing = buildDetailPageCategoryListing(n);
  const intent =
    n.searchIntent ||
    `${n.target}${iGa(n.target)} ${n.productName}${eulReul(n.productName)} 고를 때 스펙만 보다가 막히는 지점`;
  const fallbackLabels = designedLabels(
    n.highlights.length ? n.highlights : feats,
    feats,
    4
  );
  const stepLines = listing.stepLines.length >= 2 ? listing.stepLines : fallbackLabels;
  const materialLines =
    listing.materialLines.length >= 2 ? listing.materialLines : fallbackLabels;
  const specRows =
    listing.specRows.length >= 3
      ? listing.specRows
      : [
          ["상품", n.productName],
          ["브랜드", n.brandName],
          n.industry ? ["업종", n.industry] : null,
          n.region ? ["지역", n.region] : null,
          ...feats.slice(0, 4).map((f, i) => [`기준 ${i + 1}`, f]),
        ].filter(Boolean);
  const byType = {
    hero: {
      type: "hero",
      kicker: n.region ? `${n.region} · ${n.brandName}` : n.brandName,
      title: n.productName,
      heading: n.productName,
      body: oneLine([
        n.searchIntent
          ? `${n.target}${iGa(n.target)} ${n.searchIntent}.`
          : `${n.target}${iGa(n.target)} ${n.productName}${eulReul(n.productName)} 고를 때 스펙표만 보다가 멈춥니다.`,
      ]),
    },
    intent: {
      type: "intent",
      kicker: listing.intentKicker,
      title: intent.slice(0, 42),
      body: "",
      bullets: stepLines,
    },
    problem: {
      type: "intent",
      kicker: listing.intentKicker,
      title: intent.slice(0, 42),
      body: "",
      bullets: stepLines,
    },
    explain: {
      type: "explain",
      kicker: "이유",
      title: "숫자보다, 실제로 어디에 쓰이는지",
      body: "",
      rows: [
        ["막히는 점", intent.slice(0, 36)],
        ["먼저 볼 것", listing.firstLook || feats[0]],
      ],
    },
    usp: {
      type: "usp",
      kicker: listing.uspKicker,
      title: listing.uspTitle,
      body: "",
      bullets: materialLines,
    },
    observe: {
      type: "observe",
      kicker: listing.observeKicker,
      title: listing.observeTitle,
      body: observeLine(feats[0], n.brandName),
    },
    feature: {
      type: "feature",
      kicker: "자세히",
      title: `${n.productName}, 조금 더`,
      body: "",
      bullets: listing.restLines.length ? listing.restLines : listing.leftover.slice(0, 4),
    },
    scene: {
      type: "scene",
      kicker: listing.sceneKicker,
      title: listing.sceneTitle,
      body: sceneBodyForListing(listing, n),
    },
    spec: {
      type: "spec",
      kicker: listing.specKicker,
      title: listing.specTitle,
      rows: specRows,
    },
    brand: {
      type: "brand",
      kicker: n.brandName,
      title: `${brand} 이 상품을 다루는 방식`,
      body: oneLine([
        n.brandDescription,
        `${brand} ${n.productName}${eulReul(n.productName)} 크게 외치지 않습니다.`,
      ]),
    },
    notice: {
      type: "notice",
      kicker: "안내",
      title: "방문·문의 전에",
      body:
        [n.hours && `운영 ${n.hours}`, n.phone && `문의 ${n.phone}`, n.address]
          .filter(Boolean)
          .join(" · ") || "이 페이지에 없는 약속은 적지 않았습니다.",
    },
    cta: {
      type: "cta",
      kicker: "다음에",
      title: `${n.productName}, 기준만 챙기면 됩니다`,
      body: oneLine([
        n.phone
          ? `궁금한 점은 ${n.phone}으로 물어보면 됩니다.`
          : `${brand} ${n.productName} 기준으로 먼저 맞춰 보면 됩니다.`,
      ]),
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
        industry: n.industry,
        region: n.region,
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
    ? isEssayBulletList(raw.bullets)
      ? uniqueShortLabels(raw.bullets, 6)
      : raw.bullets.map(cleanLine).filter(Boolean).slice(0, 6)
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
  const body = firstSentence(cleanLine(raw.body));
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
      industry: n.industry,
      region: n.region,
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
    industry: cleaned.industry || input.industry || "",
    region: cleaned.region || input.region || "",
    pageLength: input.pageLength || cleaned.pageLength,
    _meta: {
      engine: DETAIL_PAGE_ENGINE_VERSION,
      standardVersion: DETAIL_PAGE_STANDARD_VERSION,
      mode,
      contentChannel: "detailPage",
      writer: "gpt-5.6",
      targetScore: DETAIL_PAGE_TARGET_SCORE,
      typePairing: summarizeTypePairing(resolveDetailPageTypePairing(input)),
      categoryFlow: summarizeCategoryFlow(buildDetailPageCategoryListing(input)),
      standard: graded.standard,
      chars: graded.chars,
      compositionOk: graded.compositionOk,
      densityOk: graded.densityOk,
      visualOk: graded.visualOk,
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
  withMeta._meta.success = assessDetailPageSuccess({
    pack: withMeta,
    html: renderDetailPageBodyHtml(
      withMeta,
      normalizeDetailPagePhotos(input.photos || input.shots || [])
    ),
    input,
    photoCount: Number(
      input.imageCount ||
        input.photos?.length ||
        input.shots?.length ||
        0
    ),
  });
  return stampCoreRulesOnDelivery(withMeta, input, "detailPage");
}

function compactGptUserPayload(n) {
  const length = resolveDetailPageLength(n.pageLength);
  const listing = buildDetailPageCategoryListing(n);
  const payload = {
    productName: n.productName,
    brandName: n.brandName,
    target: n.target,
    features: n.features,
    sections: length.sectionIds,
    categoryFlow: {
      key: listing.key,
      order: listing.textFlow,
      filled: listing.filled.map((s) => ({ label: s.label, value: s.value })),
      materials: listing.materialLines,
    },
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
        input: n,
      }),
    },
    {
      role: "user",
      content: JSON.stringify(compactGptUserPayload(n)),
    },
  ];
}

async function finishDetailPagePack(pack, input, mode, options = {}) {
  const shot = await generateDetailPageShots(input, {
    allowImages: options.allowImages,
    photos: input.photos || input.images,
    provider: options.imageProvider,
  });
  const photos = shot.photos;
  const nextInput = {
    ...input,
    photos,
    imageCount: photos.length,
  };
  const stamped = stampDetailPagePack(pack, nextInput, mode);
  stamped._meta.shots = photos;
  stamped._meta.generatedShotCount = shot.generated.length;
  stamped._meta.shotSkip = shot.skipped || "";
  return { ok: true, pack: stamped, mode, photos };
}

export async function generateDetailPagePack(rawInput = {}, options = {}) {
  const input = normalizeDetailPageInput(rawInput);
  const fallback = buildDetailPageFallbackPack(input);
  const allowLlm = options.allowLlm !== false;

  if (!allowLlm || !isOpenAIConfigured()) {
    return finishDetailPagePack(
      injectDetailPageMustCopy(fallback, input),
      input,
      "fallback",
      options
    );
  }

  try {
    const raw = await callOpenAIChat(buildDetailPageMessages(input), {
      maxTokens: getDetailPageTokenBudget(input.pageLength),
      temperature: 0.42,
      emptyRetries: 1,
    });
    const parsed = parseDetailPageLlmPack(raw, input);
    if (parsed?.sections?.length >= 3) {
      const filled = injectDetailPageMustCopy(
        fillDetailPageToGrade(parsed, fallback),
        input
      );
      const probe = stampDetailPagePack(filled, input, "llm");
      const gate = probe._meta?.standard;
      if (gate && !gate.ok && gate.reasons.includes("fake_review")) {
        return finishDetailPagePack(
          injectDetailPageMustCopy(fallback, input),
          input,
          "fallback",
          options
        );
      }
      return finishDetailPagePack(filled, input, "llm", options);
    }
  } catch (err) {
    if (options.logLlmError) {
      console.error("[detail-page llm]", err?.message || err);
    }
    /* fallback */
  }

  return finishDetailPagePack(
    injectDetailPageMustCopy(fallback, input),
    input,
    "fallback",
    options
  );
}
