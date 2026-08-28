/**
 * 브릭로그 상세는 Planned Generation.
 * 이미지 생성 AI는 파이프라인 가운데 한 역할이다. 한글 상세페이지를 통째로 그리지 않는다.
 *
 * 1 intelligence → 2 strategy/plan → 3 art → 4 image director
 * → 5 product photo (only) → 6 copy → 7 layout grammar → 8 HTML renderer → 9 critic
 */
import { assignDetailPageAssetRoles } from "@/lib/product/detailPageAssets";
import { buildDetailPagePlan } from "@/lib/product/detailPagePlan";
import { resolveDetailPageTypePairing } from "@/lib/product/detailPageTypePairing";
import { DETAIL_PAGE_DEFAULT_ACCENT } from "@/lib/product/detailPageCatalog";

export const DETAIL_PAGE_PIPELINE_VERSION = "detail-pipeline-v1";

export const DETAIL_PAGE_PIPELINE_STAGES = Object.freeze([
  "intelligence",
  "plan",
  "art",
  "imageDirector",
  "productPhoto",
  "copy",
  "layout",
  "render",
  "critic",
]);

export function buildDetailPageArtDirection(input = {}) {
  const pairing = resolveDetailPageTypePairing(input);
  return {
    conceptName: pairing.label || pairing.id,
    palette: {
      accent: input.accent || DETAIL_PAGE_DEFAULT_ACCENT,
    },
    typography: {
      displayKo: pairing.displayKo,
      displayEn: pairing.displayEn,
      bodyKo: pairing.bodyKo,
      bodyEn: pairing.bodyEn,
    },
    imagery: {
      photographyStyle: "catalog product only",
      koreanCopyInPhoto: false,
    },
  };
}

export function assessDetailPageSmell(args = {}) {
  const html = String(args.html || "");
  const plan = args.plan || {};
  const problems = [];
  if (html.includes("지금 바로 구매") || html.includes("실구매")) {
    problems.push("fake_cta_or_review");
  }
  if (/data-section="hero"[\s\S]*data-section="hero"/.test(html)) {
    problems.push("repeat_hero");
  }
  if (plan?.sections?.some((s) => s.imageRequirement?.type === "generated_model")) {
    problems.push("fake_model");
  }
  if (html.includes('data-korean-in-image="1"')) {
    problems.push("korean_baked_in_photo");
  }
  const oneshot = args.oneShot === true;
  if (oneshot) problems.push("one_shot_page_image");
  return {
    ok: problems.length === 0,
    aiGeneratedFeel: oneshot ? 80 : 12,
    problems,
  };
}

export function summarizeDetailPagePlan(plan = {}) {
  return {
    version: plan.version || "",
    ok: plan.ok === true,
    archetype: plan.archetype || "",
    category: plan.category || "",
    sections: (plan.sections || []).map((s) => ({
      id: s.id,
      composition: s.composition,
      image: s.imageRequirement?.type || s.image || "none",
    })),
  };
}

export function summarizeDetailPagePipeline(pipeline = {}) {
  return {
    version: pipeline.version || DETAIL_PAGE_PIPELINE_VERSION,
    ok: pipeline.ok === true,
    oneShot: pipeline.oneShot === true,
    koreanOnPageNotInPhoto: pipeline.koreanOnPageNotInPhoto !== false,
    imageGenStage: pipeline.imageGenStage || 5,
    stages: pipeline.stages || DETAIL_PAGE_PIPELINE_STAGES,
    archetype: pipeline.plan?.archetype || pipeline.archetype || "",
    smell: pipeline.smell || { ok: true, aiGeneratedFeel: 12, problems: [] },
  };
}

export function buildDetailPagePipeline(input = {}, pack = {}, html = "") {
  const assets = assignDetailPageAssetRoles(input.photos || input.images || []);
  const plan = buildDetailPagePlan(input, assets);
  const art = buildDetailPageArtDirection(input);
  const smell = assessDetailPageSmell({ html, plan, pack, oneShot: false });
  return {
    version: DETAIL_PAGE_PIPELINE_VERSION,
    ok: plan.ok && smell.ok,
    oneShot: false,
    koreanOnPageNotInPhoto: true,
    imageGenStage: 5,
    stages: DETAIL_PAGE_PIPELINE_STAGES,
    assets: assets.map((a) => ({ role: a.role, slot: a.slot })),
    plan,
    art,
    smell,
  };
}
