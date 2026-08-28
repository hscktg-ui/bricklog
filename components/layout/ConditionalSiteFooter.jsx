"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "@/components/layout/SiteFooter";

/** 랜딩·상세페이지는 전용 푸터가 있어 사이트 푸터 중복 방지 */
export default function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/detail") return null;
  return <SiteFooter />;
}
