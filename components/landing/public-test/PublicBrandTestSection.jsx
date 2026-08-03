"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  PUBLIC_TEST_HERO,
  PUBLIC_TEST_SIGNUP_UNLOCKS,
  PUBLIC_TEST_RESULT_SIGNUP_CTA,
} from "@/lib/brand/copy";
import {
  PUBLIC_TEST_QUOTA_EXCEEDED,
  PUBLIC_TEST_QUOTA_SIGNUP_HEADLINE,
  PUBLIC_TEST_QUOTA_SIGNUP_SUB,
  PUBLIC_TEST_QUOTA_SIGNUP_CTA,
  PUBLIC_TEST_ERROR_SIGNUP_SUB,
  resolvePublicTestErrorSignupCta,
  PUBLIC_TEST_BLUR_HINT,
  PUBLIC_TEST_TOPIC_HINT,
  PUBLIC_TEST_TIME_HINT,
  PUBLIC_TEST_TRY_SAMPLE_CTA,
  PUBLIC_TEST_LOADING_MESSAGE,
  PUBLIC_TEST_SAMPLE_BADGE,
  PUBLIC_TEST_DEMO_FALLBACK_BADGE,
  PUBLIC_TEST_CHANNEL_HEADLINE,
  PUBLIC_TEST_SIGNUP_GAP_HEADLINE,
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
  VISION_CTA_GHOST,
  VISION_EYEBROW,
  VISION_INPUT,
  VISION_PANEL,
  VISION_SECTION,
  VISION_STATUS_NEUTRAL,
} from "@/lib/landing/vision2030Styles";
import PublicTestContextScore from "@/components/landing/public-test/PublicTestContextScore";
import PublicTestReflectionChips from "@/components/landing/public-test/PublicTestReflectionChips";
import PublicTestLoadingProgress from "@/components/landing/public-test/PublicTestLoadingProgress";
import {
  SampleInstaPreview,
  SamplePlacePreview,
} from "@/components/landing/SamplePreviewBlocks";
import PublicTestSignupStickyBar from "@/components/landing/public-test/PublicTestSignupStickyBar";
import { recordSignupIntent } from "@/lib/analytics/signupIntent";

function QuotaSignupPanel({ onSignup }) {
  return (
    <div className={`${VISION_STATUS_NEUTRAL} mt-5 space-y-3 px-4 py-4`}>
      <p className="text-[14px] font-semibold text-[var(--vision-ink)]">
        {PUBLIC_TEST_QUOTA_SIGNUP_HEADLINE}
      </p>
      <p className="text-[12px] leading-relaxed text-[var(--vision-muted)]">
        {PUBLIC_TEST_QUOTA_SIGNUP_SUB}
      </p>
      <ul className="space-y-1.5 text-[12px] text-[var(--vision-muted)]">
        {PUBLIC_TEST_SIGNUP_UNLOCKS.slice(0, 3).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[var(--vision-accent)]" aria-hidden>
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSignup}
        className={`${VISION_CTA_ACCENT} w-full min-h-[48px]`}
      >
        <span>{PUBLIC_TEST_QUOTA_SIGNUP_CTA}</span>
      </button>
    </div>
  );
}

