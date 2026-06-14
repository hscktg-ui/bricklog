import { buildLandingFaqJsonLd, buildOrganizationJsonLd } from "@/lib/brand/seo";
import { resolveSiteUrl } from "@/lib/brand/siteMetadata";

export default async function JsonLdScript() {
  const siteUrl = await resolveSiteUrl();
  const orgLd = buildOrganizationJsonLd(siteUrl);
  const faqLd = buildLandingFaqJsonLd(siteUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  );
}
