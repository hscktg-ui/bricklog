/**
 * 가입 전 맛보기 — 포장 쌀 폴백 860. AI 이미지 없음. 로그인 없이 화면만.
 */
import { getDetailPageExample } from "@/lib/product/detailPageCompanyPresets";
import { buildDetailPageFallbackPack } from "@/lib/product/detailPageEngine";
import { renderDetailPageBodyHtml, wrapMallHtml } from "@/lib/product/detailPageHtml";
import { assessDetailPageCompeteWins } from "@/lib/product/detailPageCompeteWins";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { assessDetailPageSuccess } from "@/lib/product/detailPageSuccessStandard";

export const DETAIL_PAGE_PUBLIC_SAMPLE_ID = "open-rice";
export const DETAIL_PAGE_PUBLIC_SAMPLE_PATH = DETAIL_PAGE_PRODUCT.samplePath;

export function buildDetailPagePublicSample(id = DETAIL_PAGE_PUBLIC_SAMPLE_ID) {
  const example = getDetailPageExample(id);
  const pack = buildDetailPageFallbackPack(example || { presetId: DETAIL_PAGE_PUBLIC_SAMPLE_ID });
  const html = renderDetailPageBodyHtml(pack, []);
  const documentHtml = wrapMallHtml(html, pack, "smartstore");
  const success = assessDetailPageSuccess({
    pack,
    html,
    photoCount: 0,
    input: example || {},
  });
  const compete = assessDetailPageCompeteWins({ html, wrapHtml: documentHtml });
  return {
    id: example?.id || DETAIL_PAGE_PUBLIC_SAMPLE_ID,
    label: example?.label || "포장 쌀",
    productName: pack.productName,
    brandName: pack.brandName,
    caption: `${example?.label || "포장 쌀"} 맛보기 · 사진 칸은 비어 있습니다. AI 이미지는 쓰지 않습니다.`,
    pack,
    html,
    documentHtml,
    success,
    compete,
  };
}
