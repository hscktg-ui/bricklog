"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { computeSeedStats, dayKeyKst } from "@/lib/landing/statsSeed";
import { LANDING_STATS_ANIM_DELAY_MS } from "@/lib/landing/introTiming";
import {
  LANDING_STATS_SUB,
  LANDING_STATS_TITLE,
} from "@/lib/brand/copy";
import { VISION_EYEBROW, VISION_SECTION } from "@/lib/landing/vision2030Styles";

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
  const { value } = useCountUp(target, {
    from,
    duration: COUNT_DURATION_MS,
    delay: index * STAGGER_MS,
    enabled: !loading && !reduceMotion && animationActive,
  });

  const waiting = !loading && !reduceMotion && !animationActive;
  const display = loading
    ? null
    : reduceMotion
      ? metric?.display ?? formatRolling(target)
      : waiting
        ? formatRolling(from)
        : formatRolling(value);

  const rising =
    animationActive && !loading && !reduceMotion && value < target;

  return (
    <div
      className={`briclog-vision-stat px-5 py-5 transition-shadow duration-500 ${
        rising ? "briclog-vision-stat-active" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)] break-keep">
        {metric?.label ?? "—"}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <span
            className="inline-block h-9 w-[4.5rem] animate-pulse rounded-lg bg-[var(--vision-line)]"
            aria-hidden
          />
        ) : (
          <p
            className={`text-[32px] font-semibold tabular-nums tracking-tight md:text-[36px] ${
              rising
                ? "text-[var(--vision-accent)]"
                : waiting
                  ? "text-[var(--vision-muted)]"
                  : "text-[var(--vision-ink)]"
            }`}
            aria-live="polite"
          >
            {display}
          </p>
        )}
        {!loading && animationActive && !reduceMotion && rising && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--vision-accent)]"
            aria-hidden
          />
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
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-14 md:px-8 md:py-20`}
      aria-label="브릭로그 이용 현황"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className={VISION_EYEBROW}>Live</p>
          <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
            {LANDING_STATS_TITLE}
          </h2>
          {LANDING_STATS_SUB || dateLabel ? (
            <p className="mt-2 text-[14px] text-[var(--vision-muted)]">
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
