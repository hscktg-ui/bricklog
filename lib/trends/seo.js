import { BRAND_META_TITLE } from "@/lib/brand/copy";
import { resolveOgImageUrl, resolveTwitterImageUrl } from "@/lib/brand/seo";

export function buildTrendPageMetadata(item, siteUrl) {
  const rankLabel =
    item.currentRank != null ? `현재 ${item.currentRank}위` : "실시간 랭킹";
  const title = `${item.name} AI 순위 · ${rankLabel} 트렌드 | 브릭로그`;
  const description = `${item.name} AI 순위·랭킹 트렌드(${rankLabel}). 왜 움직이는지, 구글·네이버 검색·브랜드 콘텐츠에 어떻게 쓰는지 브릭로그가 정리합니다. ${
    item.isSample ? "현재는 SAMPLE DATA 기반 화면입니다." : ""
  }`.trim();
  const url = `${siteUrl}/trend/${item.slug}`;
  const ogImage = resolveOgImageUrl(siteUrl);
  const twitterImage = resolveTwitterImageUrl(siteUrl);
  const keywords = [
    item.name,
    `${item.name} 순위`,
    `${item.name} 랭킹`,
    `${item.name} AI`,
    "AI 순위",
    "AI 랭킹",
    "AI 트렌드",
    "AI 트렌드 보기",
    "AI 도구 순위",
    "AI 모델 순위",
    "AI 검색",
    "네이버 AI 검색",
    "구글 SEO",
    "네이버 SEO",
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
        name: `${item.name} AI 순위·랭킹 트렌드`,
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
            name: "AI 순위·랭킹",
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
