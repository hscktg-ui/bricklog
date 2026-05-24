"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { checkNicknameAvailability } from "@/lib/auth/checkNicknameClient";
import { validateSignupProfilePayload } from "@/lib/auth/signupProfile";
import ProfileSetupFields from "@/components/auth/ProfileSetupFields";
import Logo from "@/components/Logo";

const EMPTY = {
  nickname: "",
  fullName: "",
  contactPhone: "",
  preferredTitle: "디렉터님",
  customTitle: "",
};

export default function ProfileCompletionModal({
  userId,
  onComplete,
  onDefer,
  onToast,
}) {
  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nicknameOk, setNicknameOk] = useState(false);

  const onChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validated = validateSignupProfilePayload(values);
    if (!validated.ok) {
      onToast?.(validated.message, "error");
      return;
    }

    if (!nicknameOk) {
      onToast?.(
        "닉네임 중복 확인이 끝나지 않았습니다. 「사용 가능」이 나올 때까지 기다리거나 「중복 확인」을 눌러 주세요.",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      const nickResult = await checkNicknameAvailability(
        validated.value.nickname,
        { excludeUserId: userId }
      );
      if (!nickResult.available) {
        onToast?.(nickResult.message, "error");
        return;
      }

      await fetchWithAuth("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(validated.value),
      });
      onToast?.("프로필이 저장되었습니다.", "success");
      onComplete?.();
    } catch (err) {
      onToast?.(err.message || "프로필 저장에 실패했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDefer = async (withCooldown = false) => {
    if (withCooldown) {
      setLoading(true);
      try {
        await fetchWithAuth("/api/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({ skipProfileSetup: true }),
        });
      } catch {
        /* still allow dismiss */
      } finally {
        setLoading(false);
      }
    }
    onToast?.(
      withCooldown
        ? "3일 뒤에 다시 안내합니다. 상단 배너에서 언제든 입력할 수 있어요."
        : "글쓰기를 바로 시작할 수 있어요. 상단 배너에서 프로필을 입력할 수 있습니다.",
      "info"
    );
    onDefer?.();
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-complete-title"
        className="pointer-events-auto relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#E8EBED] bg-white shadow-[0_20px_60px_rgba(25,31,40,0.18)]"
      >
        <div className="shrink-0 border-b border-[#E8EBED] bg-[#FAFBFC] px-5 py-4">
          <button
            type="button"
            aria-label="닫기"
            disabled={loading}
            onClick={() => handleDefer(false)}
            className="absolute right-3 top-3 rounded-lg p-2 text-[#8B95A1] hover:bg-white disabled:opacity-50"
          >
            ✕
          </button>

          <div className="flex items-center gap-2.5 pr-8">
            <Logo iconSize={28} showWordmark={false} />
            <div>
              <h2
                id="profile-complete-title"
                className="text-[17px] font-bold text-[#191F28]"
              >
                프로필 (선택)
              </h2>
              <p className="text-[12px] text-[#8B95A1]">
                30초면 끝나요 · 나중에 해도 됩니다
              </p>
            </div>
          </div>

          {!expanded ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="briclog-btn-primary !min-h-0 py-3.5"
              >
                <span>지금 입력하기</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDefer(false)}
                className="briclog-btn-secondary w-full !min-h-0 py-3"
              >
                <span>나중에 — 바로 글쓰기 시작</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!expanded ? (
            <p className="text-[13px] leading-relaxed text-[#4E5968]">
              닉네임·호칭은 인사말에만 씁니다. 입력하지 않아도 채널 선택과
              글쓰기는 지금 바로 할 수 있어요.
            </p>
          ) : (
            <form id="profile-setup-form" onSubmit={handleSubmit} className="space-y-3">
              <ProfileSetupFields
                values={values}
                onChange={onChange}
                disabled={loading}
                excludeUserId={userId}
                onNicknameAvailability={(available, status) =>
                  setNicknameOk(
                    available &&
                      (status === "available" || status === "deferred")
                  )
                }
              />
            </form>
          )}
        </div>

        {expanded ? (
          <div className="shrink-0 space-y-2 border-t border-[#E8EBED] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              form="profile-setup-form"
              disabled={loading || !nicknameOk}
              className="w-full rounded-xl bg-[#03C75A] py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
            >
              {loading ? "저장 중…" : "저장하고 시작"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDefer(false)}
              className="w-full py-2 text-center text-[13px] font-medium text-[#6B7684] hover:text-[#03A94D]"
            >
              나중에 하기
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDefer(true)}
              className="w-full text-center text-[11px] text-[#8B95A1] hover:underline"
            >
              3일 동안 이 안내 보지 않기
            </button>
          </div>
        ) : (
          <div className="shrink-0 border-t border-[#E8EBED]/80 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDefer(true)}
              className="w-full text-center text-[11px] text-[#8B95A1] hover:underline"
            >
              3일 동안 이 안내 보지 않기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
