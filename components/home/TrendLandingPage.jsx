"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";
import { BRICLOG_CONTACT_EMAIL } from "@/lib/brand/support";
import { stashLandingCreateIntent } from "@/lib/landing/landingCreateIntent";
import { LIVE_TREND_REFRESH_MS } from "@/lib/trends/liveConfig";
import { TREND_CATEGORY_LABELS, TREND_CATEGORY_ORDER } from "@/lib/trends/seedCatalog";

function matchesTrend(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.name,
    item.description,
    item.category,
    ...(item.aliases || []),
    ...(item.keywords || []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function formatMovement(item) {
  if (item.status === "new" && !item.previousRank) return "신규";
  if (item.rankMovement > 0) return `↑${item.rankMovement}`;
  if (item.rankMovement < 0) return `↓${Math.abs(item.rankMovement)}`;
  return "—";
}

function formatScoreChange(item) {
  const value = item.hourlyChange;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}`;
}

function deltaTone(value, status) {
  if (status === "new" && !value) return "text-[#03A94D]";
  if (value > 0) return "text-[#03A94D]";
  if (value < 0) return "text-[#C2410C]";
  return "text-[#7B8680]";
}

function statusTone(status) {
  if (status === "new" || status === "hot" || status === "rising") return "text-[#03A94D]";
  if (status === "falling") return "text-[#C2410C]";
  return "text-[#7B8680]";
}

function TrendMiniList({ items = [], emptyMessage, metric = "score" }) {
  if (!items.length) {
    return (
      <p className="border-t border-[#EEF2EF] pt-4 text-[14px] leading-[1.7] text-[#5F6B66]">{emptyMessage}</p>
    );
  }
  return (
    <ul className="border-t border-[#EEF2EF]">
      {items.map((item) => (
        <li key={item.slug} className="border-b border-[#EEF2EF]">
          <Link
            href={`/trend/${item.slug}`}
            className="flex items-baseline gap-3 py-3 transition hover:text-[#03A94D]"
          >
            <span className="w-7 shrink-0 text-[12px] tabular-nums text-[#8A948F]">
              {String(item.currentRank).padStart(2, "0")}
            </span>
            <span className="flex-1 break-keep text-[15px] font-medium text-[#111111]">{item.name}</span>
            <span
              className={`shrink-0 text-[13px] font-semibold tabular-nums ${deltaTone(
                metric === "score" ? item.hourlyChange : item.rankMovement,
                item.status
              )}`}
            >
              {metric === "score"
                ? item.hourlyChange
                  ? `점수 ${formatScoreChange(item)}`
                  : "변동 없음"
                : formatMovement(item)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function TrendLandingPage({
  trendCatalog,
  initialQuery = "",
  initialCategory = "all",
  onAuthOpen,
  onStart,
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [catalogState, setCatalogState] = useState(trendCatalog);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/trends/catalog", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data?.catalog?.updatedAt) {
          setCatalogState((prev) => {
            if (prev?.updatedAt === data.catalog.updatedAt) return prev;
            return data.catalog;
          });
        }
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(refresh, LIVE_TREND_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const items = useMemo(() => catalogState?.items || [], [catalogState]);
  const topItems = useMemo(() => catalogState?.topItems || items.slice(0, 10), [catalogState, items]);
  const tickerItems = useMemo(() => catalogState?.tickerItems || topItems.slice(0, 5), [catalogState, topItems]);
  const risingItems = useMemo(() => catalogState?.risingItems || [], [catalogState]);
  const newItems = useMemo(() => catalogState?.newItems || [], [catalogState]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter((item) => matchesTrend(item, q)).slice(0, 5);
  }, [items, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (
      items.find((item) => item.slug === q) ||
      items.find((item) => item.name.toLowerCase() === q) ||
      items.find((item) => (item.aliases || []).some((alias) => alias.toLowerCase() === q)) ||
      null
    );
  }, [items, query]);

  const filteredTopItems = useMemo(() => {
    const source = query.trim() ? items : topItems;
    return source.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      return matchesTrend(item, query);
    });
  }, [items, topItems, activeCategory, query]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const target = exactMatch || suggestions[0];
    if (target) {
      router.push(`/trend/${target.slug}`);
      return;
    }
    const params = new URLSearchParams();
    params.set("q", trimmed);
    if (activeCategory !== "all") params.set("category", activeCategory);
    router.push(`/?${params.toString()}#trend-list`);
  };

  const openSignup = () => {
    if (query.trim()) {
      stashLandingCreateIntent({ create: "blog", topic: query.trim() });
    }
    onStart?.();
  };
  const openLogin = () => {
    if (query.trim()) {
      stashLandingCreateIntent({ create: "blog", topic: query.trim() });
    }
    onAuthOpen?.("login", "trend_home");
  };
  const trendRequestHref = `mailto:${BRICLOG_CONTACT_EMAIL}?subject=${encodeURIComponent(
    "BRICLOG Trend 등록 요청"
  )}&body=${encodeURIComponent(query.trim())}`;
  const createFromQueryHref = query.trim()
    ? `/?${new URLSearchParams({
        create: "blog",
        topic: query.trim(),
        trendContext: query.trim(),
      }).toString()}#public-brand-test`
    : "/#public-brand-test";
  const liveLabel = catalogState?.live?.liveLabel || catalogState?.live?.updatedLabel || "방금 갱신";

  return (
    <div className="briclog-vision-page min-h-screen bg-[var(--vision-paper,#FCFCFA)] text-[var(--vision-ink,#111111)]">
      <header className="sticky top-0 z-30 border-b border-[var(--vision-line,#E7ECE8)]/80 bg-[var(--vision-paper,#FCFCFA)]/94 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Logo showIcon wordmark="BRICLOG" iconSize={28} className="items-center" onClick={() => scrollTo("trend-search")} />
          <nav className="hidden items-center gap-5 text-[13px] font-medium text-[#5F6B66] md:flex">
            <button type="button" onClick={() => scrollTo("trend-list")} className="hover:text-[#111111]">
              순위
            </button>
            <button type="button" onClick={() => scrollTo("public-brand-test")} className="hover:text-[#111111]">
              샘플
            </button>
            <button type="button" onClick={() => scrollTo("landing-pricing")} className="hover:text-[#111111]">
              요금
            </button>
            <button type="button" onClick={() => scrollTo("create-with-briclog")} className="hover:text-[#111111]">
              만들기
            </button>
            <Link href="/guides" className="hover:text-[#111111]">
              가이드
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex min-h-[40px] items-center rounded-full px-3 text-[13px] font-semibold text-[#4F5A56] hover:text-[#111111]"
            >
              로그인
            </button>
            <button
              type="button"
              onClick={openSignup}
              data-briclog-cta="start"
              className="inline-flex min-h-[42px] items-center rounded-full bg-[#111111] px-4 text-[13px] font-semibold text-white hover:opacity-92"
            >
              시작하기
            </button>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section id="trend-search" className="px-4 pb-14 pt-14 md:px-6 md:pb-20 md:pt-24">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_252px] lg:gap-14">
            <div>
            <div>
              <p className="text-[12px] font-medium tracking-[0.08em] text-[#5F6B66]">브릭로그 트렌드</p>
              <h1 className="mt-4 break-keep text-[clamp(2rem,4.6vw,3.3rem)] leading-[1.16] text-[#111111]">
                <span className="block font-semibold">지금 오르는 AI를</span>
                <span className="block font-normal text-[#2C3531]">순위로 먼저 봅니다.</span>
              </h1>
              <p className="mt-5 max-w-md break-keep text-[16px] leading-[1.75] text-[#5F6B66] md:text-[17px]">
                무엇이 움직였는지 확인하고, 그 흐름을 브랜드 글 초안까지 이어갑니다.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="mt-9">
              <label className="sr-only" htmlFor="trend-search-input">
                AI 순위·랭킹 검색
              </label>
              <div className="overflow-hidden rounded-[22px] border border-[#E7ECE8] bg-white shadow-[0_12px_40px_rgba(17,17,17,0.05)]">
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                  <input
                    id="trend-search-input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="도구·모델 이름을 검색하세요"
                    className="h-12 flex-1 border-0 bg-transparent px-1 text-[17px] text-[#111111] outline-none placeholder:text-[#8A948F] md:text-[19px]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-[48px] min-w-[48px] items-center justify-center rounded-full bg-[#03C75A] text-white hover:brightness-105"
                    aria-label="검색"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="8.6" cy="8.6" r="5.4" stroke="currentColor" strokeWidth="1.9" />
                      <path d="M12.7 12.7 17 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {query.trim() ? (
                  <div className="border-t border-[#EEF2EF] px-4 py-3 text-left sm:px-6">
                    {suggestions.length ? (
                      <ul className="space-y-1.5">
                        {suggestions.map((item) => (
                          <li key={item.slug}>
                            <button
                              type="button"
                              onClick={() => router.push(`/trend/${item.slug}`)}
                              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-[#F6F9F7]"
                            >
                              <span>
                                <span className="block text-[15px] font-semibold text-[#111111]">{item.name}</span>
                                <span className="mt-1 block text-[12px] text-[#5F6B66]">
                                  {item.categoryLabel} · {item.description}
                                </span>
                              </span>
                              <span className="text-[12px] font-medium text-[#03A94D]">보기</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-[#DCE3DF] bg-[#FAFCFB] px-4 py-4">
                        <p className="text-[15px] font-semibold text-[#111111]">
                          아직 BRICLOG Trend에 등록되지 않았습니다.
                        </p>
                        <a
                          href={trendRequestHref}
                          className="mt-3 inline-flex min-h-[40px] items-center rounded-full border border-[#DCE3DF] bg-white px-4 text-[13px] font-semibold text-[#111111]"
                        >
                          트렌드 등록 요청
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] leading-[1.7] text-[#5F6B66]">
                <span>
                  <span className="text-[15px] font-semibold tabular-nums text-[#111111]">{items.length}</span>개 도구·모델을 추적합니다
                </span>
                <span className="text-[#C6CFCA]">·</span>
                <span>{liveLabel}</span>
              </p>
            </form>
            </div>

            <aside className="lg:pt-1">
              <p className="text-[12px] font-medium text-[#5F6B66]">최근 순위 변동</p>
              <ul className="mt-3 border-t border-[#EEF2EF]">
                {tickerItems.map((item) => (
                  <li key={item.slug} className="border-b border-[#EEF2EF]">
                    <Link
                      href={`/trend/${item.slug}`}
                      className="flex items-baseline gap-3 py-2.5 transition hover:text-[#03A94D]"
                    >
                      <span className="w-7 shrink-0 text-[12px] tabular-nums text-[#8A948F]">
                        {String(item.currentRank).padStart(2, "0")}
                      </span>
                      <span className="flex-1 break-keep text-[14px] font-medium text-[#111111]">{item.name}</span>
                      <span className={`shrink-0 text-[12px] font-semibold tabular-nums ${deltaTone(item.rankMovement, item.status)}`}>
                        {formatMovement(item)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section id="trend-list" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">실시간 순위</p>
                <h2 className="mt-3 break-keep text-[clamp(1.7rem,3.8vw,2.6rem)] font-semibold leading-[1.15] text-[#111111]">
                  지금 AI 순위
                </h2>
              </div>
              <div className="max-w-xl rounded-[22px] border border-[#E7ECE8] bg-white px-4 py-3 text-[12px] leading-[1.7] text-[#5F6B66]">
                <strong className="text-[#111111]">
                  {catalogState?.live?.isLive
                    ? "실시간"
                    : catalogState?.mode === "sample"
                      ? "샘플"
                      : "수집 지연"}
                </strong>
                {catalogState?.live?.updatedLabel ? (
                  <span className="ml-2 tabular-nums text-[#111111]">{catalogState.live.updatedLabel}</span>
                ) : null}
                {catalogState?.note ? <span className="ml-2">· {catalogState.note}</span> : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {TREND_CATEGORY_ORDER.map((category) => {
                const active = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-[12px] font-semibold tracking-[-0.01em] ${
                      active
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-[#E7ECE8] bg-white text-[#5F6B66] hover:text-[#111111]"
                    }`}
                  >
                    {TREND_CATEGORY_LABELS[category]}
                  </button>
                );
              })}
            </div>

            {query.trim() || activeCategory !== "all" ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#E7ECE8] bg-[#FAFCFB] px-4 py-3 text-[12px] text-[#5F6B66]">
                <p>
                  {query.trim() ? (
                    <>
                      <strong className="text-[#111111]">{query.trim()}</strong> 검색 결과
                    </>
                  ) : (
                    <>카테고리 필터</>
                  )}{" "}
                  · {filteredTopItems.length}건
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/#trend-list")}
                  className="font-semibold text-[#111111] hover:text-[#03A94D]"
                >
                  초기화
                </button>
              </div>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-[28px] border border-[#E7ECE8] bg-white">
              <div className="hidden grid-cols-[64px_minmax(0,1.6fr)_112px_96px_128px] gap-4 border-b border-[#EEF2EF] px-5 py-3 text-[11px] font-semibold tracking-[-0.01em] text-[#7B8680] md:grid">
                <span>순위</span>
                <span>이름</span>
                <span>분류</span>
                <span>점수</span>
                <span>변동</span>
              </div>

              {filteredTopItems.length ? (
                <ul>
                  {filteredTopItems.map((item) => (
                    <li key={item.slug} className="border-b border-[#EEF2EF] last:border-b-0">
                      <Link
                        href={`/trend/${item.slug}`}
                        className="grid gap-3 px-4 py-4 transition hover:bg-[#F7FBF8] md:grid-cols-[64px_minmax(0,1.6fr)_112px_96px_128px] md:items-center md:px-5"
                      >
                        <div className="flex items-center gap-3 md:block">
                          <span className="text-[20px] font-semibold tracking-[-0.04em] text-[#111111] md:text-[18px]">
                            {String(item.currentRank).padStart(2, "0")}
                          </span>
                          <span className="rounded-full border border-[#E7ECE8] px-2 py-0.5 text-[10px] font-medium tracking-[-0.01em] text-[#5F6B66] md:hidden">
                            {item.categoryLabel}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[16px] font-semibold text-[#111111]">{item.name}</span>
                            <span className={`text-[12px] font-semibold ${statusTone(item.status)}`}>{item.statusLabel}</span>
                          </div>
                          <p className="mt-1 truncate text-[13px] text-[#5F6B66]">{item.description}</p>
                        </div>

                        <span className="hidden text-[12px] font-medium text-[#5F6B66] md:block">{item.categoryLabel}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-[11px] text-[#8A948F] md:hidden">점수</span>
                          <span className="text-[17px] font-semibold tabular-nums text-[#111111] md:text-[18px]">
                            {item.trendScore}
                          </span>
                          {item.status !== "new" && item.hourlyChange ? (
                            <span
                              className={`text-[12px] font-semibold tabular-nums ${deltaTone(item.hourlyChange, item.status)}`}
                            >
                              {formatScoreChange(item)}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-[11px] text-[#8A948F] md:hidden">변동</span>
                          <span
                            className={`text-[13px] font-semibold tabular-nums ${deltaTone(item.rankMovement, item.status)}`}
                          >
                            {formatMovement(item)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-[17px] font-semibold text-[#111111]">조건에 맞는 트렌드가 없습니다.</p>
                  {query.trim() ? (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <Link
                        href={createFromQueryHref}
                        onClick={() =>
                          stashLandingCreateIntent({
                            create: "blog",
                            topic: query.trim(),
                          })
                        }
                        className="inline-flex min-h-[44px] items-center rounded-full bg-[#111111] px-5 text-[13px] font-semibold text-white"
                      >
                        이 주제로 바로 활용하기
                      </Link>
                      <a
                        href={trendRequestHref}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-[#DCE3DF] bg-white px-5 text-[13px] font-semibold text-[#111111]"
                      >
                        트렌드 등록 요청
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="rising-list" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">상승</p>
                <h2 className="mt-3 break-keep text-[23px] font-semibold leading-[1.3] text-[#111111]">
                  최근 1시간 가장 빠르게 오른 AI
                </h2>
                <div className="mt-5">
                  <TrendMiniList
                    items={risingItems}
                    emptyMessage="최근 1시간 사이 순위가 오른 도구가 없습니다."
                  />
                </div>
              </div>

              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">신규</p>
                <h2 className="mt-3 break-keep text-[23px] font-semibold leading-[1.3] text-[#111111]">
                  새롭게 감지된 AI
                </h2>
                <div className="mt-5">
                  <TrendMiniList
                    items={newItems}
                    metric="rank"
                    emptyMessage="이번 수집에서 새로 들어온 도구는 없습니다."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="create-with-briclog" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-start">
              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">만들기</p>
                <h2 className="mt-3 break-keep text-[clamp(1.8rem,3.6vw,2.6rem)] leading-[1.2] text-[#111111]">
                  <span className="block font-semibold">순위를 봤다면,</span>
                  <span className="block font-normal text-[#2C3531]">이제 글로 옮깁니다.</span>
                </h2>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#5F6B66]">
                  <span>순위</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span>브리프</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span className="text-[#111111]">초안</span>
                </div>
              </div>

              <div
                id="landing-pricing"
                data-briclog-anchor="pricing"
                className="scroll-mt-24 rounded-[22px] border border-[#E7ECE8] bg-white p-6"
              >
                <p className="text-[12px] font-medium text-[#03A94D]">지금 무료</p>
                <ul className="mt-4 space-y-3 text-[15px] text-[#111111]">
                  <li className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
                    <span className="font-semibold">이야기</span>
                    <span className="text-[13px] text-[#5F6B66]">블로그 초안</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
                    <span className="font-semibold">플레이스</span>
                    <span className="text-[13px] text-[#5F6B66]">공지 톤 분리</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="font-semibold">인스타</span>
                    <span className="text-[13px] text-[#5F6B66]">캡션 연결</span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => scrollTo("public-brand-test")}
                  data-briclog-cta="start"
                  className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-[#03C75A] px-5 text-[14px] font-semibold text-white hover:brightness-105"
                >
                  샘플로 시작하기
                </button>
              </div>
            </div>
          </div>
        </section>

        <PublicBrandTestSection onSignup={(mode) => onAuthOpen?.(mode || "signup")} />

        <section className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-9 md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-14">
            <div>
              <p className="text-[12px] font-medium text-[#5F6B66]">철학</p>
              <p className="mt-3 break-keep text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.35] text-[#111111]">
                <span className="font-semibold">AI 시대,</span>{" "}
                <span className="font-normal text-[#2C3531]">중요한 것은 의도다.</span>
              </p>
            </div>

            <div>
              <ul className="border-t border-[#EEF2EF]">
                <li className="border-b border-[#EEF2EF]">
                  <Link
                    href="/guides"
                    className="flex items-baseline justify-between gap-4 py-3.5 transition hover:text-[#03A94D]"
                  >
                    <span className="break-keep text-[15px] font-medium text-[#111111]">검색·운영용 작성 가이드</span>
                    <span className="shrink-0 text-[12px] text-[#8A948F]">가이드</span>
                  </Link>
                </li>
                <li className="border-b border-[#EEF2EF]">
                  <Link
                    href="/help"
                    className="flex items-baseline justify-between gap-4 py-3.5 transition hover:text-[#03A94D]"
                  >
                    <span className="break-keep text-[15px] font-medium text-[#111111]">초안 생성 후 복사·게시</span>
                    <span className="shrink-0 text-[12px] text-[#8A948F]">도움말</span>
                  </Link>
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-[#5F6B66]">
                <Link href="/terms" className="hover:text-[#111111] hover:underline">
                  이용약관
                </Link>
                <Link href="/privacy" className="hover:text-[#111111] hover:underline">
                  개인정보처리방침
                </Link>
                <Link href="/refund" className="hover:text-[#111111] hover:underline">
                  환불정책
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
