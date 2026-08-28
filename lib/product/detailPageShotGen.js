/**
 * 상세페이지 AI 핵심 — 컷별 상품 사진 생성.
 * 올린 사진이 있으면 그걸 먼저 쓴다. 가짜 모델·없는 인증·타사 로고는 그리지 않는다.
 */
import { generateChannelImage, getImageProviderStatus } from "@/lib/imageGeneration";
import {
  DETAIL_PAGE_PHOTO_DIRECTION,
  normalizeDetailPagePhotos,
} from "@/lib/product/detailPagePhotos";

export const DETAIL_PAGE_SHOT_GEN_VERSION = "detail-shot-gen-v1";

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

function shotPrompt(slot, input = {}) {
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
  return [
    "Photoreal commercial product photography for a Korean smartstore detail page.",
    `Product: ${product}${brand ? `, brand ${brand}` : ""}${region ? `, from ${region}` : ""}.`,
    features ? `Visible facts only: ${features}.` : "",
    `Camera shot: ${dir.shot}. ${dir.hint || ""}`.trim(),
    "Catalog lighting, beige paper studio, sharp focus, no people, no fashion models, no hands unless the shot is a close product detail.",
    "No invented certifications, no fake review stars, no other-brand logos, no text overlay, no watermark, no collage.",
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

export async function generateDetailPageShots(input = {}, options = {}) {
  const existing = normalizeDetailPagePhotos(options.photos || input.photos || []);
  if (options.allowImages === false) {
    return { ok: true, photos: existing, generated: [], skipped: "disabled" };
  }
  if (!getImageProviderStatus().any) {
    return { ok: true, photos: existing, generated: [], skipped: "no_provider" };
  }

  const slots = Array.isArray(options.slots) && options.slots.length
    ? options.slots
    : DETAIL_PAGE_CORE_SHOTS;
  const missing = listMissingDetailPageShots(existing, slots).slice(0, 3);
  if (!missing.length) {
    return { ok: true, photos: existing, generated: [], skipped: "filled" };
  }

  const generated = [];
  const errors = [];
  const results = await Promise.allSettled(
    missing.map(async (slot) => {
      const result = await generateChannelImage(shotPrompt(slot, input), {
        ratio: RATIO_BY_SLOT[slot] || "1:1",
        provider: options.provider || "auto",
      });
      return {
        src: result.imageUrl,
        caption: DETAIL_PAGE_PHOTO_DIRECTION[slot]?.shot || slot,
        slot,
        generated: true,
        provider: result.provider,
        model: result.model,
      };
    })
  );

  for (const item of results) {
    if (item.status === "fulfilled" && item.value?.src) {
      generated.push(item.value);
    } else if (item.status === "rejected") {
      errors.push(String(item.reason?.message || item.reason || "fail"));
    }
  }

  return {
    ok: generated.length > 0 || existing.length > 0,
    photos: [...existing, ...generated],
    generated,
    errors,
    skipped: generated.length ? "" : "generate_failed",
  };
}
