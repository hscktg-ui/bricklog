/**
 * 가입 전 맛보기 — 폴백 860 HTML. 제목·표·FAQ·CTA는 DOM 텍스트.
 * 몰 붙여넣기용 섹션 PNG는 mallStackHtml 선택 출고.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  getDetailPageExample,
  resolveDetailPageSampleId,
} from "@/lib/product/detailPageCompanyPresets";
import { buildDetailPageFallbackPack } from "@/lib/product/detailPageEngine";
import { wrapDetailPageImageStackHtml } from "@/lib/product/detailPageHtml";
import {
  renderDetailPageFromCanvas,
  wrapCanvasDocument,
} from "@/lib/product/detailPageCanvasRenderer";
import { assessDetailPageCompeteWins } from "@/lib/product/detailPageCompeteWins";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { assessDetailPageSuccess } from "@/lib/product/detailPageSuccessStandard";

export const DETAIL_PAGE_PUBLIC_SAMPLE_ID = "open-rice";
export const DETAIL_PAGE_PUBLIC_SAMPLE_PATH = DETAIL_PAGE_PRODUCT.samplePath;

export function detailPageSampleShots(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  const dir = join(process.cwd(), "public", "detail-sample");
  const extra =
    resolved === "open-rice"
      ? [
          { slot: "observe", file: "open-rice-canvas-macro.png", role: "grain" },
          { slot: "scene", file: "open-rice-canvas-meal.png", role: "cooked" },
          { file: "open-rice-canvas-field.png", role: "origin" },
          { file: "open-rice-canvas-mill.png", role: "mill" },
          { file: "open-rice-canvas-cook.png", role: "cook" },
          { file: "open-rice-canvas-table.png", role: "table" },
          { file: "open-rice-canvas-finale.png", role: "finale" },
        ]
      : [
          { slot: "observe", file: "open-beans-canvas-macro.png", role: "bean" },
          { slot: "scene", file: "open-beans-canvas-pour.png", role: "brew" },
          { file: "open-beans-canvas-table.png", role: "table" },
        ];
  const slots = [
    { slot: "hero", file: `${resolved}-hero.png`, role: "packshot" },
    { slot: "feature", file: `${resolved}-observe.png`, role: "label" },
    ...extra,
  ];
  return slots
    .filter((item) => existsSync(join(dir, item.file)))
    .map((item) => ({
      src: `/detail-sample/${item.file}`,
      caption: "",
      slot: item.slot,
      role: item.role,
      generated: true,
    }));
}

export function detailPageSamplePageScreenshots(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  const dir = join(process.cwd(), "public", "detail-sample");
  const hero = join(dir, `${resolved}-page-hero.png`);
  const mid = join(dir, `${resolved}-page-mid.png`);
  const full = join(dir, `${resolved}-page-full.png`);
  if (!existsSync(hero)) return null;
  return {
    hero: readFileSync(hero),
    mid: existsSync(mid) ? readFileSync(mid) : undefined,
    full: existsSync(full) ? readFileSync(full) : undefined,
  };
}

export function detailPageSampleImageStack(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  const dir = join(process.cwd(), "public", "detail-sample");
  const manifest = join(dir, `${resolved}-stack.json`);
  if (existsSync(manifest)) {
    try {
      const data = JSON.parse(readFileSync(manifest, "utf8"));
      const images = (data.images || [])
        .map((file) => {
          const name = basename(String(file || ""));
          if (!name || !existsSync(join(dir, name))) return null;
          return `/detail-sample/${name}`;
        })
        .filter(Boolean);
      if (images.length) return images;
    } catch {
      /* fall through */
    }
  }
  const full = `${resolved}-page-full.png`;
  if (existsSync(join(dir, full))) return [`/detail-sample/${full}`];
  return [];
}

export function buildDetailPagePublicSample(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  const example = getDetailPageExample(resolved);
  const shots = detailPageSampleShots(resolved);
  const draft = buildDetailPageFallbackPack({
    ...(example || { presetId: DETAIL_PAGE_PUBLIC_SAMPLE_ID }),
    photos: shots,
  });
  const painted = renderDetailPageFromCanvas(draft, shots);
  const pack = painted.pack;
  const html = painted.html;
  const stack = detailPageSampleImageStack(resolved).map((src, i) => ({
    src,
    alt: `${pack.productName || "상품"} ${i + 1}`,
  }));
  const documentHtml = wrapCanvasDocument(html, pack, "smartstore");
  const mallStackHtml = wrapDetailPageImageStackHtml(stack, pack, "smartstore");
  const screenshots = detailPageSamplePageScreenshots(resolved);
  const success = assessDetailPageSuccess({
    pack,
    html,
    photoCount: shots.length,
    input: example || {},
    screenshots: screenshots || undefined,
    requirePageImage: true,
  });
  const compete = assessDetailPageCompeteWins({ html, wrapHtml: documentHtml });
  pack._meta = {
    ...(pack._meta || {}),
    success,
    mdPanel: success.mdPanel,
    canvas: painted.story?.meta,
    canvasQuality: painted.quality,
    renderer: "detail-canvas",
  };
  return {
    id: example?.id || DETAIL_PAGE_PUBLIC_SAMPLE_ID,
    label: example?.label || "포장 쌀",
    productName: pack.productName,
    brandName: pack.brandName,
    caption: `${example?.label || "포장 쌀"} 맛보기 · 네이버 쇼핑 랭킹 리듬 · 리스트 샘플 이미지`,
    pack,
    html,
    documentHtml,
    mallStackHtml,
    shots,
    screenshots,
    imageStack: stack,
    pageImage: {
      hero: `/detail-sample/${resolved}-page-hero.png`,
      mid: `/detail-sample/${resolved}-page-mid.png`,
      full: `/detail-sample/${resolved}-page-full.png`,
    },
    success,
    compete,
  };
}
