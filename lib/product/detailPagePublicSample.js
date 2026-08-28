/**
 * 가입 전 맛보기 — 폴백 860 + 컷별 상품 사진. 출고물은 페이지 이미지.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getDetailPageExample,
  resolveDetailPageSampleId,
} from "@/lib/product/detailPageCompanyPresets";
import { buildDetailPageFallbackPack } from "@/lib/product/detailPageEngine";
import { renderDetailPageBodyHtml, wrapMallHtml } from "@/lib/product/detailPageHtml";
import { assessDetailPageCompeteWins } from "@/lib/product/detailPageCompeteWins";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { assessDetailPageSuccess } from "@/lib/product/detailPageSuccessStandard";
import { DETAIL_PAGE_CORE_SHOTS } from "@/lib/product/detailPageShotGen";

export const DETAIL_PAGE_PUBLIC_SAMPLE_ID = "open-rice";
export const DETAIL_PAGE_PUBLIC_SAMPLE_PATH = DETAIL_PAGE_PRODUCT.samplePath;

export function detailPageSampleShots(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  return DETAIL_PAGE_CORE_SHOTS.map((slot) => ({
    src: `/detail-sample/${resolved}-${slot}.png`,
    caption:
      slot === "hero" ? "포장 앞면" : slot === "observe" ? "손에 쥐거나 가까이" : "디테일 한 점",
    slot,
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

export function buildDetailPagePublicSample(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  const example = getDetailPageExample(resolved);
  const pack = buildDetailPageFallbackPack(example || { presetId: DETAIL_PAGE_PUBLIC_SAMPLE_ID });
  const shots = detailPageSampleShots(resolved);
  const html = renderDetailPageBodyHtml(pack, shots);
  const documentHtml = wrapMallHtml(html, pack, "smartstore");
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
  return {
    id: example?.id || DETAIL_PAGE_PUBLIC_SAMPLE_ID,
    label: example?.label || "포장 쌀",
    productName: pack.productName,
    brandName: pack.brandName,
    caption: `${example?.label || "포장 쌀"} 맛보기 · 상세 디자이너가 본 860 이미지`,
    pack,
    html,
    documentHtml,
    shots,
    screenshots,
    pageImage: {
      hero: `/detail-sample/${resolved}-page-hero.png`,
      mid: `/detail-sample/${resolved}-page-mid.png`,
      full: `/detail-sample/${resolved}-page-full.png`,
    },
    success,
    compete,
  };
}
