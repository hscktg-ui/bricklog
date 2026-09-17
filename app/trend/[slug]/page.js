import Link from "next/link";
import { notFound } from "next/navigation";
import PageJsonLdScript from "@/components/seo/PageJsonLdScript";
import { resolvePublicSiteUrl } from "@/lib/brand/seo";
import {
  buildTrendCreateHref,
  getTrendBySlug,
  getTrendRelatedItems,
} from "@/lib/trends/catalog";
import { buildTrendJsonLd, buildTrendPageMetadata } from "@/lib/trends/seo";
import { TREND_SEED_ITEMS } from "@/lib/trends/seedCatalog";

export function generateStaticParams() {
  return TREND_SEED_ITEMS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = await getTrendBySlug(slug);
  if (!item) return {};
  return buildTrendPageMetadata(item, resolvePublicSiteUrl());
}

function formatScoreDelta(change) {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change}`;
}

export default async function TrendDetailPage({ params }) {
  const { slug } = await params;
  const trend = await getTrendBySlug(slug);
  if (!trend) notFound();

  const related = await getTrendRelatedItems(slug, 3);
  const siteUrl = resolvePublicSiteUrl();
  const createHref = buildTrendCreateHref(trend.name);

  return (
    <>
      <PageJsonLdScript graphs={[buildTrendJsonLd(trend, siteUrl)]} />
      <main className="min-h-screen bg-[#FCFCFA] px-4 py-10 text-[#111111] md:px-6 md:py-14">
        <article className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-[#5F6B66]">
            <Link href="/" className="text-[#03A94D] hover:underline">
              BRICLOG
            </Link>
            <span aria-hidden>·</span>
            <Link href="/#trend-list" className="hover:underline">
              AI 순위·랭킹
            </Link>
            {trend.isSample ? (
              <>
                <span aria-hidden>·</span>
                <span className="rounded-full border border-[#DDE3DF] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111111]">
                  SAMPLE DATA
                </span>
              </>
            ) : null}
          </div>

          <section className="mt-7 border-b border-[#E7ECE8] pb-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  {trend.categoryLabel}
                  {trend.currentRank != null ? ` · ${trend.currentRank}위` : ""}
                </p>
                <h1 className="mt-3 text-[clamp(2.1rem,7vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#111111]">
                  {trend.name}
                </h1>
                <p className="mt-2 text-[14px] font-medium text-[#03A94D]">
                  AI 순위·랭킹 트렌드
                  {trend.currentRank != null ? ` · 현재 ${trend.currentRank}위` : ""}
                </p>
                <p className="mt-4 max-w-3xl text-[17px] leading-[1.7] text-[#4F5A56]">
                  {trend.description}
                </p>
              </div>

              <div className="min-w-[220px] rounded-[28px] border border-[#E7ECE8] bg-white p-5 md:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
                  Trend Score
                </p>
                <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.05em] text-[#111111]">
                  {trend.trendScore}
                </p>
                <p
                  className={`mt-3 text-[14px] font-semibold ${
                    trend.hourlyChange >= 0 ? "text-[#03A94D]" : "text-[#C2410C]"
                  }`}
                >
                  {trend.hourlyChange >= 0 ? "↑" : "↓"} {formatScoreDelta(trend.hourlyChange)} 1H
                </p>
                <dl className="mt-4 space-y-2 text-[13px] text-[#4F5A56]">
                  <div className="flex items-center justify-between gap-4">
                    <dt>STATUS</dt>
                    <dd className="font-semibold text-[#111111]">{trend.statusLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>RANK MOVE</dt>
                    <dd className="font-semibold text-[#111111]">
                      {trend.status === "new" && !trend.previousRank
                        ? "NEW"
                        : trend.rankMovement > 0
                          ? `↑${trend.rankMovement}`
                          : trend.rankMovement < 0
                            ? `↓${Math.abs(trend.rankMovement)}`
                            : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>LAST UPDATED</dt>
                    <dd className="font-semibold text-[#111111]">{trend.updatedLabel}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  What Is It?
                </p>
                <p className="mt-3 text-[17px] leading-[1.8] text-[#1E2623]">{trend.description}</p>
              </section>

              <section>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Why Now?
                </p>
                <ul className="mt-4 space-y-3">
                  {trend.whyTrending.map((line) => (
                    <li
                      key={line}
                      className="rounded-[22px] border border-[#E7ECE8] bg-white px-5 py-4 text-[15px] leading-[1.7] text-[#1E2623]"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Why It Matters
                </p>
                <p className="mt-3 text-[17px] leading-[1.85] text-[#1E2623]">{trend.whyItMatters}</p>
                <p className="mt-3 text-[13px] text-[#5F6B66]">{trend.freshnessLabel}</p>
              </section>

              {trend.briclogView ? (
                <section>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                    BRICLOG View
                  </p>
                  <div className="mt-4 rounded-[26px] border border-[#03C75A]/20 bg-[#F6FBF7] px-5 py-5">
                    <p className="text-[16px] leading-[1.85] text-[#1E2623]">{trend.briclogView}</p>
                  </div>
                </section>
              ) : null}

              <section>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Create With BRICLOG
                </p>
                <div className="mt-4 rounded-[26px] border border-[#111111] bg-[#111111] px-6 py-6 text-white">
                  <p className="text-[22px] font-semibold leading-[1.2] tracking-[-0.03em]">
                    이 트렌드로 콘텐츠 만들기
                  </p>
                  <p className="mt-3 max-w-2xl text-[14px] leading-[1.75] text-white/70">
                    로그인 상태라면 작업실의 이야기 입력칸에 주제가 채워지고, 비로그인 상태라면
                    샘플 체험 폼으로 연결됩니다. 브릭로그는 자동발행이 아니라 초안을 만들고 복사해
                    게시하는 방식입니다.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    <span>Trend</span>
                    <span>→</span>
                    <span>Apply</span>
                    <span>→</span>
                    <span>Create</span>
                  </div>
                  <Link
                    href={createHref}
                    className="mt-5 inline-flex min-h-[50px] items-center rounded-full bg-[#03C75A] px-6 text-[15px] font-semibold text-white hover:brightness-105"
                  >
                    이 트렌드로 콘텐츠 만들기 →
                  </Link>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[24px] border border-[#E7ECE8] bg-white p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Official
                </p>
                <a
                  href={trend.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-[15px] font-semibold text-[#03A94D] hover:underline"
                >
                  공식 사이트 보기
                </a>
              </section>

              <section className="rounded-[24px] border border-[#E7ECE8] bg-white p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Source Signals
                </p>
                <ul className="mt-4 space-y-3">
                  {trend.sourceSignals.map((signal) => (
                    <li key={`${signal.source}-${signal.metric}`} className="border-b border-[#EEF2EF] pb-3 last:border-b-0 last:pb-0">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#111111]">
                        {signal.source}
                      </p>
                      <p className="mt-1 text-[13px] text-[#4F5A56]">
                        {signal.metric} {signal.value}
                        {typeof signal.change === "number" ? ` · ${signal.change > 0 ? "+" : ""}${signal.change}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-[24px] border border-[#E7ECE8] bg-white p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#5F6B66]">
                  Related
                </p>
                <ul className="mt-4 space-y-3">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/trend/${item.slug}`} className="group block">
                        <p className="text-[14px] font-semibold text-[#111111] group-hover:text-[#03A94D]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-[12px] text-[#4F5A56]">
                          {item.categoryLabel} · {item.trendScore}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          <nav className="mt-12 flex flex-wrap gap-4 text-[13px]">
            <Link href="/" className="text-[#03A94D] hover:underline">
              ← 홈으로
            </Link>
            <Link href="/guides" className="text-[#4F5A56] hover:underline">
              가이드 보기
            </Link>
            <Link href="/help" className="text-[#4F5A56] hover:underline">
              FAQ
            </Link>
          </nav>
        </article>
      </main>
    </>
  );
}
