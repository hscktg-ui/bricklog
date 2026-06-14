"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { PUBLIC_TEST_HERO } from "@/lib/brand/copy";
import {
  PUBLIC_TEST_QUOTA_EXCEEDED,
  PUBLIC_TEST_GATE_FAIL_SIGNUP_HINT,
  PUBLIC_TEST_BLUR_HINT,
  PUBLIC_TEST_TOPIC_HINT,
  PUBLIC_TEST_TIME_HINT,
  PUBLIC_TEST_LOADING_MESSAGE,
  PUBLIC_TEST_SAMPLE_BADGE,
} from "@/lib/publicTest/publicTestConfig";
import {
  getNextPublicTestSampleIndex,
} from "@/lib/publicTest/pickPublicTestSample";
import { getPublicTestSampleByIndex } from "@/lib/publicTest/publicTestSamples";
import {
  resolvePublicTestFormPrefill,
} from "@/lib/publicTest/resolvePublicTestFormPrefill";
import { savePublicTestFormCache } from "@/lib/publicTest/publicTestFormCache";
import {
  bumpLocalPublicTestQuota,
  getLocalPublicTestQuota,
  getPublicTestSessionId,
  stashPublicTestDraftForSignup,
} from "@/lib/publicTest/publicTestQuotaClient";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_GHOST_BTN,
  VISION_INPUT,
  VISION_PANEL,
  VISION_SECTION,
  VISION_STATUS_NEUTRAL,
} from "@/lib/landing/vision2030Styles";
import PublicTestContextScore from "@/components/landing/public-test/PublicTestContextScore";
import PublicTestLoadingProgress from "@/components/landing/public-test/PublicTestLoadingProgress";

