/** BRICLOG 공식 채널 — 푸터·위젯 SSOT */

export const BRICLOG_NAVER_BLOG_URL = "https://blog.naver.com/briclog";
export const BRICLOG_INSTAGRAM_URL = "https://www.instagram.com/briclog.ai";

/** @type {ReadonlyArray<{ id: string, label: string, shortLabel: string, href: string, platform: "naver" | "instagram" }>} */
export const BRICLOG_SOCIAL_LINKS = [
  {
    id: "naver-blog",
    label: "네이버 블로그",
    shortLabel: "블로그",
    href: BRICLOG_NAVER_BLOG_URL,
    platform: "naver",
  },
  {
    id: "instagram",
    label: "인스타그램",
    shortLabel: "인스타",
    href: BRICLOG_INSTAGRAM_URL,
    platform: "instagram",
  },
];
