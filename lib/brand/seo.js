import {
  BRAND_META_DESCRIPTION,
  BRAND_META_DESCRIPTION_EN,
  BRAND_META_KEYWORDS,
  BRAND_META_TITLE,
  BRAND_META_TITLE_KO,
  BRAND_META_TITLE_SHORT,
  BRAND_LATEST_UPDATE,
  BRICLOG_SLOGAN,
} from "@/lib/brand/copy";
import { BRICLOG_CONTACT_EMAIL } from "@/lib/brand/support";
import { LANDING_FAQ_ITEMS } from "@/lib/landing/landingFaq";
import { GUIDE_PAGES } from "@/lib/seo/guidePages";

/** sitemap·robots 등 빌드/정적 경로용 (요청 Host 없을 때) */
export function resolvePublicSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!raw) return "https://briclog.ai";
  return raw.replace(/^https:\/\/www\./i, "https://");
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

export function buildLandingFaqJsonLd(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    mainEntity: LANDING_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function buildGuidesIndexJsonLd(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "브랜드 콘텐츠 작성 가이드",
    description:
      "이야기·스마트플레이스·인스타그램 브랜드 콘텐츠 작성 가이드 모음",
    url: `${siteUrl}/guides`,
    numberOfItems: GUIDE_PAGES.length,
    itemListElement: GUIDE_PAGES.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: page.title,
      url: `${siteUrl}/guides/${page.slug}`,
    })),
  };
}

export function buildGuideArticleJsonLd(page, siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    keywords: page.keywords.join(", "),
    author: { "@type": "Organization", name: BRAND_META_TITLE_KO },
    publisher: {
      "@type": "Organization",
      name: BRAND_META_TITLE_KO,
      logo: { "@type": "ImageObject", url: `${siteUrl}/og.png` },
    },
    mainEntityOfPage: `${siteUrl}/guides/${page.slug}`,
    inLanguage: "ko-KR",
  };
}

export function buildGuideBreadcrumbJsonLd(page, siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "브릭로그",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "콘텐츠 가이드",
        item: `${siteUrl}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.title,
        item: `${siteUrl}/guides/${page.slug}`,
      },
    ],
  };
}

/** @param {string} siteUrl */
export function buildOrganizationJsonLd(siteUrl) {
  const ogImage = `${siteUrl}/og.png`;
  const keywords = BRAND_META_KEYWORDS.split(",").map((k) => k.trim());

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: BRAND_META_TITLE_KO,
        alternateName: [
          BRAND_META_TITLE_SHORT,
          "Briclog",
          "briclog",
          BRAND_META_TITLE,
        ],
        url: siteUrl,
        email: BRICLOG_CONTACT_EMAIL,
        description: BRAND_META_DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          url: ogImage,
          width: 1200,
          height: 630,
        },
        image: ogImage,
        sameAs: [siteUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: BRAND_META_TITLE_KO,
        alternateName: [BRAND_META_TITLE, BRAND_META_TITLE_SHORT],
        description: BRAND_META_DESCRIPTION,
        inLanguage: ["ko-KR", "en-US"],
        publisher: { "@id": `${siteUrl}/#organization` },
        keywords: keywords.join(", "),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: BRAND_META_TITLE_KO,
        alternateName: [BRAND_META_TITLE, "Briclog"],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: BRAND_META_DESCRIPTION,
        featureList: [
          BRICLOG_SLOGAN,
          BRAND_LATEST_UPDATE.headline,
          "이번 주·이번 달 운영 계획",
          "조사·맥락 점검 후 이야기·플레이스·인스타 초안 · 상품 상세 디자인",
          "발행 준비도 점검",
          "브랜드 말투·지역 기억",
          "채널별 톤 분리",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
        screenshot: ogImage,
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: BRAND_META_TITLE_KO,
        description: BRAND_META_DESCRIPTION,
        inLanguage: "ko-KR",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: ogImage,
        },
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
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      alternateLocale: ["en_US"],
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

export { BRAND_META_KEYWORDS, BRAND_META_DESCRIPTION_EN };
