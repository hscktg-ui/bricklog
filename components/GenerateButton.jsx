import Icon from "./Icon";
import { VISION_CTA_ACCENT, VISION_SPINNER } from "@/lib/landing/vision2030Styles";

export default function GenerateButton({
  isGenerating,
  onClick,
  disabled,
  disabledReason,
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isGenerating}
        className={VISION_CTA_ACCENT}
      >
        {isGenerating ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            <span>채널별 초안 작성 중...</span>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <Icon name="document" className="h-5 w-5" />
            <span>채널별 초안 생성</span>
          </span>
        )}
      </button>
      {disabled && disabledReason && !isGenerating && (
        <p className="mt-2 text-center text-[11px] text-[#FF6B6B]">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
