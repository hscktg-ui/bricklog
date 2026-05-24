export default function Toast({ toast, visible, message, type }) {
  const resolved = toast ?? { visible, message, type };
  if (!resolved?.visible) return null;

  const isError = resolved.type === "error";
  const isSuccess = resolved.type === "success";

  return (
    <div
      className="toast-enter fixed bottom-[calc(var(--workspace-mobile-nav-h)+5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[100] lg:bottom-6 lg:left-1/2 lg:right-auto lg:max-w-md lg:-translate-x-1/2 xl:left-auto xl:right-6 xl:translate-x-0"
      role="status"
      aria-live={isError ? "assertive" : "polite"}
    >
      <div
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
          isError
            ? "bg-[#FFF5F5] text-[#E42939] ring-[#FFD6D9]"
            : isSuccess
              ? "bg-[#E8F9EF] text-[#03A94D] ring-[#B8EBCF]"
              : "bg-white text-[#191F28] ring-[#E8EBED]"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            isError ? "bg-[#E42939]" : "bg-[#03C75A]"
          }`}
        />
        {resolved.message}
      </div>
    </div>
  );
}
