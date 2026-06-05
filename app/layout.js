import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "@/components/layout/SiteFooter";
import { BRAND_META_TITLE, BRAND_META_DESCRIPTION } from "@/lib/brand/slogan";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://briclog.ai";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND_META_TITLE,
    template: `%s · ${BRAND_META_TITLE}`,
  },
  description: BRAND_META_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: BRAND_META_TITLE,
    title: BRAND_META_TITLE,
    description: BRAND_META_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: BRAND_META_TITLE,
    description: BRAND_META_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
