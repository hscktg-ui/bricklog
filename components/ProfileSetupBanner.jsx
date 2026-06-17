"use client";

import { deferProfileModalUntilNextSignIn } from "@/lib/auth/profilePersonalization";

/**
 * Compact reminder only — full form lives in ProfileCompletionModal.
 * @param {{ userId: string, onOpenSetup: () => void, onDismiss?: () => void, onToast?: (msg: string, type?: string) => void }} props
 */
export default function ProfileSetupBanner({
  userId,
  onOpenSetup,
  onDismiss,
  onToast,
}) {
  const handleDismiss = () => {
    if (userId) deferProfileModalUntilNextSignIn(userId);
    onDismiss?.();
    onToast?.("프로필은 상단 메뉴에서 언제든 입력할 수 있어요.", "info");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#03C75A]/25 bg-gradient-to-r from-[#E8F9EF] to-white px-4 py-3 md:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#191F28]">
          닉네임·호칭 (선택)
        </p>
        <p className="mt-0.5 text-[12px] text-[#6B7684]">
          화면 인사에만 씁니다 · 입력 없이도 글쓰기는 가능해요
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px] font-semibold text-[#6B7684] hover:bg-[#F7F8FA]"
        >
          나중에
        </button>
        <button
          type="button"
          onClick={() => onOpenSetup?.()}
          className="rounded-lg bg-[#03C75A] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#02B350]"
        >
          입력하기
        </button>
      </div>
    </div>
  );
}
