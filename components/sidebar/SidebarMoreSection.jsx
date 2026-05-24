"use client";

import { useState } from "react";
import BrandSwitcher from "@/components/BrandSwitcher";
import SubscriptionPanel from "@/components/billing/SubscriptionPanel";
import SidebarMenuOrderEditor from "@/components/sidebar/SidebarMenuOrderEditor";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import {
  getChannelMeta,
  PRIMARY_CHANNEL_OPTIONS,
} from "@/lib/user/userPreferences";
import { useSimpleWorkspaceMode } from "@/hooks/useSimpleWorkspaceMode";

/**
 * 설정 — 브랜드·요금·메뉴·고급 작업
 */
export default function SidebarMoreSection({
  demoMode,
  onUpgradeClick,
  onToast,
  showBrandWarehouse = false,
  onBrandChange,
  onMobileClose,
  brandWarehouseSummary,
  inNav = false,
  userId = null,
  primaryChannel = "blog",
  onMenuOrderSaved,
  onChangeStartChannel,
  onResetWorkspace,
}) {
  const [open, setOpen] = useState(false);
  const { simpleMode, setSimpleMode } = useSimpleWorkspaceMode(userId);
  const homeChannel = getChannelMeta(primaryChannel);

  return (
    <div className={inNav ? "" : "px-1"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-[40px] w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-[#4E5968] hover:bg-[#F7F8FA] ${
          inNav && open ? "bg-[#F7F8FA]" : ""
        }`}
      >
        <span>설정</span>
        <span className="text-[11px] text-[#8B95A1]">{open ? "접기" : "펼치기"}</span>
      </button>

      {open && (
        <div className="mt-1 space-y-2 rounded-lg border border-[#E8EBED] bg-[#FAFBFC] p-2">
          {userId && (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#E8EBED] bg-white px-2.5 py-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={simpleMode}
                onChange={(e) => setSimpleMode(e.target.checked)}
              />
              <span className="text-[11px] leading-snug text-[#4E5968]">
                <span className="font-semibold text-[#191F28]">간단 모드</span>
                <span className="mt-0.5 block text-[#8B95A1]">
                  자주 쓰는 메뉴만 보이고, 결과 화면은 복사본 위주로 표시합니다.
                </span>
              </span>
            </label>
          )}

          {showBrandWarehouse && onBrandChange && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-[#8B95A1]">
                브랜드 바꾸기
              </p>
              <BrandSwitcher
                compact
                onBrandChange={onBrandChange}
                onMobileClose={onMobileClose}
                summaryLine={brandWarehouseSummary}
              />
            </div>
          )}

          <div className="rounded-lg border border-[#E8EBED] bg-white px-2.5 py-2">
            <p className="text-[11px] font-semibold text-[#4E5968]">요금제 · 채널</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8B95A1]">
              첫 화면(기본): <span className="font-medium text-[#03A94D]">{homeChannel.label}</span>
              · 메뉴에서 채널을 바꿀 수 있어요.
            </p>
            <ul className="mt-1.5 space-y-0.5 text-[10px] text-[#8B95A1]">
              {PRIMARY_CHANNEL_OPTIONS.map((c) => (
                <li key={c.id}>
                  {CHANNEL_PRODUCTS[c.id]?.menuLabel} — {c.desc}
                </li>
              ))}
            </ul>
            {!demoMode && onUpgradeClick && (
              <p className="mt-2 text-[10px] leading-relaxed text-[#8B95A1]">
                요금제·결제는 화면 우측 상단{" "}
                <button
                  type="button"
                  onClick={() => onUpgradeClick()}
                  className="font-semibold text-[#03A94D] hover:underline"
                >
                  플랜 변경
                </button>
                에서 할 수 있습니다.
              </p>
            )}
          </div>

          {!demoMode && (
            <SubscriptionPanel
              onUpgradePlans={onUpgradeClick}
              onToast={onToast}
              compact
            />
          )}

          {!simpleMode && (
            <SidebarMenuOrderEditor
              userId={userId}
              onSaved={onMenuOrderSaved}
              onToast={onToast}
            />
          )}

          <p className="text-[11px] leading-relaxed text-[#8B95A1]">
            화자·감정·문체는 「이야기」 화면의 세부 설정에서 맞출 수 있습니다.
          </p>

          {(onChangeStartChannel || onResetWorkspace) && (
            <div className="space-y-1 border-t border-[#E8EBED] pt-2">
              <p className="text-[10px] font-semibold text-[#8B95A1]">고급</p>
              {onChangeStartChannel && (
                <>
                  <button
                    type="button"
                    onClick={onChangeStartChannel}
                    className="flex min-h-[36px] w-full items-center rounded-lg px-2 text-left text-[12px] text-[#4E5968] hover:bg-[#F7F8FA]"
                  >
                    시작 채널 다시 고르기
                  </button>
                  <p className="px-2 text-[10px] leading-snug text-[#B0B8C1]">
                    왼쪽 메뉴와 동일한 채널 선택 화면입니다. 기본(홈) 채널만 바꿉니다.
                  </p>
                </>
              )}
              {onResetWorkspace && (
                <>
                  <button
                    type="button"
                    onClick={onResetWorkspace}
                    className="flex min-h-[36px] w-full items-center rounded-lg px-2 text-left text-[12px] font-medium text-[#E42939] hover:bg-[#FFF5F5]"
                  >
                    기기·창고 비우기
                  </button>
                  <p className="px-2 text-[10px] leading-snug text-[#B0B8C1]">
                    브랜드·작성 중인 글·이 기기 설정을 모두 지웁니다. 계정(이메일)은 유지됩니다.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
