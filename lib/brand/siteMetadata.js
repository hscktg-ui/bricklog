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
  resolveOgImageUrl,
  resolveTwitterImageUrl,
} from "@/lib/brand/seo";

export const DEFAULT_SITE_URL = "https://briclog.ai";

function normalizePublicHost(host = "") {
  const raw = String(host).split(",")[0].trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("www.")) return raw.slice(4);
  return raw;
}

/** 요청 Host 기준 canonical — 항상 apex(briclog.ai) */
export async function resolveSiteUrl() {
  try {
    const h = await headers();
    const host = normalizePublicHost(
      h.get("x-forwarded-host") ?? h.get("host") ?? ""
    );
    if (!host) return DEFAULT_SITE_URL;
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      return `http://${host}`;
    }
    return `https://${host}`;
  } catch {
    const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "")
      .replace(/\/$/, "")
      .replace(/^https:\/\/www\./i, "https://");
    return fromEnv || DEFAULT_SITE_URL;
  }
}

export async function buildRootMetadata() {
  const siteUrl = await resolveSiteUrl();
  const ogImage = resolveOgImageUrl(DEFAULT_SITE_URL);
  const twitterImage = resolveTwitterImageUrl(DEFAULT_SITE_URL);

  const keywords = BRAND_META_KEYWORDS.split(",").map((k) => k.trim());

  return {
    metadataBase: new URL(DEFAULT_SITE_URL),
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
    referrer: "origin-when-cross-origin",
    formatDetection: {
      telephone: false,
      address: false,
      email: false,
    },
    appleWebApp: {
      capable: true,
      title: BRAND_META_TITLE_KO,
      statusBarStyle: "default",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: DEFAULT_SITE_URL,
      languages: {
        "ko-KR": DEFAULT_SITE_URL,
        "x-default": DEFAULT_SITE_URL,
      },
    },
    verification: buildSiteVerificationMetadata(),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      alternateLocale: ["en_US"],
      url: DEFAULT_SITE_URL,
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
      images: [{ url: twitterImage, alt: OG_IMAGE_ALT }],
    },
    other: {
      "og:locale:alternate": "en_US",
      "og:image": ogImage,
      "og:image:secure_url": ogImage,
      "og:image:width": String(OG_IMAGE_SIZE.width),
      "og:image:height": String(OG_IMAGE_SIZE.height),
      "og:image:type": "image/png",
      "twitter:image": twitterImage,
      "description:en": BRAND_META_DESCRIPTION_EN,
      "application-name": BRAND_META_TITLE,
      "apple-mobile-web-app-title": BRAND_META_TITLE_KO,
      "msapplication-TileColor": "#03C75A",
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.svg", sizes: "32x32", type: "image/svg+xml" },
        { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      ],
      apple: [{ url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }],
      shortcut: ["/favicon.svg"],
      other: [{ rel: "mask-icon", url: "/favicon.svg", color: "#03C75A" }],
    },
  };
}
