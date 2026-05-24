"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

const STORAGE_KEY = "briclog_onboarding_dismissed";

export default function OnboardingBanner({ visible = true }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!visible || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8F9EF] bg-[#E8F9EF]/60 px-4 py-2.5 md:px-6">
      <p className="text-[13px] text-[#191F28]">
        <span className="font-semibold text-[#03A94D]">Tip</span>
        <span className="mx-1.5 text-[#8B95A1]">·</span>
        블로그를 만들면 플레이스·인스타·이미지가 같은 맥락으로 이어집니다
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-[#8B95A1] hover:bg-white/80"
        aria-label="안내 닫기"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}
