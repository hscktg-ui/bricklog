import {
  BRAND_META_DESCRIPTION,
  BRAND_META_KEYWORDS,
  BRAND_META_TITLE,
  BRICLOG_SLOGAN,
} from "@/lib/brand/copy";
import { BRICLOG_CONTACT_EMAIL } from "@/lib/brand/support";

/** sitemap·robots 등 빌드/정적 경로용 (요청 Host 없을 때) */
export function resolvePublicSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://briclog.ai"
  );
}

export function buildSiteVerificationMetadata() {
  const verification = {};
  const google = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "").trim();
  const naver = (process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "").trim();
  const daum = (process.env.NEXT_PUBLIC_DAUM_SITE_VERIFICATION || "").trim();

  if (google) verification.google = google;
  const other = {};
  if (naver) other["naver-site-verification"] = naver;
  if (daum) other["daum-site-verification"] = daum;
  if (Object.keys(other).length) verification.other = other;

  return Object.keys(verification).length ? verification : undefined;
}

/** @param {string} siteUrl */
export function buildOrganizationJsonLd(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: BRAND_META_TITLE,
        url: siteUrl,
        email: BRICLOG_CONTACT_EMAIL,
        description: BRAND_META_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: BRAND_META_TITLE,
        description: BRAND_META_DESCRIPTION,
        inLanguage: "ko-KR",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: BRAND_META_TITLE,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: BRAND_META_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
        featureList: BRICLOG_SLOGAN,
      },
    ],
  };
}

export function buildLegalPageMetadata({ title, description, path }) {
  const siteUrl = resolvePublicSiteUrl();
  const url = `${siteUrl}${path}`;
  const ogImage = `${siteUrl}/og.png`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url,
      title,
      description,
      siteName: BRAND_META_TITLE,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export { BRAND_META_KEYWORDS };
