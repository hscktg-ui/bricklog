import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "@/components/layout/SiteFooter";
import SessionTelemetry from "@/components/analytics/SessionTelemetry";
import JsonLdScript from "@/components/seo/JsonLdScript";
import CrawlableBrandIntro from "@/components/seo/CrawlableBrandIntro";
import { buildRootMetadata } from "@/lib/brand/siteMetadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#03C75A" },
    { media: "(prefers-color-scheme: dark)", color: "#071510" },
  ],
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata() {
  return buildRootMetadata();
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#landing-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--vision-accent,#03C75A)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        <JsonLdScript />
        <CrawlableBrandIntro />
        <SessionTelemetry />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
