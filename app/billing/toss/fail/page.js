"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function FailInner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message =
    searchParams.get("message") || "결제가 완료되지 않았습니다.";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-[18px] font-bold text-[#191F28]">결제 실패</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-[#4E5968]">{message}</p>
      {code && (
        <p className="mt-2 text-[12px] text-[#8B95A1]">코드: {code}</p>
      )}
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[#03C75A] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[#02B350]"
      >
        작업 공간으로 돌아가기
      </Link>
    </main>
  );
}

export default function TossBillingFailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center text-[#4E5968]">
          로딩 중…
        </main>
      }
    >
      <FailInner />
    </Suspense>
  );
}