export default function PublicBrandTestSection({ onSignup }) {
  const [brandName, setBrandName] = useState("");
  const [region, setRegion] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [quota, setQuota] = useState({ remaining: 3, used: 0 });
  const [sampleIdx, setSampleIdx] = useState(0);
  const [sampleReady, setSampleReady] = useState(false);
  const [prefillSource, setPrefillSource] = useState("rotation");
  const activeSample = getPublicTestSampleByIndex(sampleIdx);

  const applySampleToForm = useCallback((sample) => {
    if (!sample?.brandName) return;
    setBrandName(sample.brandName);
    setRegion(sample.region);
    setTopic(sample.topic);
  }, []);

  useLayoutEffect(() => {
    const prefill = resolvePublicTestFormPrefill();
    setSampleIdx(prefill.index ?? 0);
    setBrandName(prefill.brandName);
    setRegion(prefill.region);
    setTopic(prefill.topic);
    setPrefillSource(prefill.source);
    setSampleReady(true);
  }, []);

  useEffect(() => {
    if (!sampleReady) return;
    const timer = window.setTimeout(() => {
      savePublicTestFormCache({
        brandName,
        region,
        topic,
        sampleId: activeSample?.id,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [brandName, region, topic, sampleReady, activeSample?.id]);

  const cycleSample = () => {
    setSampleIdx((idx) => {
      const next = getNextPublicTestSampleIndex(idx);
      const sample = getPublicTestSampleByIndex(next);
      applySampleToForm(sample);
      savePublicTestFormCache({
        brandName: sample.brandName,
        region: sample.region,
        topic: sample.topic,
        sampleId: sample.id,
      });
      setPrefillSource("rotation");
      return next;
    });
    setError(null);
    setResult(null);
  };

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
  }, [refreshQuota]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStepLabel(PUBLIC_TEST_LOADING_MESSAGE);

    try {
      const sessionId = getPublicTestSessionId();
      const res = await fetch("/api/public/brand-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          region: region.trim(),
          topic: topic.trim(),
          sampleId: activeSample?.id,
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

      if (!data.instantQuotaBypass) {
        bumpLocalPublicTestQuota();
      }
      stashPublicTestDraftForSignup({ brandName, region, topic });
      savePublicTestFormCache({
        brandName,
        region,
        topic,
        sampleId: activeSample?.id,
      });
      setResult(data);
    } catch {
      setError("잠시 후 다시 시도해 주세요.");
    } finally {
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
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div className="max-w-lg">
          <p className={VISION_EYEBROW}>Free test</p>
          <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-[1.12] tracking-tight text-[var(--vision-ink)]">
            {PUBLIC_TEST_HERO.headline}
            <span className="block text-[var(--vision-muted)]">
              {PUBLIC_TEST_HERO.headlineBreak}
            </span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[var(--vision-muted)]">
            {PUBLIC_TEST_HERO.sub}
          </p>
          <p className="mt-6 text-[14px] leading-relaxed text-[var(--vision-muted)]/80">
            {PUBLIC_TEST_HERO.signupPhilosophy}
          </p>
          {quota.remaining > 0 ? (
            <p className="mt-4 text-[13px] text-[var(--vision-muted)]">
              오늘 남은 무료 테스트 {quota.remaining}회
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-xl justify-self-center lg:justify-self-end">
          {sampleReady ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="flex-1 rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#F7F8FA)] px-3 py-2.5 text-[13px] text-[var(--vision-muted)]">
                <span className="font-semibold text-[var(--vision-ink)]">
                  {activeSample.brandName}
                </span>
                <span className="text-[var(--vision-muted)]"> · </span>
                {activeSample.region}
                <span className="text-[var(--vision-muted)]"> · </span>
                {activeSample.topic}
              </p>
              <span className="shrink-0 rounded-full border border-[var(--vision-accent-ring,rgba(3,199,90,0.25))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.12))] px-3 py-1.5 text-[11px] font-bold text-[var(--vision-accent)]">
                {PUBLIC_TEST_SAMPLE_BADGE}
              </span>
            </div>
          ) : null}
          {sampleReady ? (
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--vision-muted)]">
                {prefillSource === "cache"
                  ? "이 브라우저에 저장된 마지막 입력을 불러왔어요"
                  : "접속할 때마다 다른 가상 브랜드 예시가 보입니다"}
              </p>
              <button
                type="button"
                onClick={cycleSample}
                disabled={loading}
                className="shrink-0 text-[12px] font-semibold text-[var(--vision-accent)] hover:underline disabled:opacity-50"
              >
                다른 예시 보기
              </button>
            </div>
          ) : null}
          <form
            onSubmit={handleSubmit}
            className={`${VISION_PANEL} p-6 md:p-7`}
          >
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]">
                브랜드명
              </span>
              <input
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={activeSample.brandName}
                className={VISION_INPUT}
              />
            </label>
            <label className="mt-5 block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]">
                지역
              </span>
              <input
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={activeSample.region}
                className={VISION_INPUT}
              />
            </label>
            <label className="mt-5 block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]">
                오늘의 주제
              </span>
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={activeSample.topic}
                className={VISION_INPUT}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--vision-muted)]">
                {PUBLIC_TEST_TOPIC_HINT}
              </p>
            </label>

            {error ? (
              <div className={`${VISION_STATUS_NEUTRAL} mt-4 space-y-3 px-4 py-3`}>
                <div className="space-y-1.5 text-[13px] font-medium text-[var(--vision-muted)]">
                  {error.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                {error.includes("구체적") ||
                error.includes("예시") ||
                error === PUBLIC_TEST_QUOTA_EXCEEDED ? (
                  <p className="text-[12px] text-[var(--vision-muted)]">
                    {error === PUBLIC_TEST_QUOTA_EXCEEDED
                      ? PUBLIC_TEST_HERO.signupPhilosophy
                      : PUBLIC_TEST_GATE_FAIL_SIGNUP_HINT}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={signup}
                  className={`${VISION_CTA_ACCENT} w-full min-h-[48px]`}
                >
                  <span>
                    {error === PUBLIC_TEST_QUOTA_EXCEEDED
                      ? "브랜드 작업실 만들기"
                      : "가입 후 전체 생성 이어가기"}
                  </span>
                </button>
              </div>
            ) : null}

            {loading ? (
              <PublicTestLoadingProgress
                active={loading}
                message={stepLabel || PUBLIC_TEST_LOADING_MESSAGE}
              />
            ) : (
              <p className="mt-4 text-[12px] text-[var(--vision-muted)]">{PUBLIC_TEST_TIME_HINT}</p>
            )}

            {quota.remaining <= 0 ? (
              <button
                type="button"
                onClick={signup}
                className={`${VISION_CTA_ACCENT} mt-5 w-full min-h-[48px]`}
              >
                <span>브랜드 작업실 만들기</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`${VISION_CTA_ACCENT} mt-6 w-full min-h-[52px] disabled:opacity-50`}
              >
                <span>{PUBLIC_TEST_HERO.cta}</span>
              </button>
            )}
          </form>

          {result?.preview ? (
            <div className={`${VISION_PANEL} mt-6`}>
              <div className="border-b border-[var(--vision-line)] px-5 py-4">
                <p className="text-[11px] font-semibold text-[var(--vision-accent)]">
                  발행 가능 샘플
                </p>
                <h3 className="mt-1 text-[17px] font-bold text-[var(--vision-ink)]">
                  {result.preview.title}
                </h3>
              </div>
              <div className="space-y-4 px-5 py-4 text-[14px] leading-relaxed text-[var(--vision-ink)]">
                <p>{result.preview.intro}</p>
                {result.preview.sections?.map((s) => (
                  <div key={s.heading}>
                    <p className="font-semibold">{s.heading}</p>
                    <p className="mt-1 text-[var(--vision-muted)]">{s.body}</p>
                  </div>
                ))}
                <p className="text-[var(--vision-muted)]">{result.preview.conclusion}</p>
                {result.preview.hashtags?.length ? (
                  <p className="text-[12px] text-[var(--vision-muted)]">
                    {result.preview.hashtags.join(" ")}
                  </p>
                ) : null}
              </div>

              <div
                className="relative border-t border-[var(--vision-line)] px-5 py-8 text-center"
                aria-hidden
              >
                <div className="pointer-events-none select-none blur-md">
                  <p className="text-[14px] text-[var(--vision-muted)]">
                    전체 본문 · 플레이스 · 인스타 초안 · 브랜드 기록…
                  </p>
                </div>
                <p className="absolute inset-0 flex items-center justify-center px-4 text-[13px] font-medium text-[var(--vision-muted)]">
                  {PUBLIC_TEST_BLUR_HINT}
                </p>
              </div>

              {result.metrics?.contextScore ? (
                <PublicTestContextScore
                  contextScore={result.metrics.contextScore}
                />
              ) : null}

              <div className="flex flex-col gap-2 border-t border-[var(--vision-line)] px-5 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={signup}
                  className={`${VISION_CTA_ACCENT} min-h-[44px] flex-1`}
                >
                  <span>무료로 계속하기</span>
                </button>
                <button
                  type="button"
                  onClick={signup}
                  className={`${VISION_GHOST_BTN} min-h-[44px] flex-1`}
                >
                  브랜드 작업실 만들기
                </button>
              </div>
              <p className="border-t border-[var(--vision-line)] px-5 py-3 text-center text-[12px] text-[var(--vision-muted)]">
                {PUBLIC_TEST_HERO.signupSave}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
