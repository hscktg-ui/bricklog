/**
 * 상세페이지 AI 핵심 — 컷별 상품 사진 생성.
 * 이미지 모델은 제품 연출컷만 그린다. 한글 상세페이지를 통째로 그리지 않는다.
 * 올린 사진이 있으면 그걸 먼저 쓴다. 가짜 모델·없는 인증·타사 로고는 그리지 않는다.
 */
import { generateChannelImage, getImageProviderStatus } from "@/lib/imageGeneration";
import { DETAIL_PAGE_PRODUCT_IDENTITY } from "@/lib/product/detailPageAssets";
import {
  DETAIL_PAGE_PHOTO_DIRECTION,
  normalizeDetailPagePhotos,
} from "@/lib/product/detailPagePhotos";

export const DETAIL_PAGE_SHOT_GEN_VERSION = "detail-shot-gen-v3";

const ROLE_BY_SLOT = Object.freeze({
  hero: "packshot",
  observe: "detail",
  feature: "detail",
  scene: "usage",
});

/** 붙이는 화면에 꼭 필요한 3컷. 디자이너 포토 시퀀스(백승우) 기준. */
export const DETAIL_PAGE_CORE_SHOTS = Object.freeze(["hero", "observe", "feature"]);

const RATIO_BY_SLOT = {
  hero: "4:5",
  observe: "1:1",
  feature: "16:9",
  intent: "4:5",
  explain: "16:9",
  scene: "16:9",
  usp: "1:1",
};

export function buildDetailPageShotPrompt(slot, input = {}) {
  const dir = DETAIL_PAGE_PHOTO_DIRECTION[slot] || {
    shot: "상품 사진",
    hint: "",
  };
  const product = String(input.productName || "상품").trim();
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const features = Array.isArray(input.features)
    ? input.features.slice(0, 3).join(", ")
    : String(input.features || "").replace(/\n+/g, ", ");
  const heroSpace =
    slot === "hero"
      ? "Product occupies the upper 58%. Keep the bottom 40% empty negative space for later HTML type. Do not put letters in that space."
      : "";
  return [
    "Photoreal catalog product photography. Not a webpage. Not a layout. Not a Korean detail page.",
    "Subject only: product + background + light + shadow + optional prop. Camera shot of the physical SKU.",
    `Product: ${product}${brand ? `, brand ${brand}` : ""}${region ? `, from ${region}` : ""}.`,
    features ? `Visible facts only: ${features}.` : "",
    `Camera shot: ${dir.shot}. ${dir.hint || ""}`.trim(),
    heroSpace,
    "Preserve product identity: exact shape, logo, label, color, material. No perspective redesign.",
    "ONE physical SKU only. Same bag material, same label layout, same brand mark, same product name, same weight.",
    "Do not invent a second packaging. Do not switch a sticker label to a printed bag.",
    "Catalog lighting, beige paper studio, sharp focus, no people, no fashion models, no hands.",
    "No Korean copy, no prices, no icons, no badges, no charts, no infographics, no UI, no collage.",
    "No invented certifications, no fake review stars, no other-brand logos, no text overlay, no watermark.",
    "Do not render unreadable Korean packaging claims. Keep the bag/pack simple and physical.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function listMissingDetailPageShots(existing = [], slots = DETAIL_PAGE_CORE_SHOTS) {
  const have = new Set(
    normalizeDetailPagePhotos(existing)
      .map((p) => p.slot)
      .filter(Boolean)
  );
  const sequential = normalizeDetailPagePhotos(existing).filter((p) => !p.slot);
  let seqUsed = 0;
  const missing = [];
  for (const slot of slots) {
    if (have.has(slot)) continue;
    if (seqUsed < sequential.length) {
      seqUsed += 1;
      continue;
    }
    missing.push(slot);
  }
  return missing;
}

function cloneSkuPhotos(donor, slots, extra = {}) {
  return slots.map((slot) => ({
    src: donor.src,
    caption: DETAIL_PAGE_PHOTO_DIRECTION[slot]?.shot || slot,
    slot,
    role: ROLE_BY_SLOT[slot] || "packshot",
    generated: extra.generated === true || donor.generated === true,
    clonedFrom: extra.clonedFrom || donor.slot || "hero",
    provider: extra.provider || donor.provider,
    model: extra.model || donor.model,
    identity: { ...DETAIL_PAGE_PRODUCT_IDENTITY },
  }));
}

export async function generateDetailPageShots(input = {}, options = {}) {
  const existing = normalizeDetailPagePhotos(options.photos || input.photos || []);
  if (options.allowImages === false) {
    return { ok: true, photos: existing, generated: [], skipped: "disabled" };
  }

  const slots = Array.isArray(options.slots) && options.slots.length
    ? options.slots
    : DETAIL_PAGE_CORE_SHOTS;
  const missing = listMissingDetailPageShots(existing, slots).slice(0, 3);
  if (!missing.length) {
    return { ok: true, photos: existing, generated: [], skipped: "filled" };
  }

  const donor = existing.find((p) => p.slot === "hero") || existing[0];
  if (donor?.src) {
    const cloned = cloneSkuPhotos(donor, missing);
    return {
      ok: true,
      photos: [...existing, ...cloned],
      generated: [],
      skipped: "same_sku",
    };
  }

  if (!getImageProviderStatus().any) {
    return { ok: true, photos: existing, generated: [], skipped: "no_provider" };
  }

  const primary = missing.includes("hero") ? "hero" : missing[0];
  try {
    const result = await generateChannelImage(buildDetailPageShotPrompt(primary, input), {
      ratio: RATIO_BY_SLOT[primary] || "4:5",
      provider: options.provider || "auto",
    });
    const generated = cloneSkuPhotos(
      { src: result.imageUrl, slot: primary },
      missing,
      {
        generated: true,
        clonedFrom: primary,
        provider: result.provider,
        model: result.model,
      }
    );
    return {
      ok: true,
      photos: [...existing, ...generated],
      generated,
      errors: [],
      skipped: "",
    };
  } catch (err) {
    return {
      ok: existing.length > 0,
      photos: existing,
      generated: [],
      errors: [String(err?.message || err || "fail")],
      skipped: "generate_failed",
    };
  }
}
