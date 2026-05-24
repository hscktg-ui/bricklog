"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api/clientAuth";

function SuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("결제를 확인하는 중입니다…");
  const [ok, setOk] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");
      const authKey = searchParams.get("authKey");
      const customerKey = searchParams.get("customerKey");

      try {
        let body;
        if (authKey && customerKey) {
          body = { authKey, customerKey };
        } else if (paymentKey && orderId) {
          body = { paymentKey, orderId, amount: Number(amount) };
        } else {
          setOk(false);
          setMessage("결제 정보가 없습니다. 플랜 업그레이드에서 다시 시도해 주세요.");
          return;
        }

        const res = await fetchWithAuth("/api/billing/toss/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (cancelled) return;
        if (res?.ok) {
          setOk(true);
          setMessage(res.userMessage || "플랜이 활성화되었습니다.");
          setTimeout(() => router.replace("/"), 2500);
        } else {
          setOk(false);
          setMessage(res?.userMessage || "결제 확인에 실패했습니다.");
        }
      } catch {
        if (!cancelled) {
          setOk(false);
          setMessage("결제 확인 중 오류가 발생했습니다.");
        }
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p
        className={`text-[15px] font-semibold ${
          ok === true ? "text-[#03A94D]" : ok === false ? "text-[#E74C3C]" : "text-[#4E5968]"
        }`}
      >
        {message}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[#191F28] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[#2d3339]"
      >
        작업 공간으로 이동
      </Link>
    </main>
  );
}

export default function TossBillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center text-[#4E5968]">
          결제를 확인하는 중…
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
