"use client";

export default function Error({ error, reset }) {
  const devDetail =
    process.env.NODE_ENV === "development" ? error?.message : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F8FA] p-6 text-center">
      <p className="text-[18px] font-bold text-[#191F28]">잠시 연결이 끊겼습니다</p>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#4E5968]">
        새로고침하거나 잠시 후 다시 시도해 주세요. 같은 현상이 반복되면 고객 문의로
        알려 주시면 빠르게 확인하겠습니다.
      </p>
      {devDetail ? (
        <p className="mt-3 max-w-md font-mono text-[11px] text-[#B0B8C1]">{devDetail}</p>
      ) : null}
      {process.env.NODE_ENV === "development" && error?.digest ? (
        <p className="mt-1 font-mono text-[11px] text-[#B0B8C1]">{error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-[#03C75A] px-6 py-2.5 text-[14px] font-semibold text-white shadow-[0_3px_14px_rgba(3,199,90,0.28)]"
      >
        다시 시도
      </button>
    </div>
  );
}
