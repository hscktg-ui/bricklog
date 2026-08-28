"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import DetailPageGenerator from "@/components/DetailPageGenerator";
import DetailPageMark from "@/components/DetailPageMark";
import PageLoadingState from "@/components/ui/PageLoadingState";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

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
    <div className="detail-page-app flex min-h-[100dvh] flex-col text-[var(--vision-ink)]">
      <header className="sticky top-0 z-30 border-b border-[var(--vision-line)] bg-[var(--vision-paper)]/92 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <DetailPageMark />
          <nav className="flex items-center gap-2" aria-label={DETAIL_PAGE_PRODUCT.name}>
            <Link
              href="/"
              className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--vision-muted)]"
            >
              {DETAIL_PAGE_PRODUCT.homeLabel}
            </Link>
          </nav>
        </div>
      </header>
      {user === undefined ? (
        <PageLoadingState message="로그인 확인 중…" />
      ) : user ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DetailPageGenerator onToast={showToast} surface="public" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-4 py-10">
          <p className="text-center text-[11px] font-semibold tracking-[0.16em] text-[var(--vision-muted)]">
            {DETAIL_PAGE_PRODUCT.place}
          </p>
          <h1 className="mt-3 text-center text-[28px] font-semibold tracking-tight">
            {DETAIL_PAGE_PRODUCT.name}
          </h1>
          <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--vision-muted)]">
            {DETAIL_PAGE_PRODUCT.promise}
          </p>
          <p className="mt-2 mb-6 text-center text-[13px] leading-relaxed text-[var(--vision-muted)]">
            {DETAIL_PAGE_PRODUCT.loginHint}
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
      <footer className="shrink-0 border-t border-[var(--vision-line)] px-4 py-4 text-center text-[12px] text-[var(--vision-muted)] md:px-8">
        <p>
          {DETAIL_PAGE_PRODUCT.accountLabel}으로 사용합니다.{" "}
          <Link href="/terms" className="underline-offset-2 hover:underline">
            이용약관
          </Link>
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            개인정보처리방침
          </Link>
        </p>
      </footer>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
