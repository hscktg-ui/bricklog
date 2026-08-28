import { BRAND_META_TITLE } from "@/lib/brand/copy";
import { buildLegalPageMetadata } from "@/lib/brand/seo";
import PublicDetailPageClient from "@/components/PublicDetailPageClient";

export const metadata = buildLegalPageMetadata({
  title: `상품 상세페이지 만들기 · ${BRAND_META_TITLE}`,
  description:
    "가입 없이 상품명과 특징만 넣으면 스마트스토어·쿠팡용 860px 상세페이지 HTML이 나갑니다. 가짜 후기 없이 고르는 기준부터 씁니다.",
  path: "/detail",
});

export default function PublicDetailPage() {
  return <PublicDetailPageClient />;
}
