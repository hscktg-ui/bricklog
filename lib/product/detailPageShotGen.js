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
import { buildDetailPageImageBrief } from "@/lib/product/detailPageImageBrief";

export const DETAIL_PAGE_SHOT_GEN_VERSION = "detail-shot-gen-v4";

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
  const brief = buildDetailPageImageBrief(slot, input);
  const ko = brief?.prompt;
  const heroSpace =
    slot === "hero"
      ? "Product occupies the upper 58%. Keep the bottom 40% empty negative space for later HTML type. Do not put letters in that space."
      : "";
  return [
    ko,
    "Photoreal catalog product photography. Not a webpage. Not a layout. Not a Korean detail page.",
    heroSpace,
    "Preserve product identity: exact shape, logo, label, color, material. No perspective redesign.",
    "Do not copy the same packshot into another slot. Each slot is a different subject.",
    "No Korean copy, no prices, no icons, no people, no fashion models, no invented certifications, no text overlay.",
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

function shotPhoto(slot, src, extra = {}) {
  const brief = buildDetailPageImageBrief(slot, extra.input || {});
  return {
    src,
    caption: brief?.purpose || DETAIL_PAGE_PHOTO_DIRECTION[slot]?.shot || slot,
    slot,
    role: brief?.role || ROLE_BY_SLOT[slot] || "packshot",
    generated: extra.generated === true,
    provider: extra.provider,
    model: extra.model,
    identity: { ...DETAIL_PAGE_PRODUCT_IDENTITY },
    brief,
  };
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

  if (existing.length && options.generateMissing !== true) {
    return {
      ok: true,
      photos: existing,
      generated: [],
      skipped: "no_repeat",
    };
  }

  if (!getImageProviderStatus().any) {
    return {
      ok: true,
      photos: existing,
      generated: [],
      skipped: existing.length ? "no_repeat" : "no_provider",
    };
  }

  const generated = [];
  const errors = [];
  for (const slot of missing) {
    try {
      const result = await generateChannelImage(buildDetailPageShotPrompt(slot, input), {
        ratio: RATIO_BY_SLOT[slot] || "4:5",
        provider: options.provider || "auto",
      });
      generated.push(
        shotPhoto(slot, result.imageUrl, {
          generated: true,
          provider: result.provider,
          model: result.model,
          input,
        })
      );
    } catch (err) {
      errors.push(String(err?.message || err || "fail"));
    }
  }
  return {
    ok: existing.length > 0 || generated.length > 0,
    photos: [...existing, ...generated],
    generated,
    errors,
    skipped: generated.length ? "" : "generate_failed",
  };
}
