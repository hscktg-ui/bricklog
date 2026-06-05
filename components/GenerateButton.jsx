import Icon from "./Icon";

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
        className="briclog-btn-primary"
      >
        {isGenerating ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span
              className="briclog-spinner h-4 w-4 border-white/30 border-t-white"
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
