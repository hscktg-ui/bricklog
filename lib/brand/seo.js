import {
  BRAND_META_DESCRIPTION,
  BRAND_META_DESCRIPTION_EN,
  BRAND_META_KEYWORDS,
  BRAND_META_TITLE,
  BRAND_META_TITLE_KO,
  BRAND_META_TITLE_SHORT,
  BRAND_LATEST_UPDATE,
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

export function resolveOgImageUrl(siteUrl = resolvePublicSiteUrl()) {
  return `${siteUrl}/opengraph-image`;
}

export function resolveTwitterImageUrl(siteUrl = resolvePublicSiteUrl()) {
  return `${siteUrl}/twitter-image`;
}

function verificationToken(...keys) {
  for (const key of keys) {
    const value = (process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
}

export function buildSiteVerificationMetadata() {
  const verification = {};
  const google = verificationToken(
    "GOOGLE_SITE_VERIFICATION",
    "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"
  );
  const naver = verificationToken(
    "NAVER_SITE_VERIFICATION",
    "NEXT_PUBLIC_NAVER_SITE_VERIFICATION"
  );
  const daum = verificationToken(
    "DAUM_SITE_VERIFICATION",
    "NEXT_PUBLIC_DAUM_SITE_VERIFICATION"
  );
  const bing = verificationToken(
    "BING_SITE_VERIFICATION",
    "NEXT_PUBLIC_BING_SITE_VERIFICATION"
  );

  if (google) verification.google = google;
  const other = {};
  if (naver) other["naver-site-verification"] = naver;
  if (daum) other["daum-site-verification"] = daum;
  if (bing) other["msvalidate.01"] = bing;
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
    name: "브랜드·AI 순위 콘텐츠 가이드",
    description:
      "AI 도구 순위·랭킹, 네이버·구글 SEO, 이야기·스마트플레이스·인스타그램 작성 가이드 모음",
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

export function buildTrendIndexJsonLd(items = [], siteUrl = resolvePublicSiteUrl()) {
  const topItems = items.slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/#ai-trend-index`,
        url: siteUrl,
        name: "브릭로그 AI 순위·랭킹 트렌드",
        description:
          "매시간 갱신되는 AI 도구·모델 순위와 랭킹 트렌드. 구글·네이버 검색·브랜드 콘텐츠에 바로 연결합니다.",
        inLanguage: ["ko-KR", "en-US"],
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/#ai-trend-top10`,
        name: "AI 순위 Top 10 · 실시간 랭킹",
        description:
          "지금 가장 많이 움직이는 AI 도구·모델 순위. 변동·점수·카테고리를 한눈에 봅니다.",
        numberOfItems: topItems.length,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: topItems.map((item, index) => ({
          "@type": "ListItem",
          position: item.currentRank || index + 1,
          url: `${siteUrl}/trend/${item.slug}`,
          name: `${item.currentRank || index + 1}위 ${item.name}`,
          description: item.description,
        })),
      },
    ],
  };
}

export function buildGuideArticleJsonLd(page, siteUrl) {
  const ogImage = resolveOgImageUrl(siteUrl);
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
      logo: { "@type": "ImageObject", url: ogImage },
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
  const ogImage = resolveOgImageUrl(siteUrl);
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
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/?q={search_term_string}#trend-list`,
          "query-input": "required name=search_term_string",
        },
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
          "AI 순위·랭킹 트렌드 보기",
          "왜 중요한지 이해하는 트렌드 맥락 요약",
          BRAND_LATEST_UPDATE.headline,
          "브랜드·지역·주제로 블로그·플레이스·인스타 초안",
          "구글·네이버 검색·AI 브리핑에 유리한 설명형 초안",
          "발행 준비도 점검",
          "브랜드 말투·지역 기억",
          "채널별 톤 분리 · 복사 후 게시",
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

export function buildLegalPageMetadata({ title, description, path, siteName }) {
  const siteUrl = resolvePublicSiteUrl();
  const url = `${siteUrl}${path}`;
  const ogImage = resolveOgImageUrl(siteUrl);
  const ogSite = siteName || BRAND_META_TITLE;

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
      siteName: ogSite,
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
