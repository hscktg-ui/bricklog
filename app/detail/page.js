import { buildLegalPageMetadata } from "@/lib/brand/seo";
import PublicDetailPageClient from "@/components/PublicDetailPageClient";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

export const metadata = buildLegalPageMetadata({
  title: DETAIL_PAGE_PRODUCT.metaTitle,
  description: DETAIL_PAGE_PRODUCT.metaDescription,
  path: "/detail",
  siteName: DETAIL_PAGE_PRODUCT.name,
});

export default function PublicDetailPage() {
  return <PublicDetailPageClient />;
}
