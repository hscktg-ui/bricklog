"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PUBLIC_TEST_HERO } from "@/lib/brand/copy";
import {
  PUBLIC_TEST_PLACEHOLDERS,
  PUBLIC_TEST_QUOTA_EXCEEDED,
  PUBLIC_TEST_BLUR_HINT,
} from "@/lib/publicTest/publicTestConfig";
import { pickPublicTestStep } from "@/lib/publicTest/publicTestSteps";
import {
  bumpLocalPublicTestQuota,
  getLocalPublicTestQuota,
  getPublicTestSessionId,
  stashPublicTestDraftForSignup,
} from "@/lib/publicTest/publicTestQuotaClient";
import { GREEN_CTA_SOLID } from "@/lib/ui/actionButtonStyles";

export default function PublicBrandTestSection({ onSignup }) {
  const [brandName, setBrandName] = useState("");
  const [region, setRegion] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [quota, setQuota] = useState({ remaining: 3, used: 0 });
  const startedAt = useRef(0);
  const timerRef = useRef(null);

  const refreshQuota = useCallback(async () => {
    const local = getLocalPublicTestQuota();
    setQuota((q) => ({ ...q, ...local }));
    try {
      const sessionId = getPublicTestSessionId();
      const res = await fetch(
        `/api/public/brand-test?sessionId=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json();
      if (data?.remaining != null) {
        setQuota({
          remaining: data.remaining,
          used: data.used ?? 0,
        });
      }
    } catch {
      /* local only */
    }
  }, []);

  useEffect(() => {
    refreshQuota();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshQuota]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (quota.remaining <= 0) {
      setError(PUBLIC_TEST_QUOTA_EXCEEDED);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    startedAt.current = Date.now();
    setStepLabel(pickPublicTestStep(0));

    timerRef.current = setInterval(() => {
      setStepLabel(
        pickPublicTestStep(Date.now() - startedAt.current)
      );
    }, 1200);

    try {
      const sessionId = getPublicTestSessionId();
      const res = await fetch("/api/public/brand-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          region: region.trim(),
          topic: topic.trim(),
          sessionId,
        }),
      });
      const data = await res.json();

      if (data.quota) {
        setQuota({
          remaining: data.quota.remaining ?? 0,
          used: data.quota.used ?? 0,
        });
      }

      if (!data.ok) {
        if (data.quotaExceeded) {
          setError(PUBLIC_TEST_QUOTA_EXCEEDED);
        } else {
          setError(data.userMessage || "다시 시도해 주세요.");
        }
        return;
      }

      bumpLocalPublicTestQuota();
      stashPublicTestDraftForSignup({ brandName, region, topic });
      setResult(data);
    } catch {
      setError("잠시 후 다시 시도해 주세요.");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      setStepLabel("");
      refreshQuota();
    }
  };

  const signup = () => {
    stashPublicTestDraftForSignup({ brandName, region, topic });
    onSignup?.("signup");
  };

  return (
    <section
      id="public-brand-test"
      className="scroll-mt-20 border-t border-[#E8EBED] bg-white px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
        <div className="max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03A94D]">
            가입 전 무료 테스트
          </p>
          <h2 className="mt-3 text-[26px] font-bold leading-[1.25] text-[#191F28] md:text-[32px]">
            {PUBLIC_TEST_HERO.headline}
            <br />
            {PUBLIC_TEST_HERO.headlineBreak}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#4E5968]">
            {PUBLIC_TEST_HERO.sub}
          </p>
          <p className="mt-6 text-[13px] leading-relaxed text-[#8B95A1]">
            {PUBLIC_TEST_HERO.signupPhilosophy}
          </p>
          {quota.remaining > 0 ? (
            <p className="mt-3 text-[12px] text-[#8B95A1]">
              오늘 남은 무료 테스트 {quota.remaining}회
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-xl justify-self-center lg:justify-self-end">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#E8EBED] bg-[#FAFBFC] p-5 md:p-6"
          >
            <label className="block">
              <span className="text-[12px] font-semibold text-[#4E5968]">
                브랜드명
              </span>
              <input
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={PUBLIC_TEST_PLACEHOLDERS.brandName}
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-[#E8EBED] bg-white px-4 text-[15px] text-[#191F28] outline-none focus:border-[#03C75A]/50"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[12px] font-semibold text-[#4E5968]">
                지역
              </span>
              <input
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={PUBLIC_TEST_PLACEHOLDERS.region}
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-[#E8EBED] bg-white px-4 text-[15px] text-[#191F28] outline-none focus:border-[#03C75A]/50"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[12px] font-semibold text-[#4E5968]">
                오늘의 주제
              </span>
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={PUBLIC_TEST_PLACEHOLDERS.topic}
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-[#E8EBED] bg-white px-4 text-[15px] text-[#191F28] outline-none focus:border-[#03C75A]/50"
              />
            </label>

            {error ? (
              <p className="mt-4 text-[13px] font-medium text-[#4E5968]">
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="mt-4 text-[13px] text-[#4E5968]">{stepLabel}</p>
            ) : null}

            {quota.remaining <= 0 ? (
              <button
                type="button"
                onClick={signup}
                className={`mt-5 w-full min-h-[48px] ${GREEN_CTA_SOLID}`}
              >
                <span>브랜드 작업실 만들기</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`mt-5 w-full min-h-[48px] ${GREEN_CTA_SOLID} disabled:opacity-50`}
              >
                <span>{PUBLIC_TEST_HERO.cta}</span>
              </button>
            )}
          </form>

          {result?.preview ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8EBED] bg-white">
              <div className="border-b border-[#E8EBED] px-5 py-4">
                <p className="text-[11px] font-semibold text-[#03A94D]">
                  발행 가능 샘플
                </p>
                <h3 className="mt-1 text-[17px] font-bold text-[#191F28]">
                  {result.preview.title}
                </h3>
              </div>
              <div className="space-y-4 px-5 py-4 text-[14px] leading-relaxed text-[#191F28]">
                <p>{result.preview.intro}</p>
                {result.preview.sections?.map((s) => (
                  <div key={s.heading}>
                    <p className="font-semibold">{s.heading}</p>
                    <p className="mt-1 text-[#4E5968]">{s.body}</p>
                  </div>
                ))}
                <p className="text-[#4E5968]">{result.preview.conclusion}</p>
                {result.preview.hashtags?.length ? (
                  <p className="text-[12px] text-[#8B95A1]">
                    {result.preview.hashtags.join(" ")}
                  </p>
                ) : null}
              </div>

              <div
                className="relative border-t border-[#E8EBED] px-5 py-8 text-center"
                aria-hidden
              >
                <div className="pointer-events-none select-none blur-md">
                  <p className="text-[14px] text-[#8B95A1]">
                    전체 본문 · 플레이스 · 인스타 초안 · 브랜드 기록…
                  </p>
                </div>
                <p className="absolute inset-0 flex items-center justify-center px-4 text-[13px] font-medium text-[#4E5968]">
                  {PUBLIC_TEST_BLUR_HINT}
                </p>
              </div>

              {result.metrics ? (
                <div className="grid gap-3 border-t border-[#E8EBED] bg-[#FAFBFC] px-5 py-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[#8B95A1]">
                      브랜드 이해도
                    </p>
                    <p className="text-[20px] font-bold text-[#191F28]">
                      {result.metrics.brandUnderstandingPct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#8B95A1]">
                      발행 가능 점수
                    </p>
                    <p className="text-[20px] font-bold text-[#191F28]">
                      {result.metrics.publishScore}점
                    </p>
                  </div>
                  <div className="sm:col-span-1">
                    <p className="text-[10px] font-semibold text-[#8B95A1]">
                      개선 포인트
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#4E5968]">
                      {result.metrics.improvementHint}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-[#E8EBED] px-5 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={signup}
                  className={`min-h-[44px] flex-1 ${GREEN_CTA_SOLID}`}
                >
                  <span>무료로 계속하기</span>
                </button>
                <button
                  type="button"
                  onClick={signup}
                  className="min-h-[44px] flex-1 rounded-xl border border-[#191F28] bg-white px-4 text-[13px] font-semibold text-[#191F28] hover:bg-[#F7F8FA]"
                >
                  브랜드 작업실 만들기
                </button>
              </div>
              <p className="border-t border-[#E8EBED] px-5 py-3 text-center text-[12px] text-[#8B95A1]">
                {PUBLIC_TEST_HERO.signupSave}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
