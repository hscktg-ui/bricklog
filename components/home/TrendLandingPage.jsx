"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";
import LandingFaqSection from "@/components/landing/LandingFaqSection";
import {
  LANDING_PRIMARY_CTA,
  LANDING_PRIMARY_SUB,
  LANDING_SECONDARY_CTA,
} from "@/lib/brand/copy";
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
  return haystack.includes(query);
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

function resolveFreshnessBadge(catalogState) {
  if (catalogState?.mode === "sample" || catalogState?.live?.freshnessState === "sample") {
    return {
      tone: "sample",
      strong: "SAMPLE",
      detail: catalogState?.note || "예시 데이터 · 실시간 변동 아님",
    };
  }
  if (catalogState?.live?.freshnessState === "missing" || !catalogState?.items?.length) {
    return {
      tone: "fail",
      strong: "수집 실패·대기",
      detail:
        catalogState?.note ||
        catalogState?.live?.freshnessLabel ||
        "검증된 수집 데이터가 없어 순위를 확정하지 않습니다",
    };
  }
  if (catalogState?.live?.isLive) {
    return {
      tone: "ok",
      strong: "수집 성공",
      detail: [
        catalogState?.live?.updatedLabel,
        catalogState?.live?.freshnessLabel,
        catalogState?.note,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  return {
    tone: "warn",
    strong: catalogState?.live?.liveLabel || "수집 지연",
    detail: [
      catalogState?.live?.updatedLabel,
      catalogState?.live?.freshnessLabel,
      catalogState?.note,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

function freshnessBadgeClass(tone) {
  if (tone === "ok") return "border-[#CDEDD9] bg-[#F3FBF6] text-[#0F6B3A]";
  if (tone === "warn") return "border-[#F0E0B8] bg-[#FFFBF2] text-[#8B5A00]";
  if (tone === "fail") return "border-[#F0D0D0] bg-[#FFF7F7] text-[#9B1C1C]";
  return "border-[#E7ECE8] bg-white text-[#111111]";
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
  const risingItems = useMemo(() => catalogState?.risingItems || [], [catalogState]);
  const newItems = useMemo(() => catalogState?.newItems || [], [catalogState]);
  const canShowHourlyClaims =
    catalogState?.mode === "database" &&
    catalogState?.live?.isLive === true &&
    catalogState?.live?.freshnessState === "fresh";
  const freshnessBadge = resolveFreshnessBadge(catalogState);

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

  return (
    <div className="briclog-vision-page min-h-screen bg-[var(--vision-paper,#FCFCFA)] text-[var(--vision-ink,#111111)]">
      <header className="sticky top-0 z-30 border-b border-[var(--vision-line,#E7ECE8)]/80 bg-[var(--vision-paper,#FCFCFA)]/94 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Logo showIcon wordmark="BRICLOG" iconSize={28} className="items-center" onClick={() => scrollTo("landing-hero")} />
          <nav className="hidden items-center gap-5 text-[13px] font-medium text-[#5F6B66] md:flex">
            <button type="button" onClick={() => scrollTo("public-brand-test")} className="hover:text-[#111111]">
              샘플
            </button>
            <button type="button" onClick={() => scrollTo("create-with-briclog")} className="hover:text-[#111111]">
              기능
            </button>
            <button type="button" onClick={() => scrollTo("trend-list")} className="hover:text-[#111111]">
              AI 트렌드
            </button>
            <button type="button" onClick={() => scrollTo("landing-faq")} className="hover:text-[#111111]">
              FAQ
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
              onClick={() => scrollTo("public-brand-test")}
              data-briclog-cta="start"
              className="inline-flex min-h-[42px] items-center rounded-full bg-[#111111] px-4 text-[13px] font-semibold text-white hover:opacity-92"
            >
              {LANDING_PRIMARY_CTA}
            </button>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section id="landing-hero" className="px-4 pb-12 pt-14 md:px-6 md:pb-16 md:pt-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[#5F6B66]">브랜드 콘텐츠 AI</p>
            <h1 className="mt-4 break-keep text-[clamp(2.1rem,5vw,3.5rem)] leading-[1.14] text-[#111111]">
              <span className="block font-semibold">브랜드의 생각을,</span>
              <span className="block font-normal text-[#2C3531]">콘텐츠로.</span>
            </h1>
            <p className="mt-5 max-w-2xl break-keep text-[16px] leading-[1.75] text-[#5F6B66] md:text-[18px]">
              브랜드명·지역·주제만 넣으면 네이버 블로그·스마트플레이스·인스타 초안이 한 흐름으로
              나옵니다. 조사·검수 뒤 복사해 게시하고, 가입하면 작업실에서 이어갑니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollTo("public-brand-test")}
                data-briclog-cta="start"
                className="inline-flex min-h-[48px] items-center rounded-full bg-[#03C75A] px-5 text-[14px] font-semibold text-white hover:brightness-105"
              >
                {LANDING_PRIMARY_CTA}
              </button>
              <button
                type="button"
                onClick={() => scrollTo("trend-list")}
                className="inline-flex min-h-[48px] items-center rounded-full border border-[#DCE3DF] bg-white px-5 text-[14px] font-semibold text-[#111111] hover:border-[#111111]"
              >
                {LANDING_SECONDARY_CTA}
              </button>
            </div>
            <p className="mt-4 text-[13px] leading-[1.7] text-[#5F6B66]">{LANDING_PRIMARY_SUB}</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { title: "이야기", desc: "네이버 블로그 장문 초안" },
                { title: "플레이스", desc: "스마트플레이스 공지 톤" },
                { title: "인스타", desc: "캡션·장면 리듬" },
              ].map((item) => (
                <div key={item.title} className="rounded-[20px] border border-[#E7ECE8] bg-white px-4 py-4">
                  <p className="text-[15px] font-semibold text-[#111111]">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-[1.6] text-[#5F6B66]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PublicBrandTestSection onSignup={(mode) => onAuthOpen?.(mode || "signup")} />

        <section id="create-with-briclog" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-start">
              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">사용 방법</p>
                <h2 className="mt-3 break-keep text-[clamp(1.8rem,3.6vw,2.6rem)] leading-[1.2] text-[#111111]">
                  <span className="block font-semibold">입력하면 초안,</span>
                  <span className="block font-normal text-[#2C3531]">확인 후 복사합니다.</span>
                </h2>
                <ol className="mt-6 space-y-3 text-[15px] leading-[1.7] text-[#5F6B66]">
                  <li>1. 브랜드명·지역·주제를 입력합니다.</li>
                  <li>2. 블로그·플레이스·인스타 미리보기를 확인합니다.</li>
                  <li>3. 가입 후 작업실에서 전체 초안과 기록을 이어갑니다.</li>
                  <li>4. 각 채널 앱에 직접 복사해 게시합니다. 자동 업로드는 하지 않습니다.</li>
                </ol>
              </div>

              <div
                id="landing-pricing"
                data-briclog-anchor="pricing"
                className="scroll-mt-24 rounded-[22px] border border-[#E7ECE8] bg-white p-6"
              >
                <p className="text-[12px] font-medium text-[#03A94D]">지금 무료</p>
                <p className="mt-3 break-keep text-[15px] leading-[1.7] text-[#5F6B66]">
                  스튜디오급 기능을 결제 없이 이용할 수 있습니다. 약관의 유료 금액은 향후 결제
                  연동 시 적용 예정이며, 현재는 청구되지 않습니다.
                </p>
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
                  onClick={openSignup}
                  data-briclog-cta="start"
                  className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-[#111111] px-5 text-[14px] font-semibold text-white hover:opacity-92"
                >
                  가입 후 작업실에서 계속하기
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="trend-search" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[#5F6B66]">AI 트렌드</p>
            <h2 className="mt-3 break-keep text-[clamp(1.7rem,3.8vw,2.5rem)] leading-[1.2] text-[#111111]">
              <span className="block font-semibold">AI 순위는 따로</span>
              <span className="block font-normal text-[#2C3531]">필요할 때 살펴보세요.</span>
            </h2>
            <p className="mt-4 max-w-2xl break-keep text-[15px] leading-[1.75] text-[#5F6B66]">
              콘텐츠 제작이 본 서비스입니다. 아래 순위는 운영자가 참고할 수 있는 보조 탐색
              영역이며, 수집 상태와 출처를 함께 표시합니다.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-8">
              <label className="sr-only" htmlFor="trend-search-input">
                AI 도구·모델 검색
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
                <span>{freshnessBadge.strong}</span>
              </p>
            </form>
          </div>
        </section>

        <section id="trend-list" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">AI 도구 순위</p>
                <h2 className="mt-3 break-keep text-[clamp(1.7rem,3.8vw,2.6rem)] font-semibold leading-[1.15] text-[#111111]">
                  참고용 AI 순위
                </h2>
              </div>
              <div
                className={`max-w-xl rounded-[22px] border px-4 py-3 text-[12px] leading-[1.7] ${freshnessBadgeClass(
                  freshnessBadge.tone
                )}`}
                data-trend-collect={freshnessBadge.tone || "sample"}
              >
                <strong>{freshnessBadge.strong}</strong>
                {freshnessBadge.detail ? (
                  <span className="ml-2 opacity-90">{freshnessBadge.detail}</span>
                ) : null}
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
                          {canShowHourlyClaims && item.status !== "new" && item.hourlyChange ? (
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
                            {canShowHourlyClaims ? formatMovement(item) : "—"}
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
                        이 주제로 콘텐츠 만들기
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
                  {canShowHourlyClaims ? "최근 수집에서 오른 AI" : "상승 후보"}
                </h2>
                <div className="mt-5">
                  <TrendMiniList
                    items={canShowHourlyClaims ? risingItems : []}
                    emptyMessage={
                      canShowHourlyClaims
                        ? "최근 수집에서 순위가 오른 도구가 없습니다."
                        : "신선도가 확인된 수집 데이터가 있을 때만 상승 목록을 표시합니다."
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-[12px] font-medium text-[#5F6B66]">신규</p>
                <h2 className="mt-3 break-keep text-[23px] font-semibold leading-[1.3] text-[#111111]">
                  {canShowHourlyClaims ? "이번 수집에서 새로 들어온 AI" : "신규 후보"}
                </h2>
                <div className="mt-5">
                  <TrendMiniList
                    items={canShowHourlyClaims ? newItems : []}
                    metric="rank"
                    emptyMessage={
                      canShowHourlyClaims
                        ? "이번 수집에서 새로 들어온 도구는 없습니다."
                        : "신선도가 확인된 수집 데이터가 있을 때만 신규 목록을 표시합니다."
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <LandingFaqSection />

        <section className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-9 md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-14">
            <div>
              <p className="text-[12px] font-medium text-[#5F6B66]">철학</p>
              <p className="mt-3 break-keep text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.35] text-[#111111]">
                <span className="font-semibold">브랜드의 생각을,</span>{" "}
                <span className="font-normal text-[#2C3531]">콘텐츠로.</span>
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
