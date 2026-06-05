"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { computeSeedStats, dayKeyKst } from "@/lib/landing/statsSeed";
import { LANDING_STATS_ANIM_DELAY_MS } from "@/lib/landing/introTiming";
import {
  LANDING_STATS_SUB,
  LANDING_STATS_TITLE,
} from "@/lib/brand/copy";

const REFETCH_MS = 60 * 60 * 1000;
const COUNT_DURATION_MS = 2400;
const STAGGER_MS = 160;

function formatRolling(n) {
  return `${Math.max(0, Math.floor(n)).toLocaleString("ko-KR")}+`;
}

function tickerStart(target, index) {
  const t = Math.max(0, Math.floor(Number(target) || 0));
  const ratio = 0.78 + index * 0.04;
  return Math.max(0, Math.floor(t * Math.min(ratio, 0.92)));
}

function AnimatedStatCard({
  metric,
  loading,
  index,
  reduceMotion,
  animationActive,
}) {
  const target = metric?.value ?? 0;
  const from = useMemo(() => tickerStart(target, index), [target, index]);
  const { value, done } = useCountUp(target, {
    from,
    duration: COUNT_DURATION_MS,
    delay: index * STAGGER_MS,
    enabled: !loading && !reduceMotion && animationActive,
  });

  const waiting = !loading && !reduceMotion && !animationActive;
  const display = loading
    ? "···"
    : reduceMotion
      ? metric?.display ?? formatRolling(target)
      : waiting
        ? formatRolling(from)
        : formatRolling(value);

  const rising = animationActive && !loading && !reduceMotion && !done;

  return (
    <div
      className={`rounded-2xl border bg-white px-5 py-5 transition-shadow duration-500 ${
        rising
          ? "border-[#03C75A]/40 shadow-[0_8px_28px_rgba(3,199,90,0.18)]"
          : waiting
            ? "border-[#E8EBED] shadow-[0_4px_16px_rgba(25,31,40,0.04)]"
            : "border-[#03C75A]/20 shadow-[0_8px_24px_rgba(3,199,90,0.08)]"
      }`}
    >
      <p className="text-[12px] font-semibold leading-snug text-[#03A94D] break-keep">
        {metric?.label ?? "—"}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className={`font-mono text-[28px] font-bold tabular-nums tracking-tight md:text-[32px] ${
            loading
              ? "animate-pulse text-[#C5CAD0]"
              : rising
                ? "text-[#03C75A]"
                : waiting
                  ? "text-[#8B95A1]"
                  : "text-[#191F28]"
          }`}
          aria-live="polite"
        >
          {display}
        </p>
        {!loading && animationActive && !reduceMotion && (rising || done) && (
          <span
            className="animate-ticker-up text-[14px] font-bold text-[#03C75A]"
            aria-hidden
          >
            ▲
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * @param {{ introOpen?: boolean }} props — 인트로 중에는 숫자 롤링 보류
 */
export default function LiveStatsBanner({ introOpen = false }) {
  const sectionRef = useRef(null);
  const [metrics, setMetrics] = useState(null);
  const [statsDateKst, setStatsDateKst] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [animationActive, setAnimationActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (introOpen || loading || reduceMotion) {
      setAnimationActive(false);
      return undefined;
    }
    if (!inView) {
      setAnimationActive(false);
      return undefined;
    }
    const id = setTimeout(
      () => setAnimationActive(true),
      LANDING_STATS_ANIM_DELAY_MS
    );
    return () => clearTimeout(id);
  }, [introOpen, loading, reduceMotion, inView]);

  const applyPayload = useCallback((data) => {
    if (data?.ok && Array.isArray(data.metrics)) {
      setMetrics(data.metrics);
      if (data.statsDateKst) setStatsDateKst(data.statsDateKst);
      return true;
    }
    return false;
  }, []);

  const applyClientSeed = useCallback(() => {
    const seed = computeSeedStats();
    setMetrics(seed.metrics);
    setStatsDateKst(seed.statsDateKst);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/public/stats", { cache: "no-store" });
      const data = await res.json();
      if (!applyPayload(data)) applyClientSeed();
    } catch {
      applyClientSeed();
    } finally {
      setLoading(false);
    }
  }, [applyPayload, applyClientSeed]);

  useEffect(() => {
    applyClientSeed();
    void load();
    const id = setInterval(load, REFETCH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    const today = dayKeyKst();
    if (!statsDateKst || statsDateKst === today) return;
    load();
  }, [statsDateKst, load]);

  const cards =
    metrics ??
    [
      { id: "weekPosts", label: "이번 주 제작된 글", display: "···", value: 0 },
      { id: "monthBrands", label: "이번 달 이용 브랜드", display: "···", value: 0 },
      { id: "totalUsers", label: "누적 이용자", display: "···", value: 0 },
      { id: "monthPosts", label: "이번 달 제작된 글", display: "···", value: 0 },
    ];

  const dateLabel = statsDateKst
    ? statsDateKst.replace(/-/g, ".")
    : null;

  return (
    <section
      ref={sectionRef}
      id="landing-stats"
      className="scroll-mt-20 border-y border-[#E8EBED] bg-gradient-to-b from-[#F0FFF5] to-[#F7F8FA] px-4 py-10 md:px-8 md:py-14"
      aria-label="브릭로그 이용 현황"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-[20px] font-bold text-[#191F28] md:text-[24px]">
            {LANDING_STATS_TITLE}
          </h2>
          {LANDING_STATS_SUB || dateLabel ? (
            <p className="mt-2 text-[13px] text-[#8B95A1]">
              {[LANDING_STATS_SUB, dateLabel ? `${dateLabel} 갱신` : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 @min-[420px]:grid-cols-2 @min-[720px]:grid-cols-4 @min-[720px]:gap-4">
          {cards.map((metric, index) => (
            <AnimatedStatCard
              key={`${metric.id}-${metric.value}-${statsDateKst ?? "pending"}-${animationActive ? "on" : "hold"}`}
              metric={metric}
              loading={loading}
              index={index}
              reduceMotion={reduceMotion}
              animationActive={animationActive}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
