import { buildLandingFaqJsonLd, buildOrganizationJsonLd } from "@/lib/brand/seo";
import { resolveSiteUrl } from "@/lib/brand/siteMetadata";

/** 루트 layout 전용 — Organization · FAQ · WebSite JSON-LD */
export default async function JsonLdScript() {
  const siteUrl = await resolveSiteUrl();
  const payloads = [
    buildOrganizationJsonLd(siteUrl),
    buildLandingFaqJsonLd(siteUrl),
  ];

  return (
    <>
      {payloads.map((ld, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </>
  );
}
