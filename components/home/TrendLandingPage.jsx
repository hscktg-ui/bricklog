"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";
import { BRICLOG_CONTACT_EMAIL } from "@/lib/brand/support";
import {
  TREND_CATEGORY_LABELS,
  TREND_CATEGORY_ORDER,
} from "@/lib/trends/seedCatalog";

const SEARCH_EXAMPLES = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Cursor",
  "Veo",
  "Sora",
  "Midjourney",
];

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

function formatDelta(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

function directionGlyph(direction) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

export default function TrendLandingPage({
  trendCatalog,
  onAuthOpen,
  onStart,
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const items = useMemo(() => trendCatalog?.items || [], [trendCatalog]);
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (activeCategory !== "all" && item.category !== activeCategory) return false;
        return matchesTrend(item, query);
      }),
    [items, activeCategory, query]
  );

  const topItems = filteredItems.slice(0, 10);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((item) => matchesTrend(item, q))
      .slice(0, 5);
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

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      scrollTo("trend-list");
      return;
    }
    const target = exactMatch || suggestions[0];
    if (target) {
      router.push(`/trend/${target.slug}`);
      return;
    }
    const encoded = encodeURIComponent(query.trim());
    router.push(`/?topic=${encoded}#public-brand-test`);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openSignup = () => onStart?.();
  const openLogin = () => onAuthOpen?.("login", "trend_home");
  const trendRequestHref = `mailto:${BRICLOG_CONTACT_EMAIL}?subject=${encodeURIComponent(
    "BRICLOG Trend 등록 요청"
  )}&body=${encodeURIComponent(query.trim())}`;

  return (
    <div className="min-h-screen bg-[#FCFCFA] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-[#E7ECE8]/80 bg-[#FCFCFA]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Logo
            showIcon
            wordmark="BRICLOG"
            iconSize={28}
            className="items-center"
            onClick={() => scrollTo("trend-search")}
          />
          <nav className="hidden items-center gap-4 text-[13px] font-medium text-[#4F5A56] md:flex">
            <button type="button" onClick={() => scrollTo("trend-list")} className="hover:text-[#111111]">
              TREND
            </button>
            <button type="button" onClick={() => scrollTo("trend-search")} className="hover:text-[#111111]">
              SEARCH
            </button>
            <button type="button" onClick={() => scrollTo("brief-preview")} className="hover:text-[#111111]">
              APPLY
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
              className="inline-flex min-h-[42px] items-center rounded-full bg-[#111111] px-4 text-[13px] font-semibold text-white hover:opacity-92"
            >
              작업실
            </button>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section id="trend-search" className="px-4 pb-10 pt-12 md:px-6 md:pb-16 md:pt-20">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-[14px] font-semibold tracking-[0.16em] text-[#03A94D]">
              BRICLOG
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.5rem,7vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[#111111]">
              지금, AI에서
              <br />
              무슨 일이 일어나고 있을까?
            </h1>
            <p className="mt-4 text-[16px] leading-[1.7] text-[#5F6B66] md:text-[18px]">
              What&apos;s happening in AI — right now.
            </p>
            <p className="mt-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#8A948F]">
              Discover. Understand. Apply. Create.
            </p>

            <form onSubmit={handleSearchSubmit} className="mx-auto mt-9 max-w-4xl">
              <label className="sr-only" htmlFor="trend-search-input">
                AI 검색
              </label>
              <div className="overflow-hidden rounded-[34px] border border-[#DCE3DF] bg-white shadow-[0_24px_80px_rgba(17,17,17,0.06)]">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
                  <input
                    id="trend-search-input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="AI, 모델, 도구, 기술을 검색하세요"
                    className="h-14 flex-1 border-0 bg-transparent px-1 text-[18px] text-[#111111] outline-none placeholder:text-[#8A948F] md:text-[22px]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#03C75A] px-6 text-[15px] font-semibold text-white hover:brightness-105"
                  >
                    검색
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
                                <span className="block text-[15px] font-semibold text-[#111111]">
                                  {item.name}
                                </span>
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
                        <p className="mt-1 text-[13px] leading-[1.7] text-[#5F6B66]">
                          1차 MVP에서는 curated seed와 DB 등록 항목만 보여줍니다.
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
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[12px] text-[#5F6B66]">
              {SEARCH_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded-full border border-[#E7ECE8] bg-white px-3 py-1.5 hover:border-[#03C75A]/35 hover:text-[#111111]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="trend-list" className="border-t border-[#E7ECE8] px-4 py-10 md:px-6 md:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Live AI Trend
                </p>
                <h2 className="mt-3 text-[clamp(1.7rem,4vw,2.8rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#111111]">
                  지금 많이 움직이는 AI 흐름을
                  <br className="hidden md:block" />
                  한 번에 스캔하세요.
                </h2>
              </div>
              <div className="max-w-xl rounded-[22px] border border-[#E7ECE8] bg-white px-4 py-3 text-[12px] leading-[1.7] text-[#5F6B66]">
                <strong className="text-[#111111]">
                  {trendCatalog?.mode === "sample" ? "SAMPLE DATA" : "CACHED DATA"}
                </strong>
                <span className="ml-2">{trendCatalog?.note}</span>
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

            <div className="mt-6 overflow-hidden rounded-[28px] border border-[#E7ECE8] bg-white">
              <div className="hidden grid-cols-[70px_minmax(0,1.5fr)_120px_90px_90px_130px] gap-4 border-b border-[#EEF2EF] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B8680] md:grid">
                <span>Rank</span>
                <span>Name</span>
                <span>Category</span>
                <span>Score</span>
                <span>7D</span>
                <span>Updated</span>
              </div>

              {topItems.length ? (
                <ul>
                  {topItems.map((item) => (
                    <li key={item.slug} className="border-b border-[#EEF2EF] last:border-b-0">
                      <Link
                        href={`/trend/${item.slug}`}
                        className="grid gap-3 px-4 py-4 transition hover:bg-[#F7FBF8] md:grid-cols-[70px_minmax(0,1.5fr)_120px_90px_90px_130px] md:items-center md:px-5"
                      >
                        <div className="flex items-center gap-3 md:block">
                          <span className="text-[20px] font-semibold tracking-[-0.04em] text-[#111111] md:text-[18px]">
                            {String(item.rank).padStart(2, "0")}
                          </span>
                          <span className="rounded-full border border-[#E7ECE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5F6B66] md:hidden">
                            {item.categoryLabel}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[16px] font-semibold text-[#111111]">{item.name}</span>
                            <span
                              className={`text-[12px] font-semibold ${
                                item.change7d >= 0 ? "text-[#03A94D]" : "text-[#C2410C]"
                              }`}
                            >
                              {directionGlyph(item.direction)} {formatDelta(item.change7d)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[13px] text-[#5F6B66]">{item.description}</p>
                        </div>

                        <span className="hidden text-[12px] font-medium text-[#5F6B66] md:block">
                          {item.categoryLabel}
                        </span>
                        <span className="text-[22px] font-semibold tracking-[-0.05em] text-[#111111] md:text-[18px]">
                          {item.trendScore}
                        </span>
                        <span
                          className={`text-[13px] font-semibold ${
                            item.change7d >= 0 ? "text-[#03A94D]" : "text-[#C2410C]"
                          }`}
                        >
                          {formatDelta(item.change7d)}
                        </span>
                        <span className="text-[12px] text-[#7B8680]">{item.updatedLabel}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-[17px] font-semibold text-[#111111]">조건에 맞는 트렌드가 없습니다.</p>
                  <p className="mt-2 text-[14px] leading-[1.7] text-[#5F6B66]">
                    다른 카테고리를 보거나 검색어를 줄여 보세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="brief-preview" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,420px)] lg:items-start">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Apply
                </p>
                <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[#111111]">
                  AI 소식을 보는 데서
                  <br className="hidden md:block" />
                  끝내지 않습니다.
                </h2>
                <p className="mt-4 max-w-2xl text-[17px] leading-[1.8] text-[#4F5A56]">
                  BRICLOG은 트렌드를 찾고, 왜 중요한지 이해한 다음, 내 브랜드에 어떤 소재와 채널로
                  적용할지 정리해 실행으로 연결하는 작업실입니다.
                </p>
              </div>

              <div className="rounded-[28px] border border-[#111111] bg-[#111111] p-6 text-white">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  BRIEF PREVIEW
                </p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Trend
                    </p>
                    <p className="mt-2 text-[20px] font-semibold">Veo</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Why It Matters
                    </p>
                    <p className="mt-2 text-[14px] leading-[1.75] text-white/78">
                      영상 퀄리티 경쟁이 커질수록 브랜드는 무엇을 찍고 어떤 메시지로 전환할지 먼저
                      정해야 합니다.
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Possible Angles
                    </p>
                    <ul className="mt-3 space-y-2 text-[14px] leading-[1.7] text-white/82">
                      <li>1. 제품 사용 장면을 짧은 설명형 릴스로 재구성</li>
                      <li>2. 블로그에서 영상 포맷 변화가 구매 설명을 어떻게 바꾸는지 정리</li>
                      <li>3. 인스타 캡션용 한 문장 CTA와 댓글 유도 문장 분리</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="create-with-briclog" className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,360px)] lg:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Create With BRICLOG
                </p>
                <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[#111111]">
                  찾았다면, 이제 활용하세요.
                </h2>
                <p className="mt-4 max-w-2xl text-[17px] leading-[1.8] text-[#4F5A56]">
                  지금 움직이는 흐름을 발견하고, 왜 중요한지 이해한 뒤, 브랜드의 콘텐츠로 바꿔보세요.
                  기존 BRICLOG의 블로그, 스마트플레이스, 인스타 생성 기능은 그대로 이어집니다.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5F6B66]">
                  <span>Discover</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span>Understand</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span>Apply</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span className="text-[#111111]">Create</span>
                  <span className="text-[#C6CFCA]">→</span>
                  <span className="text-[#111111]">Publish</span>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#E7ECE8] bg-white p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
                  Existing Products
                </p>
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
                  className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-[#03C75A] px-5 text-[14px] font-semibold text-white hover:brightness-105"
                >
                  BRICLOG 시작하기
                </button>
                <p className="mt-3 text-[12px] leading-[1.7] text-[#5F6B66]">
                  자동발행이 아니라, 초안을 만들고 복사해 게시하는 흐름은 그대로 유지합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <PublicBrandTestSection onSignup={(mode) => onAuthOpen?.(mode || "signup")} />

        <section className="border-t border-[#E7ECE8] px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            <Link
              href="/guides"
              className="rounded-[24px] border border-[#E7ECE8] bg-white p-5 transition hover:border-[#03C75A]/35 hover:bg-[#F8FCF9]"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
                Guides
              </p>
              <p className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#111111]">
                기존 검색 유입용 가이드 유지
              </p>
              <p className="mt-2 text-[14px] leading-[1.75] text-[#4F5A56]">
                블로그, 플레이스, 인스타 가이드를 그대로 두고 트렌드 흐름만 위에 얹습니다.
              </p>
            </Link>

            <Link
              href="/help"
              className="rounded-[24px] border border-[#E7ECE8] bg-white p-5 transition hover:border-[#03C75A]/35 hover:bg-[#F8FCF9]"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
                FAQ
              </p>
              <p className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#111111]">
                제품 정의는 그대로
              </p>
              <p className="mt-2 text-[14px] leading-[1.75] text-[#4F5A56]">
                자동발행이 아니라 초안 생성 후 복사·게시하는 서비스라는 정의를 계속 유지합니다.
              </p>
            </Link>

            <div className="rounded-[24px] border border-[#E7ECE8] bg-white p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
                Legal
              </p>
              <p className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#111111]">
                도움말 · 약관 · 정책 연결
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
