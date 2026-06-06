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
        <JsonLdScript />
        <CrawlableBrandIntro />
        <SessionTelemetry />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
