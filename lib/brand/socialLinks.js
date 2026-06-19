/** BRICLOG 공식 채널 — 푸터·위젯 SSOT */

export const BRICLOG_NAVER_BLOG_URL = "https://blog.naver.com/briclog";
export const BRICLOG_INSTAGRAM_URL = "https://www.instagram.com/briclog.ai";

/** 공식 채널 소개 — 과장 없이 한 줄 */
export const BRICLOG_SOCIAL_EYEBROW = "공식 채널";
export const BRICLOG_SOCIAL_INTRO =
  "네이버 블로그와 인스타에서 운영 예시를 볼 수 있습니다.";

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
