"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";
import { BRICLOG_CONTACT_EMAIL } from "@/lib/brand/support";
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
  if (item.status === "new" && !item.previousRank) return "NEW";
  if (item.rankMovement > 0) return `↑${item.rankMovement}`;
  if (item.rankMovement < 0) return `↓${Math.abs(item.rankMovement)}`;
  return "·";
}

function formatScoreChange(item) {
  const value = item.hourlyChange;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}`;
}

function movementTone(item) {
  if (item.status === "new") return "text-[#03A94D]";
  if (item.rankMovement > 0 || item.hourlyChange > 0) return "text-[#03A94D]";
  if (item.rankMovement < 0 || item.hourlyChange < 0) return "text-[#C2410C]";
  return "text-[#7B8680]";
}

function TrendMiniList({ items = [] }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={`/trend/${item.slug}`}
            className="flex items-center justify-between rounded-[18px] border border-[#E7ECE8] bg-white px-4 py-3 transition hover:border-[#111111]"
          >
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-[0.14em] text-[#7B8680]">
                {String(item.currentRank).padStart(2, "0")}
              </span>
              <span className="mt-1 block truncate text-[16px] font-semibold text-[#111111]">
                {item.name}
              </span>
            </span>
            <span className={`text-[13px] font-semibold ${movementTone(item)}`}>{formatMovement(item)}</span>
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

  const openSignup = () => onStart?.();
  const openLogin = () => onAuthOpen?.("login", "trend_home");
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
  const liveLabel = catalogState?.live?.liveLabel || catalogState?.live?.updatedLabel || "UPDATED --:--";

  return (
    <div className="min-h-screen bg-[#FCFCFA] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-[#E7ECE8]/80 bg-[#FCFCFA]/94 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Logo showIcon wordmark="BRICLOG" iconSize={28} className="items-center" onClick={() => scrollTo("trend-search")} />
          <nav className="hidden items-center gap-4 text-[13px] font-medium text-[#4F5A56] md:flex">
            <button type="button" onClick={() => scrollTo("trend-list")} className="hover:text-[#111111]">
              TREND
            </button>
            <button type="button" onClick={() => scrollTo("rising-list")} className="hover:text-[#111111]">
              RISING
            </button>
            <button type="button" onClick={() => scrollTo("create-with-briclog")} className="hover:text-[#111111]">
              CREATE
            </button>
            <Link href="/guides" className="hover:text-[#111111]">
              GUIDES
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
              작업실
            </button>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section id="trend-search" className="px-4 pb-12 pt-12 md:px-6 md:pb-14 md:pt-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-[13px] font-semibold tracking-[0.16em] text-[#111111]">BRICLOG</p>
              <h1 className="mt-4 text-[clamp(2.3rem,6vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[#111111]">
                AI의 지금을 읽다.
              </h1>
              <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#7B8680]">
                TREND · SEARCH · CREATE
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="mx-auto mt-8 max-w-4xl">
              <label className="sr-only" htmlFor="trend-search-input">
                AI 검색
              </label>
              <div className="overflow-hidden rounded-[34px] border border-[#DCE3DF] bg-white shadow-[0_24px_80px_rgba(17,17,17,0.06)]">
                <div className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                  <input
                    id="trend-search-input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="AI를 검색하세요"
                    className="h-14 flex-1 border-0 bg-transparent px-1 text-[18px] text-[#111111] outline-none placeholder:text-[#8A948F] md:text-[22px]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-[52px] min-w-[52px] items-center justify-center rounded-full bg-[#03C75A] px-5 text-[15px] font-semibold text-white hover:brightness-105"
                    aria-label="검색"
                  >
                    ⌕
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
              <p className="mt-4 text-center text-[12px] leading-[1.7] text-[#6C7772]">
                Founders, marketers, operators, and developers can track models, tools, video,
                image, coding, and agents here.
              </p>
            </form>

            <div className="mx-auto mt-6 max-w-4xl rounded-[24px] border border-[#E7ECE8] bg-white px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B8680]">
                  LIVE · {liveLabel}
                </p>
                <p className="text-[11px] text-[#8A948F]">
                  {catalogState?.live?.isLive ? "Hourly DB snapshot" : catalogState?.live?.liveLabel}
                </p>
              </div>
              <ul className="mt-3 grid gap-2 md:grid-cols-4">
                {tickerItems.map((item) => (
                  <li key={item.slug} className="flex items-center justify-between border-t border-[#EEF2EF] pt-2 first:border-t-0 first:pt-0">
                    <Link href={`/trend/${item.slug}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 hover:text-[#03A94D]">
                      <span className="truncate text-[14px] font-semibold">
                        {String(item.currentRank).padStart(2, "0")} {item.name}
                      </span>
                      <span className={`text-[12px] font-semibold ${movementTone(item)}`}>{formatMovement(item)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="trend-list" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">Live AI Trend</p>
                <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#111111]">
                  지금 가장 많이 움직이는 AI
                </h2>
              </div>
              <div className="max-w-xl rounded-[22px] border border-[#E7ECE8] bg-white px-4 py-3 text-[12px] leading-[1.7] text-[#5F6B66]">
                <strong className="text-[#111111]">
                  {catalogState?.live?.isLive ? "LIVE" : catalogState?.mode === "sample" ? "SAMPLE" : "DELAYED"}
                </strong>
                <span className="ml-2">{catalogState?.note}</span>
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
                    className={`rounded-full border px-4 py-2 text-[12px] font-semibold tracking-[0.1em] ${
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
                      Search results for <strong className="text-[#111111]">{query.trim()}</strong>
                    </>
                  ) : (
                    <>Category filtered</>
                  )}{" "}
                  · {filteredTopItems.length} results
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/#trend-list")}
                  className="font-semibold text-[#111111] hover:text-[#03A94D]"
                >
                  Reset
                </button>
              </div>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-[28px] border border-[#E7ECE8] bg-white">
              <div className="hidden grid-cols-[72px_minmax(0,1.5fr)_110px_90px_100px_120px] gap-4 border-b border-[#EEF2EF] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B8680] md:grid">
                <span>Rank</span>
                <span>Name</span>
                <span>Category</span>
                <span>Score</span>
                <span>Move</span>
                <span>Updated</span>
              </div>

              {filteredTopItems.length ? (
                <ul>
                  {filteredTopItems.map((item) => (
                    <li key={item.slug} className="border-b border-[#EEF2EF] last:border-b-0">
                      <Link
                        href={`/trend/${item.slug}`}
                        className="grid gap-3 px-4 py-4 transition hover:bg-[#F7FBF8] md:grid-cols-[72px_minmax(0,1.5fr)_110px_90px_100px_120px] md:items-center md:px-5"
                      >
                        <div className="flex items-center gap-3 md:block">
                          <span className="text-[20px] font-semibold tracking-[-0.04em] text-[#111111] md:text-[18px]">
                            {String(item.currentRank).padStart(2, "0")}
                          </span>
                          <span className="rounded-full border border-[#E7ECE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5F6B66] md:hidden">
                            {item.categoryLabel}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[16px] font-semibold text-[#111111]">{item.name}</span>
                            <span className={`text-[12px] font-semibold ${movementTone(item)}`}>{item.status === "new" ? "NEW" : item.statusLabel}</span>
                          </div>
                          <p className="mt-1 truncate text-[13px] text-[#5F6B66]">{item.description}</p>
                        </div>

                        <span className="hidden text-[12px] font-medium text-[#5F6B66] md:block">{item.categoryLabel}</span>
                        <span className="text-[22px] font-semibold tracking-[-0.05em] text-[#111111] md:text-[18px]">{item.trendScore}</span>
                        <span className={`text-[13px] font-semibold ${movementTone(item)}`}>
                          {formatMovement(item)} {item.status !== "new" ? `${formatScoreChange(item)} 1H` : ""}
                        </span>
                        <span className="text-[12px] text-[#7B8680]">{item.liveLabel.replace("UPDATED ", "")}</span>
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
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">What&apos;s Rising</p>
                <h2 className="mt-3 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#111111]">
                  최근 1시간 가장 빠르게 오른 AI
                </h2>
                <div className="mt-5">
                  <TrendMiniList items={risingItems} />
                </div>
              </div>

              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">New</p>
                <h2 className="mt-3 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#111111]">
                  새롭게 감지된 AI
                </h2>
                <div className="mt-5">
                  <TrendMiniList items={newItems.length ? newItems : tickerItems} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="create-with-briclog" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">Create With BRICLOG</p>
                <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[#111111]">
                  찾았다면,
                  <br />
                  이제 활용하세요.
                </h2>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5F6B66]">
                  <span>TREND</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span>BRIEF</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span className="text-[#111111]">CREATE</span>
                </div>
              </div>

              <div id="landing-pricing" className="rounded-[28px] border border-[#E7ECE8] bg-white p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#03A94D]">
                  Free Now
                </p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">Channels</p>
                <ul className="mt-4 space-y-3 text-[15px] text-[#111111]">
                  <li className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
                    <span className="font-semibold">BLOG</span>
                    <span className="text-[13px] text-[#5F6B66]">이야기 초안</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
                    <span className="font-semibold">SMARTPLACE</span>
                    <span className="text-[13px] text-[#5F6B66]">공지 톤 분리</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="font-semibold">INSTAGRAM</span>
                    <span className="text-[13px] text-[#5F6B66]">캡션 연결</span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => scrollTo("public-brand-test")}
                  data-briclog-cta="start"
                  className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-[#03C75A] px-5 text-[14px] font-semibold text-white hover:brightness-105"
                >
                  BRICLOG 시작하기
                </button>
              </div>
            </div>
          </div>
        </section>

        <PublicBrandTestSection onSignup={(mode) => onAuthOpen?.(mode || "signup")} />

        <section className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            <Link href="/guides" className="rounded-[24px] border border-[#E7ECE8] bg-white p-5 transition hover:border-[#03C75A]/35 hover:bg-[#F8FCF9]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">Guides</p>
              <p className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#111111]">
                기존 검색 유입용 가이드 유지
              </p>
            </Link>

            <Link href="/help" className="rounded-[24px] border border-[#E7ECE8] bg-white p-5 transition hover:border-[#03C75A]/35 hover:bg-[#F8FCF9]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">FAQ</p>
              <p className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#111111]">
                초안 생성 후 복사·게시
              </p>
            </Link>

            <div className="rounded-[24px] border border-[#E7ECE8] bg-white p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">Brand Philosophy</p>
              <p className="mt-3 text-[24px] font-semibold leading-[1.2] tracking-[-0.04em] text-[#111111]">
                AI 시대,
                <br />
                중요한 것은 의도다.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-medium text-[#03A94D]">
                <Link href="/terms" className="hover:underline">
                  이용약관
                </Link>
                <Link href="/privacy" className="hover:underline">
                  개인정보처리방침
                </Link>
                <Link href="/refund" className="hover:underline">
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
