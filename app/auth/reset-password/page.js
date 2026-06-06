import { Suspense } from "react";
import ResetPasswordPageClient from "./ResetPasswordPageClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-[14px] text-[#8B95A1]">
          비밀번호 재설정을 준비하는 중…
        </div>
      }
    >
      <ResetPasswordPageClient />
    </Suspense>
  );
}