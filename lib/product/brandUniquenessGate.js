/**
 * 브랜드 고유성 검사 — 브랜드명 치환 후에도 문장이 그대로면 실패
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { wordOverlapRatio } from "@/lib/content/duplicateKillerEngine";
import {
  MAX_BRAND_SWAP_IDENTITY_OVERLAP,
  MIN_BRAND_SENTENCE_RATIO,
} from "@/lib/product/topicProofThresholds";

const SWAP_BRANDS = ["로컬샘플상점", "테스트브랜드", "더건강하개"];
const CONCRETE_ANCHOR_RE =
  /\d+[\d,.]*\s*원|\d+\s*시|\d+\s*분|평일|주말|주소|층|호|메뉴|좌석|예약|입고|QR|주차|단체|알레르기/g;

function splitSentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 12);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function swapBrandInText(text, brand, replacement) {
  if (!brand) return text;
  const re = new RegExp(escapeRegExp(brand), "gi");
  return String(text).replace(re, replacement);
}

function stripBrandTokens(text = "", brands = []) {
  let next = String(text || "");
  for (const token of brands) {
    if (!token) continue;
    next = next.split(token).join("");
  }
  return next.replace(/\s+/g, " ").trim();
}

function countConcreteAnchors(text = "") {
  return (String(text || "").match(CONCRETE_ANCHOR_RE) || []).length;
}

function assessTemplateSentenceRatio(withBrand = [], brand = "") {
  if (!withBrand.length) return { templateRatio: 0, templateCount: 0 };

  let templateCount = 0;
  for (const sentence of withBrand) {
    const deBranded = stripBrandTokens(sentence, [brand]);
    let sentenceTemplate = false;
    for (const swap of SWAP_BRANDS) {
      if (!swap || swap === brand) continue;
      const swapped = swapBrandInText(sentence, brand, swap);
      const deSwapped = stripBrandTokens(swapped, [swap, brand]);
      if (
        deBranded.length >= 8 &&
        wordOverlapRatio(deBranded, deSwapped) >= MAX_BRAND_SWAP_IDENTITY_OVERLAP
      ) {
        sentenceTemplate = true;
        break;
      }
    }
    if (sentenceTemplate) templateCount += 1;
  }

  return {
    templateRatio: templateCount / withBrand.length,
    templateCount,
  };
}

/**
 * @param {object|null} pack
 * @param {Record<string, unknown>} input
 */
export function assessBrandUniqueness(pack, input = {}) {
  const brand = String(input.brandName || "").trim();
  const full = getBlogFullText(pack);
  if (!brand || !full) {
    return { ok: true, skipped: true, brandDensity: 0, swapOverlap: 0 };
  }

  const sentences = splitSentences(full);
  const withBrand = sentences.filter((s) => s.includes(brand));
  const brandDensity =
    sentences.length > 0 ? withBrand.length / sentences.length : 0;
  const { templateRatio, templateCount } = assessTemplateSentenceRatio(
    withBrand,
    brand
  );
  const concreteAnchors = countConcreteAnchors(full);
  const brandConcreteAnchors = withBrand.reduce(
    (sum, sentence) => sum + countConcreteAnchors(sentence),
    0
  );

  const reasons = [];
  if (brandDensity < MIN_BRAND_SENTENCE_RATIO) {
    reasons.push("brand_presence_low");
  }
  if (templateRatio >= 0.75 && brandConcreteAnchors < 2) {
    reasons.push("brand_swap_template");
  }
  if (templateRatio >= 0.9 && concreteAnchors < 3) {
    reasons.push("brand_generic_body");
  }

  return {
    ok: reasons.length === 0,
    brandDensity,
    templateRatio,
    templateCount,
    concreteAnchors,
    brandConcreteAnchors,
    swapOverlap: templateRatio,
    identityOverlap: templateRatio,
    reasons,
    swapSample: SWAP_BRANDS[0],
  };
}

export function assertBrandUniquenessPostWrite(pack, input = {}) {
  const assessment = assessBrandUniqueness(pack, input);
  if (assessment.skipped) {
    return { ok: true, skipped: true, assessment };
  }
  if (assessment.ok) {
    return { ok: true, assessment };
  }
  return {
    ok: false,
    stage: "brand_uniqueness",
    reasons: assessment.reasons,
    assessment,
    userMessage:
      "브랜드 고유 정보가 부족해 다시 다듬는 중입니다. 잠시 후 다시 받기를 눌러 주세요.",
    needsRegen: true,
  };
}
