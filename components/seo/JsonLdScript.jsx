import { buildOrganizationJsonLd } from "@/lib/brand/seo";
import { resolveSiteUrl } from "@/lib/brand/siteMetadata";

export default async function JsonLdScript() {
  const siteUrl = await resolveSiteUrl();
  const jsonLd = buildOrganizationJsonLd(siteUrl);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
