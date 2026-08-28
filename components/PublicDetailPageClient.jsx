"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import DetailPageGenerator from "@/components/DetailPageGenerator";
import DetailPageMark from "@/components/DetailPageMark";
import DetailPageSampleZone from "@/components/DetailPageSampleZone";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

export default function PublicDetailPageClient() {
  const [user, setUser] = useState(undefined);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const p = DETAIL_PAGE_PRODUCT;

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
        </div>
      </header>
      {user ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DetailPageGenerator onToast={showToast} surface="public" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
          <p className="text-center text-[11px] font-semibold tracking-[0.16em] text-[var(--vision-muted)]">
            {p.eyebrow} · {p.place}
          </p>
          <h1 className="mt-3 text-center text-[26px] font-semibold tracking-tight">
            {p.headline}
            <span className="mt-1 block text-[var(--vision-muted)]">{p.headlineBreak}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed text-[var(--vision-muted)]">
            {p.versusGpt} {p.versusUs}
          </p>
          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <DetailPageSampleZone height={720} />
            <div className="mx-auto w-full max-w-[400px] lg:mx-0">
              {user === undefined ? (
                <p className="rounded-2xl border border-[var(--vision-line)] px-4 py-6 text-center text-[13px] text-[var(--vision-muted)]">
                  로그인 확인 중… 화면은 먼저 보면 됩니다.
                </p>
              ) : (
                <>
                  <p className="mb-6 text-center text-[13px] text-[var(--vision-muted)]">
                    {p.loginTitle}
                    <span className="mt-1 block">{p.loginHint}</span>
                  </p>
                  <AuthForm
                    embedded
                    initialMode="login"
                    authContext="detail_page"
                    onToast={showToast}
                    onAuthSuccess={() => {}}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <footer className="shrink-0 border-t border-[var(--vision-line)] px-4 py-4 text-center text-[12px] text-[var(--vision-muted)] md:px-8">
        <p>
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
