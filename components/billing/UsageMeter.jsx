"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { buildSidebarUsageDisplay } from "@/lib/billing/formatUsageDisplay";

function UsageSkeleton({ compact }) {
  if (compact) {
    return (
      <div
        className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[#E8EBED]"
        aria-hidden
      >
        <div className="h-3 w-12 animate-pulse rounded bg-[#E8EBED]" />
        <div className="mt-1.5 h-2 w-20 animate-pulse rounded bg-[#F7F8FA]" />
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5"
      aria-hidden
    >
      <div className="h-3 w-14 animate-pulse rounded bg-[#E8EBED]" />
      <div className="mt-2 h-2 w-24 animate-pulse rounded bg-[#F7F8FA]" />
    </div>
  );
}

export default function UsageMeter({ compact = false, onUpgradeClick }) {
  const [usage, setUsage] = useState(null);
  const [phase, setPhase] = useState("loading");

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const data = await fetchWithAuth("/api/billing/usage");
      setUsage(data?.usage ?? null);
      setPhase(data?.usage ? "ready" : "unknown");
    } catch {
      setUsage(null);
      setPhase("unknown");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const display = useMemo(() => {
    if (phase === "unknown" || !usage) {
      return {
        planTitle: "이용 현황",
        usageLine: "한도를 불러오지 못했습니다",
        hint: "연결을 확인한 뒤 다시 시도해 주세요",
        warnHint: "",
      };
    }
    return buildSidebarUsageDisplay(usage);
  }, [usage, phase]);

  if (phase === "loading") {
    return <UsageSkeleton compact={compact} />;
  }

  const warn = usage?.usageWarning;
  const warnLine = display.warnHint;

  if (phase === "unknown") {
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => void load()}
          className="flex w-full flex-col gap-0.5 rounded-lg bg-white px-2.5 py-2 text-left ring-1 ring-[#E8EBED] hover:ring-[#03C75A]/35"
        >
          <span className="text-[11px] font-semibold text-[#191F28]">
            {display.planTitle}
          </span>
          <span className="text-[10px] text-[#8B95A1]">{display.usageLine}</span>
        </button>
      );
    }
    return (
      <div className="rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5">
        <p className="text-[12px] font-semibold text-[#191F28]">
          {display.planTitle}
        </p>
        <p className="mt-0.5 text-[11px] text-[#4E5968]">{display.usageLine}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 text-[10px] font-semibold text-[#03A94D] hover:underline"
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={onUpgradeClick}
        title={
          warnLine
            ? `${display.planTitle} — ${display.usageLine} (${warnLine})`
            : `${display.planTitle} — ${display.usageLine}`
        }
        className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition ${
          warn
            ? "bg-[#FFF4E5] ring-1 ring-[#FFD699]"
            : "bg-white ring-1 ring-[#E8EBED] hover:ring-[#03C75A]/35"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#191F28]">
            {display.planTitle}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-[#03A94D]">
            플랜
          </span>
        </span>
        <span
          className={`text-[10px] leading-snug ${
            warn ? "text-[#E65100]" : "text-[#8B95A1]"
          }`}
        >
          {display.usageLine || "이용 현황"}
        </span>
        {display.hint ? (
          <span className="text-[9px] text-[#B0B8C1]">{display.hint}</span>
        ) : null}
        {warnLine ? (
          <span className="text-[9px] font-medium leading-snug text-[#E65100]">
            {warnLine}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        warn ? "border-[#FFD699] bg-[#FFFBF0]" : "border-[#E8EBED] bg-white"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[#191F28]">
          {display.planTitle}
        </p>
        <p className="mt-0.5 text-[11px] text-[#4E5968]">
          {display.usageLine || "이용 현황"}
        </p>
        {display.hint ? (
          <p className="mt-0.5 text-[10px] text-[#B0B8C1]">{display.hint}</p>
        ) : null}
      </div>
      {warnLine ? (
        <p className="mt-1.5 text-[10px] font-medium leading-snug text-[#E65100]">
          {warnLine}
        </p>
      ) : null}
      {usage.planId !== "studio" && !usage.bypassQuotas && onUpgradeClick && (
        <button
          type="button"
          onClick={onUpgradeClick}
          className="mt-2 text-[10px] font-semibold text-[#03A94D] hover:underline"
        >
          플랜 변경
        </button>
      )}
    </div>
  );
}
