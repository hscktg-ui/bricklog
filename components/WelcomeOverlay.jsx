"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { WELCOME } from "@/lib/product/craft";
import { maybeStartBgmAfterGestureUnlock } from "@/lib/audio/briclogBgm";
import {
  playConnectSound,
  tryResumeAudioAfterNavigation,
  unlockAudioFromUserGesture,
} from "@/lib/audio/briclogSounds";

export const WELCOME_DISMISS_SESSION_KEY = "briclog-welcome-dismissed";

const AUTO_DISMISS_MS = 1800;

/**
 * 로그인 후 환영 — 5초 자동 닫기 또는 「시작하기」
 * (배경은 비차단 · 카드만 포인터 수신)
 */
export default function WelcomeOverlay({
  open,
  greetingHeadline = null,
  greetingSub = null,
  visitCount = 1,
  lastPost = null,
  onDismiss,
}) {
  const connectPlayedRef = useRef(false);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(WELCOME_DISMISS_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (!open) {
      connectPlayedRef.current = false;
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const resumed = await tryResumeAudioAfterNavigation();
      if (cancelled || !resumed || connectPlayedRef.current) return;
      connectPlayedRef.current = true;
      await playConnectSound();
      await maybeStartBgmAfterGestureUnlock();
    })();
    const t = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, dismiss]);

  if (!open) return null;

  const visitLine =
    visitCount <= 1 ? WELCOME.visitFirst : WELCOME.visitReturn(visitCount);

  const lastPostLine = lastPost ? (
    <>
      지난 글{" "}
      <span className="font-semibold text-[#191F28]">
        「{lastPost.title}」
      </span>
      {lastPost.channel ? (
        <span className="text-[#8B95A1]"> · {lastPost.channel}</span>
      ) : null}
      {lastPost.snippet ? (
        <span className="mt-1 block text-[13px] leading-relaxed text-[#4E5968]">
          {lastPost.snippet}
          <span className="text-[#8B95A1]"> — {WELCOME.lastPostPrompt}</span>
        </span>
      ) : (
        <span className="text-[#4E5968]"> — {WELCOME.lastPostPrompt}</span>
      )}
    </>
  ) : (
    <span className="text-[#4E5968]">{WELCOME.noLastPost}</span>
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[88] flex items-center justify-center p-4 opacity-100 transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-overlay-title"
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div className="pointer-events-auto relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#03C75A]/25 bg-gradient-to-br from-white via-white to-[#E8F9EF] shadow-xl ring-1 ring-black/10 transition-transform duration-200 scale-100">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-[12px] font-medium text-[#8B95A1] hover:bg-white/80 hover:text-[#4E5968]"
        >
          {WELCOME.skip}
        </button>
        <div className="border-b border-[#E8EBED]/80 px-6 py-6 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#03A94D]">
            BRICLOG
          </p>
          <h2
            id="welcome-overlay-title"
            className="mt-2 text-[22px] font-bold leading-snug text-[#191F28] md:text-[26px]"
          >
            {greetingHeadline ? (
              <>
                {greetingHeadline}
                <br />
                <span className="text-[#03A94D]">반갑습니다</span>
              </>
            ) : (
              <span className="text-[#03A94D]">반갑습니다</span>
            )}
          </h2>
          {greetingSub ? (
            <p className="mt-2 text-[14px] leading-relaxed text-[#4E5968]">
              {greetingSub}
            </p>
          ) : null}
          <p className="mt-3 text-[14px] font-medium text-[#4E5968]">
            {visitLine}
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-[#191F28]">
            {lastPostLine}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/70 px-6 py-4 md:px-8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F9EF]">
            <Icon name="sparkles" className="h-5 w-5 text-[#03A94D]" />
          </div>
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-[#8B95A1]">
            {WELCOME.footer}
          </p>
          <button
            type="button"
            onClick={() => {
              unlockAudioFromUserGesture().then(() => {
                if (!connectPlayedRef.current) {
                  connectPlayedRef.current = true;
                  playConnectSound();
                }
              });
              dismiss();
            }}
            className="shrink-0 cursor-pointer rounded-xl bg-[#03C75A] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#02B350]"
          >
            {WELCOME.start}
          </button>
        </div>
      </div>
    </div>
  );
}
