"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "@/components/layout/SiteFooter";

/** 랜딩은 전용 푸터가 있어 중복 노출 방지 */
export default function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <SiteFooter />;
}
