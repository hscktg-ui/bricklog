import SeoDiscoverabilityHero from "@/components/seo/SeoDiscoverabilityHero";
import HomeClientLoader from "@/components/home/HomeClientLoader";
import { getTrendCatalog } from "@/lib/trends/catalog";

export default async function HomePage() {
  const trendCatalog = await getTrendCatalog();

  return (
    <>
      <SeoDiscoverabilityHero />
      <HomeClientLoader trendCatalog={trendCatalog} />
    </>
  );
}
