"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import AuthForm from "@/components/AuthForm";
import DetailPageGenerator from "@/components/DetailPageGenerator";
import PageLoadingState from "@/components/ui/PageLoadingState";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  VISION_NAV,
  VISION_NAV_INNER,
  VISION_PAGE,
} from "@/lib/landing/vision2030Styles";

export default function PublicDetailPageClient() {
  const [user, setUser] = useState(undefined);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  useEffect(() => {
    let alive = true;
    let subscription = null;

    if (!isSupabaseConfigured) {
      setUser(null);
      return undefined;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (alive) setUser(null);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user ?? null);
    });
    subscription = data?.subscription ?? null;

    return () => {
      alive = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
  };

  return (
    <div className={`${VISION_PAGE} flex min-h-[100dvh] flex-col`}>
      <header className={VISION_NAV}>
        <div className={VISION_NAV_INNER}>
          <Link href="/" aria-label="브릭로그 홈">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2" aria-label="상세페이지">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--vision-muted)] sm:inline-flex"
            >
              홈
            </Link>
          </nav>
        </div>
      </header>
      {user === undefined ? (
        <PageLoadingState message="로그인 확인 중…" />
      ) : user ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DetailPageGenerator onToast={showToast} />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-4 py-10">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-muted)]">
            상품 상세페이지
          </p>
          <h1 className="mt-3 text-center text-[22px] font-semibold tracking-tight">
            로그인한 뒤 만듭니다
          </h1>
          <p className="mt-2 mb-6 text-center text-[14px] leading-relaxed text-[var(--vision-muted)]">
            상품명과 특징만 있으면 됩니다. 계정으로 들어온 사람은 누구든 만들 수 있습니다.
          </p>
          <AuthForm
            embedded
            initialMode="login"
            authContext="detail_page"
            onToast={showToast}
            onAuthSuccess={() => {}}
          />
        </div>
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
