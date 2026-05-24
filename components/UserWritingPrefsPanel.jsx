"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/lib/user/userPreferences";
import { EMOJI_DENSITY_OPTIONS } from "@/lib/emoji/emojiDensityEngine";

const fieldClass =
  "w-full rounded-md border border-[#E8EBED] bg-white px-2 py-1.5 text-[12px] text-[#191F28] focus:border-[#03C75A] focus:outline-none";

const SPEECH_OPTIONS = [
  { value: "", label: "자동" },
  { value: "friendly_blog", label: "친근한 블로그체" },
  { value: "warm_story", label: "따뜻한 스토리" },
  { value: "plain_notice", label: "담백한 공지" },
];

export default function UserWritingPrefsPanel({
  userId,
  onToast,
  defaultOpen = false,
  summaryLine,
  embedded = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [prefs, setPrefs] = useState(loadUserPreferences(userId));
  const [serverBrief, setServerBrief] = useState("");
  const [saving, setSaving] = useState(false);

  const loadServer = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchWithAuth("/api/personalization/profile");
      if (data.brief) setServerBrief(data.brief);
    } catch {
      /* schema optional */
    }
  }, [userId]);

  useEffect(() => {
    setPrefs(loadUserPreferences(userId));
    loadServer();
  }, [userId, loadServer]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    saveUserPreferences(userId, {
      defaultSpeechStyle: prefs.defaultSpeechStyle,
      defaultEmojiDensity: prefs.defaultEmojiDensity,
      writingNote: prefs.writingNote,
    });
    try {
      await fetchWithAuth("/api/personalization/profile", {
        method: "PATCH",
        body: JSON.stringify({
          defaultSpeechStyle: prefs.defaultSpeechStyle || undefined,
          defaultEmojiDensity: prefs.defaultEmojiDensity || undefined,
          writingNote: prefs.writingNote || undefined,
        }),
      });
      await loadServer();
      onToast?.("계정 글쓰기 설정이 저장되었습니다.", "success");
    } catch (err) {
      onToast?.(err.message || "저장 실패", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) return null;

  const wrap = embedded ? "" : "border-b border-[#E8EBED] px-3 pb-3";

  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-0.5 text-left"
      >
        <span className="flex w-full items-center justify-between text-[12px] font-semibold text-[#191F28]">
          {embedded ? "계정 문체" : "내 글쓰기 습관"}
          <span className="text-[11px] font-normal text-[#8B95A1]">
            {open ? "접기" : "펼치기"}
          </span>
        </span>
        {!open && summaryLine && (
          <span className="line-clamp-2 text-[12px] leading-snug text-[#4E5968]">
            {summaryLine}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-[#E8EBED] bg-[#F7F8FA] p-2">
          <p className="text-[10px] text-[#8B95A1]">
            모든 브랜드에 공통 적용되는 기본 톤입니다. 닉네임·연락처는 하단
            「프로필 설정」에서, 브랜드별 톤은 「브랜드 기억·습관」에서
            관리하세요.
          </p>
          {serverBrief ? (
            <p className="rounded bg-white px-2 py-1.5 text-[10px] text-[#4E5968]">
              학습됨: {serverBrief}
            </p>
          ) : null}
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            기본 문체
            <select
              className={`${fieldClass} mt-0.5`}
              value={prefs.defaultSpeechStyle || ""}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  defaultSpeechStyle: e.target.value,
                }))
              }
            >
              {SPEECH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            기본 이모지
            <select
              className={`${fieldClass} mt-0.5`}
              value={prefs.defaultEmojiDensity || ""}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  defaultEmojiDensity: e.target.value,
                }))
              }
            >
              <option value="">자동</option>
              {EMOJI_DENSITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            메모
            <textarea
              className={`${fieldClass} mt-0.5 min-h-[40px]`}
              value={prefs.writingNote || ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, writingNote: e.target.value }))
              }
              placeholder="예: 문장은 짧게, 과장 표현 싫어함"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="w-full rounded-md bg-[#03C75A] py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      )}
    </div>
  );
}
