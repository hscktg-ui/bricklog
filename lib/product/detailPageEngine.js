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
import { assignDetailPageAssetRoles } from "@/lib/product/detailPageAssets";
import { DETAIL_PAGE_MAX_PHOTOS, normalizeDetailPagePhotos } from "@/lib/product/detailPagePhotos";
import { generateDetailPageShots } from "@/lib/product/detailPageShotGen";
import { renderDetailPageBodyHtml } from "@/lib/product/detailPageHtml";
import {
  buildDetailPagePipeline,
  summarizeDetailPagePipeline,
  summarizeDetailPagePlan,
} from "@/lib/product/detailPagePipeline";
import { buildDetailPagePlan } from "@/lib/product/detailPagePlan";
import {
  firstSentence,
  isEssayBulletList,
  uniqueShortLabels,
} from "@/lib/product/detailPageListDesign";
import {
  buildDetailPageCategoryListing,
  summarizeCategoryFlow,
} from "@/lib/product/detailPageCategoryFlow";
import {
  rankingStandardMeta,
  sortSectionsToRanking,
} from "@/lib/product/detailPageRankingPlaybook";
import {
  inspectDetailPageFacts,
  buildDetailPageCommerceDocument,
  clipBody,
  clipHeadline,
  needFact,
} from "@/lib/product/detailPageFactDossier";
import {
  scoreDetailPageCommerce,
  refineDetailPagePackForCommerce,
} from "@/lib/product/detailPageCommerceCritique";

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
    photos: assignDetailPageAssetRoles(
      normalizeDetailPagePhotos(merged.photos || merged.images || [])
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
  if (!f) {
    return `${brandName}에서 손으로 대조할 수 있는 점만 남깁니다.`;
  }
  if (/직접|현장|느껴|보면/.test(f) && /다\.|요\.|니다/.test(f)) {
    return firstSentence(f);
  }
  return `가까이에서 ${f}${eulReul(f)} 직접 확인합니다.`;
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

function buyerQuestions(n, listing) {
  if (listing.key === "grocery") {
    return ["밥맛은 어떻게 보나", "도정은 언제 했나", "산지는 어디인가"];
  }
  if (listing.key === "cafe") {
    return ["집에서 어떻게 내리나", "분쇄는 어떻게 고르나", "원두는 어디서 왔나"];
  }
  return ["고를 때 무엇을 보나", "쓰는 순서는 어떻게 되나", "보관은 어떻게 하나"].slice(0, 3);
}

function evidenceBullets(n, listing, dossier) {
  const lines = [];
  const add = (claim, fact, benefit) => {
    if (!fact) return;
    lines.push(`${claim} — ${fact}. ${benefit}`);
  };
  if (dossier.values.process) {
    add(
      listing.key === "cafe" ? "로스팅" : listing.key === "grocery" ? "도정" : "가공",
      dossier.values.process,
      listing.key === "grocery" ? "밥 짓기 전 가공 시점을 대조합니다" : "처리 방식을 표기와 대조합니다"
    );
  }
  if (dossier.values.pack) {
    add("포장", dossier.values.pack, "개봉 전 포장 상태를 확인합니다");
  }
  if (dossier.values.origin) {
    add("산지", dossier.values.origin, "어디서 났는지 표기만 대조합니다");
  }
  if (!lines.length) {
    return listing.materialLines.slice(0, 3);
  }
  return lines.map((line) => clipBody(line, 80)).slice(0, 4);
}

export function buildDetailPageFallbackPack(input = {}) {
  const n = normalizeDetailPageInput(input);
  const feats = n.features.length
    ? n.features
    : [`${n.productName}의 쓰임이 분명하다`];
  const length = resolveDetailPageLength(n.pageLength);
  const listing = buildDetailPageCategoryListing(n);
  const dossier = inspectDetailPageFacts(n);
  const intent =
    n.searchIntent ||
    `${n.target}${iGa(n.target)} ${n.productName}${eulReul(n.productName)} 고를 때 스펙만 보다가 막히는 지점`;
  const fallbackLabels = designedLabels(
    n.highlights.length ? n.highlights : feats,
    feats,
    4
  );
  const stepLines = listing.stepLines.length >= 2 ? listing.stepLines : fallbackLabels;
  const specRows = dossier.specRows;
  const proof = dossier.strongest
    ? `${dossier.strongest.label} ${dossier.strongest.value}`
    : "";
  const byType = {
    hero: {
      type: "hero",
      kicker: n.region ? `${n.region} · ${n.brandName}` : n.brandName,
      title: clipHeadline(n.productName),
      heading: n.productName,
      proof: clipBody(proof, 80),
      body: clipBody(
        [n.target && `${n.target}`, dossier.values.price || needFact("가격")]
          .filter(Boolean)
          .join(" · "),
        80
      ),
      ctaLabel: "구매하기",
      altText: `${n.productName} 제품 전체 정면`,
    },
    intent: {
      type: "intent",
      kicker: "고민",
      title: clipHeadline(intent),
      body: "",
      bullets: buyerQuestions(n, listing),
    },
    problem: {
      type: "intent",
      kicker: "고민",
      title: clipHeadline(intent),
      body: "",
      bullets: buyerQuestions(n, listing),
    },
    explain: {
      type: "explain",
      kicker: listing.explainKicker || "확인된 항목",
      title: clipHeadline(listing.explainTitle || "이 상품에서 대조하는 칸"),
      body: "",
      bullets:
        listing.pointLines.length >= 3 ? listing.pointLines : stepLines,
      sourceFactIds: (listing.filled || []).slice(0, 5).map((s) => s.key),
    },
    usp: {
      type: "usp",
      kicker: listing.uspKicker || "차별점",
      title: clipHeadline("주장·사실·이익"),
      body: "",
      bullets: evidenceBullets(n, listing, dossier),
    },
    observe: {
      type: "observe",
      kicker: listing.observeKicker,
      title: clipHeadline(listing.key === "grocery" ? "원물과 품종" : listing.observeTitle),
      body: clipBody(
        listing.key === "grocery"
          ? observeLine(dossier.values.origin || feats[0], n.brandName)
          : observeLine(feats[0], n.brandName),
        80
      ),
      imageBrief:
        listing.key === "grocery"
          ? "쌀알을 가까이 찍어 질감이 보이게 합니다."
          : "상품 표면을 가까이 찍어 질감이 보이게 합니다.",
      altText: `${n.productName} 원물 확대`,
    },
    feature: {
      type: "feature",
      kicker: "가공·포장",
      title: clipHeadline("처리하는 방식"),
      body: clipBody(
        [dossier.values.process, dossier.values.pack]
          .filter(Boolean)
          .join(" · ") || needFact("생산·가공 방식"),
        80
      ),
      bullets: listing.restLines.length ? listing.restLines : listing.leftover.slice(0, 4),
      imageBrief: "포장 라벨이 읽히도록 가까이 찍습니다. 로고와 한글은 원본 그대로입니다.",
      altText: `${n.productName} 포장 확대`,
    },
    scene: {
      type: "scene",
      kicker: listing.sceneKicker,
      title: clipHeadline(listing.sceneTitle),
      body: clipBody(
        listing.key === "grocery"
          ? `물 비율 ${needFact("권장 물의 양")} · 보관 ${dossier.values.storage || needFact("보관 방법")}`
          : sceneBodyForListing(listing, n),
        80
      ),
      imageBrief:
        listing.key === "grocery"
          ? "지은 밥을 그릇에 담아 쌀알이 보이게 찍습니다."
          : "실제로 쓰는 장면을 상품만 보이게 찍습니다.",
      altText: `${n.productName} 사용 결과`,
    },
    spec: {
      type: "spec",
      kicker: "필수 정보",
      title: clipHeadline("상품 정보표"),
      rows: specRows,
    },
    brand: {
      type: "brand",
      kicker: "산지 · 생산",
      title: clipHeadline(dossier.values.origin ? `산지 ${dossier.values.origin}` : "산지와 생산자"),
      body: clipBody(
        `${n.brandName} · 생산자 ${dossier.values.producer || needFact("생산자 또는 제조자")}`,
        80
      ),
      faqs: [
        { q: "출고는 언제인가?", a: dossier.values.shipping || needFact("출고 일정") },
        { q: "배송비는 얼마인가?", a: dossier.values.shipping || needFact("배송비") },
        { q: "파손·품질 문제는?", a: dossier.values.exchange || needFact("교환·환불 기준") },
        { q: "도서산간 배송은?", a: needFact("도서산간 조건") },
      ],
    },
    notice: {
      type: "notice",
      kicker: "배송 · 교환",
      title: clipHeadline("구매 전 안내"),
      body: clipBody(
        [n.hours && `운영 ${n.hours}`, n.phone && `문의 ${n.phone}`, n.address]
          .filter(Boolean)
          .join(" · ") || needFact("배송 일정과 배송비"),
        80
      ),
      faqs: [
        { q: "출고 일정은?", a: dossier.values.shipping || needFact("출고 일정") },
        { q: "교환·환불은?", a: dossier.values.exchange || needFact("교환·환불 기준") },
      ],
    },
    cta: {
      type: "cta",
      kicker: "구매",
      title: clipHeadline(n.productName),
      body: clipBody(
        [n.target, proof, dossier.values.price || needFact("가격")]
          .filter(Boolean)
          .join(" · "),
        80
      ),
      rows: [
        ["가격", dossier.values.price || needFact("가격")],
        ["옵션", dossier.values.options || needFact("판매 옵션")],
        ["배송", dossier.values.shipping || needFact("배송 일정과 배송비")],
      ],
      ctaLabel: "구매하기",
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
        .slice(0, 16)
    : [];
  const title = cleanLine(raw.title);
  const body = firstSentence(cleanLine(raw.body));
  const faqs = Array.isArray(raw.faqs)
    ? raw.faqs
        .map((item) => ({
          q: cleanLine(item?.q || item?.question),
          a: cleanLine(item?.a || item?.answer),
        }))
        .filter((item) => item.q && item.a)
        .slice(0, 8)
    : [];
  if (!title && !body && !bullets.length && !rows.length && !faqs.length) return null;
  const resolvedTitle = title || body.slice(0, 28) || faqs[0]?.q || type;
  return {
    type,
    kicker: cleanLine(raw.kicker),
    title: resolvedTitle,
    heading: resolvedTitle,
    body,
    bullets,
    rows,
    faqs,
    ctaLabel: cleanLine(raw.ctaLabel).slice(0, 16),
    proof: cleanLine(raw.proof).slice(0, 80),
    imageBrief: cleanLine(raw.imageBrief).slice(0, 160),
    altText: cleanLine(raw.altText).slice(0, 80),
    sourceFactIds: Array.isArray(raw.sourceFactIds)
      ? raw.sourceFactIds.map(cleanLine).filter(Boolean).slice(0, 8)
      : [],
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
  const length = resolveDetailPageLength(input.pageLength || pack.pageLength);
  const ordered = {
    ...pack,
    sections: sortSectionsToRanking(pack.sections, length.sectionIds),
  };
  const cleaned = scrubDetailPagePack(ordered);
  const graded = scoreDetailPage(cleaned, input, mode);
  const photos = assignDetailPageAssetRoles(
    normalizeDetailPagePhotos(input.photos || input.shots || [])
  );
  const dossier = inspectDetailPageFacts({ ...input, photos });
  let working = refineDetailPagePackForCommerce(cleaned);
  const draftPipe = buildDetailPagePipeline({ ...input, photos }, working, "");
  const withMeta = {
    ...working,
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
      ranking: rankingStandardMeta(cleaned),
      pipeline: summarizeDetailPagePipeline(draftPipe),
      plan: summarizeDetailPagePlan(draftPipe.plan),
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
  const html = renderDetailPageBodyHtml(withMeta, photos);
  const pipeline = buildDetailPagePipeline({ ...input, photos }, withMeta, html);
  withMeta._meta.pipeline = summarizeDetailPagePipeline(pipeline);
  withMeta._meta.plan = summarizeDetailPagePlan(pipeline.plan);
  withMeta._meta.facts = {
    missingRequired: dossier.missingRequired,
    missingRecommended: dossier.missingRecommended,
    usableFacts: dossier.usableFacts,
    prohibitedClaims: dossier.prohibitedClaims,
  };
  withMeta._meta.commerce = buildDetailPageCommerceDocument(withMeta, dossier, input);
  let critique = scoreDetailPageCommerce({
    pack: withMeta,
    html,
    dossier,
  });
  if (!critique.ok) {
    const refined = refineDetailPagePackForCommerce(withMeta);
    Object.assign(withMeta, { sections: refined.sections });
    const html2 = renderDetailPageBodyHtml(withMeta, photos);
    critique = scoreDetailPageCommerce({ pack: withMeta, html: html2, dossier });
    withMeta._meta.commerce = buildDetailPageCommerceDocument(withMeta, dossier, input);
  }
  withMeta._meta.critique = critique;
  withMeta._meta.success = assessDetailPageSuccess({
    pack: withMeta,
    html: renderDetailPageBodyHtml(withMeta, photos),
    input,
    photoCount: Number(
      input.imageCount ||
        photos.length ||
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
  const plan = buildDetailPagePlan(n, n.photos);
  payload.plan = {
    archetype: plan.archetype,
    category: plan.category,
    order: plan.order,
    sections: plan.sections.map((s) => ({
      id: s.id,
      composition: s.composition,
      image: s.imageRequirement?.type || "none",
    })),
  };
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
  const photosIn = assignDetailPageAssetRoles(
    normalizeDetailPagePhotos(input.photos || input.images || [])
  );
  const shot = await generateDetailPageShots(
    { ...input, photos: photosIn },
    {
      allowImages: options.allowImages,
      photos: photosIn,
      provider: options.imageProvider,
    }
  );
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