export default function PublicBrandTestSection({ onSignup, onPreviewActiveChange }) {
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
  const [channelTab, setChannelTab] = useState("blog");
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
    if (result?.preview) setChannelTab("blog");
  }, [result]);

  useEffect(() => {
    onPreviewActiveChange?.(Boolean(result?.preview));
  }, [result?.preview, onPreviewActiveChange]);

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

  const signup = (source = "public_test") => {
    stashPublicTestDraftForSignup({ brandName, region, topic });
    recordSignupIntent(source);
    onSignup?.("signup");
  };

  const tryVirtualSample = () => {
    setError(null);
    setResult(null);
    cycleSample();
  };

  const isGateFail =
    error &&
    error !== PUBLIC_TEST_QUOTA_EXCEEDED &&
    (error.includes("구체적") || error.includes("예시") || error.includes("다시"));

  const quotaExhausted =
    quota.remaining <= 0 || error === PUBLIC_TEST_QUOTA_EXCEEDED;

  const previewChannelReady = result?.preview
    ? {
        blog: true,
        place: Boolean(result.preview.place),
        insta: Boolean(result.preview.insta),
      }
    : {};

  const channelTabs = result?.preview
    ? [
        { id: "blog", label: "이야기", ready: true },
        {
          id: "place",
          label: "플레이스",
          ready: Boolean(result.preview.place),
        },
        {
          id: "insta",
          label: "인스타",
          ready: Boolean(result.preview.insta),
        },
      ]
    : [];

  return (
    <>
    <section
      id="public-brand-test"
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-16 md:px-8 md:py-24 ${
        result?.preview ? "pb-32 sm:pb-36" : ""
      }`}
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div className="max-w-lg">
          <p className={VISION_EYEBROW}>샘플 체험</p>
          <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-[1.12] tracking-tight text-[var(--vision-ink)]">
            {PUBLIC_TEST_HERO.headline}
            <span className="block text-[var(--vision-muted)]">
              {PUBLIC_TEST_HERO.headlineBreak}
            </span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[var(--vision-muted)]">
            {PUBLIC_TEST_HERO.sub}
          </p>
          <p className="mt-6 hidden text-[14px] leading-relaxed text-[var(--vision-muted)]/80 md:block">
            {PUBLIC_TEST_HERO.signupPhilosophy}
          </p>
          {quota.remaining > 0 ? (
            <p className="mt-4 text-[13px] text-[var(--vision-muted)]">
              오늘 남은 샘플 {quota.remaining}회
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-xl justify-self-center lg:justify-self-end">
          {sampleReady ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="flex-1 rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg)] px-3 py-2.5 text-[13px] text-[var(--vision-muted)]">
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
            <div className="mb-3 flex items-center justify-end gap-2">
              <p className="hidden flex-1 text-[11px] text-[var(--vision-muted)] sm:block">
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
            data-briclog-public-test-form-ready={sampleReady ? "1" : undefined}
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

            {error && error !== PUBLIC_TEST_QUOTA_EXCEEDED ? (
              <div className={`${VISION_STATUS_NEUTRAL} mt-4 space-y-3 px-4 py-3`}>
                <div className="space-y-1.5 text-[13px] font-medium text-[var(--vision-muted)]">
                  {error.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--vision-muted)]">
                  {PUBLIC_TEST_ERROR_SIGNUP_SUB}
                </p>
                <ul className="space-y-1.5 text-[12px] text-[var(--vision-muted)]">
                  {PUBLIC_TEST_SIGNUP_UNLOCKS.slice(0, 2).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[var(--vision-accent)]" aria-hidden>
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => signup("public_test_error")}
                  className={`${VISION_CTA_ACCENT} w-full min-h-[48px]`}
                >
                  <span>{resolvePublicTestErrorSignupCta(brandName)}</span>
                </button>
                {isGateFail ? (
                  <button
                    type="button"
                    onClick={tryVirtualSample}
                    className={`${VISION_CTA_GHOST} w-full min-h-[44px]`}
                  >
                    <span>{PUBLIC_TEST_TRY_SAMPLE_CTA}</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {error === PUBLIC_TEST_QUOTA_EXCEEDED ? (
              <p className="mt-4 text-[13px] leading-relaxed text-[var(--vision-muted)]">
                {PUBLIC_TEST_QUOTA_EXCEEDED}
              </p>
            ) : null}

            {loading ? (
              <PublicTestLoadingProgress
                active={loading}
                message={stepLabel || PUBLIC_TEST_LOADING_MESSAGE}
              />
            ) : (
              <p className="mt-4 text-[12px] text-[var(--vision-muted)]">{PUBLIC_TEST_TIME_HINT}</p>
            )}

            {quotaExhausted ? (
              <QuotaSignupPanel onSignup={() => signup("public_test_quota")} />
            ) : (
              <button
                type="submit"
                data-briclog-public-test-submit="1"
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
                <p
                  className="text-[11px] font-semibold text-[var(--vision-accent)]"
                  data-briclog-public-test-preview="1"
                >
                  {result.demoFallback
                    ? PUBLIC_TEST_DEMO_FALLBACK_BADGE
                    : "발행 가능 샘플"}
                </p>
                <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
                  {PUBLIC_TEST_CHANNEL_HEADLINE}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {channelTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={!tab.ready}
                      onClick={() => tab.ready && setChannelTab(tab.id)}
                      className={`min-h-[44px] rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                        !tab.ready
                          ? "cursor-not-allowed border border-dashed border-[var(--vision-line)] bg-transparent text-[var(--vision-muted)]/50"
                          : channelTab === tab.id
                            ? "bg-[var(--vision-accent)] text-white"
                            : "bg-[var(--vision-surface)] text-[var(--vision-muted)]"
                      }`}
                    >
                      {tab.label}
                      {tab.ready ? "" : " · 가입 후"}
                    </button>
                  ))}
                </div>
                <h3 className="mt-3 text-[17px] font-bold text-[var(--vision-ink)]">
                  {channelTab === "place"
                    ? result.preview.place?.title || "플레이스 공지"
                    : channelTab === "insta"
                      ? "인스타 캡션"
                      : result.preview.title}
                </h3>
              </div>

              <div className="max-h-[min(72vh,640px)] overflow-y-auto overscroll-y-contain">
              <PublicTestReflectionChips chips={result.metrics?.reflectionChips} />
              <div className="space-y-4 px-5 py-4 text-[14px] leading-relaxed text-[var(--vision-ink)]">
                {channelTab === "place" && result.preview.place ? (
                  <SamplePlacePreview
                    place={{
                      title: result.preview.place.title,
                      short: result.preview.place.short,
                      detail: result.preview.place.detail,
                    }}
                  />
                ) : null}
                {channelTab === "insta" && result.preview.insta ? (
                  <SampleInstaPreview body={result.preview.insta.body} />
                ) : null}
                {channelTab === "blog" ? (
                  <>
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
                  </>
                ) : null}
                {channelTab === "place" && !result.preview.place ? (
                  <p className="text-[13px] text-[var(--vision-muted)]">
                    플레이스 공지는 가입 후 같은 주제로 이어 만들 수 있습니다.
                  </p>
                ) : null}
                {channelTab === "insta" && !result.preview.insta ? (
                  <p className="text-[13px] text-[var(--vision-muted)]">
                    인스타 캡션은 가입 후 같은 주제로 이어 만들 수 있습니다.
                  </p>
                ) : null}
              </div>

              {result.metrics?.contextScore ? (
                <PublicTestContextScore
                  contextScore={result.metrics.contextScore}
                  channelReady={previewChannelReady}
                />
              ) : null}
              </div>

              <div className="relative border-t border-[var(--vision-line)] px-5 py-8">
                <p className="text-center text-[13px] font-semibold text-[var(--vision-ink)]">
                  {PUBLIC_TEST_BLUR_HINT}
                </p>
                <p className="mt-2 text-center text-[12px] font-medium text-[var(--vision-accent)]">
                  {PUBLIC_TEST_SIGNUP_GAP_HEADLINE}
                </p>
                <ul className="mx-auto mt-4 max-w-sm space-y-2 text-[13px] text-[var(--vision-muted)]">
                  {PUBLIC_TEST_SIGNUP_UNLOCKS.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[var(--vision-accent)]" aria-hidden>
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-[var(--vision-line)] px-5 py-4">
                <button
                  type="button"
                  onClick={() => signup("public_test_result")}
                  className={`${VISION_CTA_ACCENT} min-h-[48px] w-full`}
                >
                  <span>{PUBLIC_TEST_RESULT_SIGNUP_CTA}</span>
                </button>
                <p className="mt-3 text-center text-[12px] text-[var(--vision-muted)]">
                  {PUBLIC_TEST_HERO.signupSave}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
    {result?.preview ? (
      <PublicTestSignupStickyBar
        brandName={brandName}
        tone="result"
        onSignup={() => signup("public_test_sticky")}
      />
    ) : quotaExhausted ? (
      <PublicTestSignupStickyBar
        brandName={brandName}
        tone="quota"
        onSignup={() => signup("public_test_sticky")}
      />
    ) : error && error !== PUBLIC_TEST_QUOTA_EXCEEDED ? (
      <PublicTestSignupStickyBar
        brandName={brandName}
        tone="error"
        onSignup={() => signup("public_test_sticky")}
      />
    ) : null}
    </>
  );
}
