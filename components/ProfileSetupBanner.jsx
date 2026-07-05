"use client";

import { deferProfileModalUntilNextSignIn } from "@/lib/auth/profilePersonalization";
import {
  VISION_CTA_ACCENT,
  VISION_GHOST_BTN,
  VISION_STATUS_OK,
} from "@/lib/landing/vision2030Styles";

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
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vision-line)] px-4 py-3 md:px-6 ${VISION_STATUS_OK}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--vision-ink)]">
          닉네임·호칭 (선택)
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--vision-muted)]">
          화면 인사에만 씁니다 · 입력 없이도 글쓰기는 가능해요
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className={VISION_GHOST_BTN}
        >
          나중에
        </button>
        <button
          type="button"
          onClick={() => onOpenSetup?.()}
          className={`${VISION_CTA_ACCENT} !min-h-[40px] !px-4 !py-2 !text-[13px]`}
        >
          입력하기
        </button>
      </div>
    </div>
  );
}
