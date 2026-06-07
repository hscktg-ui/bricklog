"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  QUICK_PROMPTS,
  QUICK_TEXT,
  PROMPT_CATEGORIES,
} from "@/lib/assistant/knowledge";
import { getWelcomeMessage } from "@/lib/assistant/matchTopic";
import { plainReply } from "@/lib/assistant/plainReply";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  ASSIST_FAB_IDLE,
  ASSIST_FAB_SHELL,
  ASSIST_FAB_SIDE,
  ASSIST_FAB_SIZE,
  assistFabBottom,
} from "@/lib/ui/assistFabLayout";

export default function BriclogAssistant({
  hasBlog = false,
  hidden = false,
  layout = "workspace",
}) {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoggedIn(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data?.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getSession().then(({ data }) => {
        const signedIn = !!data?.session?.user;
        setLoggedIn(signedIn);
        if (signedIn) setOpen(false);
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const resetToHome = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: plainReply(getWelcomeMessage({ loggedIn })),
      },
    ]);
    setShowQuickPrompts(true);
    setInput("");
  }, [loggedIn]);

  useEffect(() => {
    if (open && messages.length === 0) {
      resetToHome();
    }
  }, [open, resetToHome, messages.length]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open, showQuickPrompts]);

  const sendMessage = useCallback(
    async (text, { fromQuick = false } = {}) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || loading) return;

      if (fromQuick) {
        setShowQuickPrompts(false);
      }

      const history = messages.slice(-8);
      const userMsg = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const headers = { "Content-Type": "application/json" };
        if (isSupabaseConfigured) {
          const { data: session } = await supabase.auth.getSession();
          const token = session?.session?.access_token;
          if (token) headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: trimmed,
            history,
            hasBlog,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.userMessage || "답변을 받지 못했습니다.");
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: plainReply(
              data.reply || "답변을 준비하지 못했습니다."
            ),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              err.message ||
              "잠시 후 다시 시도해 주세요. 아래 「추천 질문」에서 다시 고를 수 있습니다.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, hasBlog]
  );

  const hasConversation =
    messages.length > 1 ||
    (messages.length === 1 && messages[0]?.role === "user");

  if (hidden) return null;

  const fabBottom = assistFabBottom(layout === "landing" ? "landing" : "workspace");
  const fabPosClass = `${ASSIST_FAB_SIDE} ${fabBottom.help}`;

  return (
    <>
      {open ? (
        <div
          className="pointer-events-none fixed inset-0 z-[88] bg-black/25"
          aria-hidden
        />
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="BRICLOG 도움말 열기"
          className={`fixed z-[89] ${fabPosClass} ${ASSIST_FAB_SIZE} ${ASSIST_FAB_SHELL} ${ASSIST_FAB_IDLE}`}
        >
          <span className="text-[20px] font-bold text-[#03A94D]" aria-hidden>
            ?
          </span>
        </button>
      ) : (
      <div
        className="pointer-events-auto fixed z-[89] flex flex-col overflow-hidden border border-[#E8EBED] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-[transform,opacity] duration-200 bottom-0 left-0 right-0 h-[min(82dvh,560px)] rounded-t-2xl pb-[env(safe-area-inset-bottom)] sm:bottom-6 sm:left-auto sm:right-6 sm:h-[min(72dvh,520px)] sm:w-[400px] sm:rounded-2xl sm:pb-0"
      >
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-[#E8EBED] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#191F28]">도움말</p>
                <p className="truncate text-[11px] text-[#8B95A1]">
                  더 맞추기·채널·플랜·한도 안내
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {hasConversation && (
                  <button
                    type="button"
                    onClick={resetToHome}
                    className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#03A94D] hover:bg-[#F7F8FA]"
                  >
                    처음으로
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  className="rounded-lg p-2 text-[#8B95A1] hover:bg-[#F7F8FA]"
                >
                  ✕
                </button>
              </div>
            </header>

            <div
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
            >
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={`${i}-${m.role}`}
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "ml-auto bg-[#03C75A] text-white"
                        : "mr-auto bg-[#F2F4F6] text-[#191F28]"
                    }`}
                  >
                    {plainReply(m.content)}
                  </div>
                ))}
                {loading && (
                  <p className="text-[13px] text-[#8B95A1]">답변 준비 중…</p>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-[#E8EBED] bg-white">
              {showQuickPrompts && !loading && (
                <div className="max-h-[min(28vh,200px)] overflow-y-auto px-3 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[#6B7684]">
                      추천 질문
                    </p>
                    {hasConversation && (
                      <button
                        type="button"
                        onClick={() => setShowQuickPrompts(false)}
                        className="text-[11px] text-[#8B95A1] hover:text-[#03A94D]"
                      >
                        접기
                      </button>
                    )}
                  </div>
                  {PROMPT_CATEGORIES.map((cat) => {
                    const items = QUICK_PROMPTS.filter(
                      (q) => q.category === cat.id
                    );
                    if (!items.length) return null;
                    return (
                      <div key={cat.id} className="mb-2.5 last:mb-0">
                        <p className="mb-1 text-[10px] font-medium text-[#8B95A1]">
                          {cat.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((q) => (
                            <button
                              key={q.id}
                              type="button"
                              disabled={loading}
                              onClick={() =>
                                sendMessage(QUICK_TEXT[q.id] || q.label, {
                                  fromQuick: true,
                                })
                              }
                              className="briclog-pressable rounded-full border border-[#E8EBED] bg-[#FAFBFC] px-3 py-1.5 text-[12px] font-medium text-[#4E5968] transition active:brightness-[0.97] hover:border-[#03C75A] hover:bg-[#F6FDF9] disabled:opacity-50"
                            >
                              <span>{q.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!showQuickPrompts && !loading && (
                <div className="flex justify-center px-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickPrompts(true)}
                    className="text-[12px] font-medium text-[#03A94D] hover:underline"
                  >
                    추천 질문 보기
                  </button>
                </div>
              )}

              <form
                className="flex gap-2 p-3 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="예: 월 콘텐츠 한도가 궁금해요"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#03C75A] focus:ring-2 focus:ring-[#03C75A]/15"
                  maxLength={1500}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="briclog-pressable min-h-[44px] shrink-0 rounded-xl bg-[#03C75A] px-4 text-[14px] font-semibold text-white transition active:brightness-[0.97] disabled:opacity-50"
                >
                  <span>전송</span>
                </button>
              </form>
            </div>
          </>
      </div>
      )}
    </>
  );
}
