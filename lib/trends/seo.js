import { BRAND_META_TITLE } from "@/lib/brand/copy";
import { resolveOgImageUrl, resolveTwitterImageUrl } from "@/lib/brand/seo";

export function buildTrendPageMetadata(item, siteUrl) {
  const title = `${item.name} AI 트렌드 · ${BRAND_META_TITLE}`;
  const description = `${item.name}의 현재 흐름, 왜 주목받는지, 브릭로그 관점에서 왜 중요한지 정리했습니다. ${
    item.isSample ? "현재는 SAMPLE DATA 기반 MVP 화면입니다." : ""
  }`.trim();
  const url = `${siteUrl}/trend/${item.slug}`;
  const ogImage = resolveOgImageUrl(siteUrl);
  const twitterImage = resolveTwitterImageUrl(siteUrl);
  const keywords = [
    item.name,
    `${item.name} AI`,
    "AI 트렌드",
    "AI 도구",
    "AI 모델",
    "AI 검색",
    "브랜드 콘텐츠",
    "블로그",
    "스마트플레이스",
    "인스타그램",
  ];

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
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
      images: [twitterImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildTrendJsonLd(item, siteUrl) {
  const url = `${siteUrl}/trend/${item.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: `${item.name} AI 트렌드`,
        description: item.description,
        inLanguage: "ko-KR",
      },
      {
        "@type": "DefinedTerm",
        "@id": `${url}#term`,
        name: item.name,
        description: item.description,
        inDefinedTermSet: `${siteUrl}/#ai-trends`,
        sameAs: item.officialUrl || undefined,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "BRICLOG",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "AI Trend",
            item: `${siteUrl}/#trend-list`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: item.name,
            item: url,
          },
        ],
      },
    ],
  };
}
