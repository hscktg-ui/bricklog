/** 전역 로딩 — 빈 화면 대신 스피너 + 안내 */
export default function PageLoadingState({ message, hint = null }) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--vision-paper,#FCFCFA)] p-6 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="briclog-spinner h-8 w-8 rounded-full border-2 border-[#E7ECE8] border-t-[#03C75A]"
        aria-hidden
      />
      <p className="text-[15px] font-medium text-[#111111]">{message}</p>
      {hint ? (
        <p className="max-w-sm text-[13px] leading-relaxed text-[#5F6B66]">
          {hint}
        </p>
      ) : (
        <p className="max-w-sm text-[13px] leading-relaxed text-[#8A948F]">
          잠시만 기다려 주세요. 네트워크가 느리면 새로고침 후 다시 시도할 수 있습니다.
        </p>
      )}
    </div>
  );
}
