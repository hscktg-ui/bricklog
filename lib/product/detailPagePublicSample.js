/**
 * 가입 전 맛보기 — 폴백 860 + 컷별 상품 사진. 로그인 없이 완성 화면.
 */
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

export function buildDetailPagePublicSample(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const resolved = resolveDetailPageSampleId(id);
  const example = getDetailPageExample(resolved);
  const pack = buildDetailPageFallbackPack(example || { presetId: DETAIL_PAGE_PUBLIC_SAMPLE_ID });
  const shots = detailPageSampleShots(resolved);
  const html = renderDetailPageBodyHtml(pack, shots);
  const documentHtml = wrapMallHtml(html, pack, "smartstore");
  const success = assessDetailPageSuccess({
    pack,
    html,
    photoCount: shots.length,
    input: example || {},
  });
  const compete = assessDetailPageCompeteWins({ html, wrapHtml: documentHtml });
  return {
    id: example?.id || DETAIL_PAGE_PUBLIC_SAMPLE_ID,
    label: example?.label || "포장 쌀",
    productName: pack.productName,
    brandName: pack.brandName,
    caption: `${example?.label || "포장 쌀"} 맛보기 · 컷별 상품 사진까지 붙인 860 화면`,
    pack,
    html,
    documentHtml,
    shots,
    success,
    compete,
  };
}
