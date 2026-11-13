import SeoDiscoverabilityHero from "@/components/seo/SeoDiscoverabilityHero";
import PageJsonLdScript from "@/components/seo/PageJsonLdScript";
import HomeClientLoader from "@/components/home/HomeClientLoader";
import { buildTrendIndexJsonLd } from "@/lib/brand/seo";
import { getTrendCatalog } from "@/lib/trends/catalog";

/** 트렌드 카탈로그 시간 갱신에 맞춰 홈 HTML을 짧게 캐시 */
export const revalidate = 300;

export default async function HomePage({ searchParams }) {
  const trendCatalog = await getTrendCatalog();
  const params = await searchParams;
  const initialQuery = typeof params?.q === "string" ? params.q : "";
  const initialCategory = typeof params?.category === "string" ? params.category : "all";

  return (
    <>
      <SeoDiscoverabilityHero
        trendCatalog={trendCatalog}
        initialQuery={initialQuery}
        initialCategory={initialCategory}
      />
      <PageJsonLdScript graphs={[buildTrendIndexJsonLd(trendCatalog?.topItems || trendCatalog?.items || [])]} />
      <HomeClientLoader
        trendCatalog={trendCatalog}
        initialQuery={initialQuery}
        initialCategory={initialCategory}
      />
    </>
  );
}
