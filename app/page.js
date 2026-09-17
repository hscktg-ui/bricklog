import SeoDiscoverabilityHero from "@/components/seo/SeoDiscoverabilityHero";
import PageJsonLdScript from "@/components/seo/PageJsonLdScript";
import HomeClientLoader from "@/components/home/HomeClientLoader";
import { buildTrendIndexJsonLd } from "@/lib/brand/seo";
import { getTrendCatalog } from "@/lib/trends/catalog";

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
