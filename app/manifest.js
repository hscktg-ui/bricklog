import {
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE,
  BRAND_META_TITLE_KO,
  BRICLOG_SLOGAN,
} from "@/lib/brand/copy";
import { resolvePublicSiteUrl } from "@/lib/brand/seo";

export default function manifest() {
  const siteUrl = resolvePublicSiteUrl();
  return {
    name: BRAND_META_TITLE,
    short_name: BRAND_META_TITLE_KO,
    description: `${BRICLOG_SLOGAN} — ${BRAND_META_DESCRIPTION.slice(0, 120)}`,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#03C75A",
    lang: "ko",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "32x32",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    id: siteUrl,
  };
}
