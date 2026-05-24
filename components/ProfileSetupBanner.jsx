"use client";

/**
 * Compact reminder only — full form lives in ProfileCompletionModal.
 * @param {{ userId: string, onOpenSetup: () => void, onToast?: (msg: string, type?: string) => void }} props
 */
export default function ProfileSetupBanner({ userId, onOpenSetup, onToast }) {
  void userId;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#03C75A]/25 bg-gradient-to-r from-[#E8F9EF] to-white px-4 py-3 md:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#191F28]">
          닉네임·호칭을 입력해 주세요
        </p>
        <p className="mt-0.5 text-[12px] text-[#6B7684]">
          화면 인사에만 쓰입니다 · 1분이면 끝납니다
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpenSetup?.()}
        className="shrink-0 rounded-lg bg-[#03C75A] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#02B350]"
      >
        프로필 입력
      </button>
    </div>
  );
}
