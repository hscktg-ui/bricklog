import { headers } from "next/headers";
import {
  BRAND_META_DESCRIPTION,
  BRAND_META_DESCRIPTION_EN,
  BRAND_META_KEYWORDS,
  BRAND_META_TITLE,
  BRAND_META_TITLE_KO,
} from "@/lib/brand/copy";
import { OG_IMAGE_ALT, OG_IMAGE_SIZE } from "@/lib/brand/renderOgImage";
import {
  buildSiteVerificationMetadata,
} from "@/lib/brand/seo";

const DEFAULT_SITE_URL = "https://briclog.ai";

/** 요청 Host 기준 canonical URL — og:image가 공유 도메인과 같아야 카카오 등에서 로드됨 */
export async function resolveSiteUrl() {
  try {
    const h = await headers();
    const host = (
      h.get("x-forwarded-host") ??
      h.get("host") ??
      ""
    )
      .split(",")[0]
      .trim();
    if (!host) return DEFAULT_SITE_URL;
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      return `http://${host}`;
    }
    return `https://${host}`;
  } catch {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    return fromEnv || DEFAULT_SITE_URL;
  }
}

export async function buildRootMetadata() {
  const siteUrl = await resolveSiteUrl();
  const ogImage = `${siteUrl}/og.png`;

  const keywords = BRAND_META_KEYWORDS.split(",").map((k) => k.trim());

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: BRAND_META_TITLE,
      template: `%s · ${BRAND_META_TITLE}`,
    },
    description: BRAND_META_DESCRIPTION,
    keywords,
    applicationName: BRAND_META_TITLE,
    authors: [{ name: BRAND_META_TITLE_KO, url: siteUrl }],
    creator: "BRICLOG",
    publisher: BRAND_META_TITLE,
    category: "business",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: siteUrl,
      languages: {
        "ko-KR": siteUrl,
        "en-US": siteUrl,
        "x-default": siteUrl,
      },
    },
    verification: buildSiteVerificationMetadata(),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      alternateLocale: ["en_US"],
      url: siteUrl,
      siteName: BRAND_META_TITLE,
      title: BRAND_META_TITLE,
      description: BRAND_META_DESCRIPTION,
      images: [
        {
          url: ogImage,
          secureUrl: ogImage,
          width: OG_IMAGE_SIZE.width,
          height: OG_IMAGE_SIZE.height,
          alt: OG_IMAGE_ALT,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND_META_TITLE,
      description: BRAND_META_DESCRIPTION,
      images: [{ url: ogImage, alt: OG_IMAGE_ALT }],
    },
    other: {
      "og:locale:alternate": "en_US",
      "description:en": BRAND_META_DESCRIPTION_EN,
      "application-name": BRAND_META_TITLE,
      "apple-mobile-web-app-title": BRAND_META_TITLE_KO,
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/og.png", sizes: "1200x630" }],
    },
  };
}
