"use client";

import { useMemo } from "react";
import BrandSwitcher from "@/components/BrandSwitcher";
import { buildSidebarPersonalization } from "@/lib/dashboard/sidebarPersonalization";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";

/**
 * 브랜드 창고 — 사이드바 SSOT (설정에 중복 배치하지 않음)
 */
export default function SidebarBrandStrip({
  profile,
  onBrandChange,
  onMobileClose,
  showBrandWarehouse = true,
}) {
  const { activeBrand } = useBrandWorkspace();
  const hub = useMemo(
    () => buildSidebarPersonalization(profile, activeBrand, {}),
    [profile, activeBrand]
  );

  if (!showBrandWarehouse) return null;

  return (
    <div className="border-b border-[#E8EBED]/80 px-3 pb-2">
      <p className="mb-1 text-[11px] font-medium text-[#8B95A1]">브랜드 창고</p>
      <BrandSwitcher
        compact
        onBrandChange={onBrandChange}
        onMobileClose={onMobileClose}
        summaryLine={hub.summaries.warehouse}
      />
    </div>
  );
}
