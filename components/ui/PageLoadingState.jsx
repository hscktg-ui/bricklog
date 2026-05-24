/** 전역 로딩 — 빈 화면 대신 스피너 + 안내 */
export default function PageLoadingState({ message, hint = null }) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#F7F8FA] p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="briclog-spinner" aria-hidden />
      <p className="text-[14px] text-[#8B95A1]">{message}</p>
      {hint ? (
        <p className="max-w-sm text-[12px] leading-relaxed text-[#B0B8C1]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
