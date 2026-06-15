import Link from "next/link";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE,
} from "@/lib/brand/copy";
import { buildLegalPageMetadata, buildLandingFaqJsonLd, resolvePublicSiteUrl } from "@/lib/brand/seo";
import JsonLdScript from "@/components/seo/JsonLdScript";
import {
  LANDING_FAQ_CATEGORIES,
  LANDING_FAQ_ITEMS,
} from "@/lib/landing/landingFaq";
import { GUIDE_PAGES } from "@/lib/seo/guidePages";

export const metadata = buildLegalPageMetadata({
  title: `자주 묻는 질문 · ${BRAND_META_TITLE}`,
  description: `${BRAND_META_DESCRIPTION} 요금·채널·무료 테스트·자료조사·발행 준비도 FAQ.`,
  path: "/help",
});

export default function HelpPage() {
  const siteUrl = resolvePublicSiteUrl();
  const faqJsonLd = buildLandingFaqJsonLd(siteUrl);

  return (
    <>
      <JsonLdScript data={faqJsonLd} />
      <main className="min-h-screen bg-[#F7F8FA] px-4 py-12 text-[#191F28]">
        <div className="mx-auto max-w-3xl">
          <p className="text-[12px] font-semibold text-[#03A94D]">
            {BRAND_LATEST_UPDATE.label}
          </p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight">
            브릭로그 도움말 · FAQ
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#4E5968]">
            {BRAND_META_DESCRIPTION}
          </p>
          <p className="mt-2 text-[14px] font-medium text-[#191F28]">
            {BRAND_LATEST_UPDATE.headline}
          </p>

          <nav
            className="mt-8 rounded-2xl border border-[#E8EBED] bg-white px-5 py-4"
            aria-label="콘텐츠 가이드"
          >
            <h2 className="text-[15px] font-bold text-[#191F28]">
              업종별 콘텐츠 가이드
            </h2>
            <p className="mt-1 text-[13px] text-[#4E5968]">
              네이버·플레이스·인스타 작성 팁 — 검색에도 노출되는 무료 가이드
            </p>
            <ul className="mt-3 space-y-2">
              {GUIDE_PAGES.slice(0, 4).map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/guides/${page.slug}`}
                    className="text-[13px] text-[#4E5968] hover:text-[#03A94D] hover:underline"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/guides" className="text-[13px] font-semibold text-[#03A94D] hover:underline">
                  가이드 전체 보기 →
                </Link>
              </li>
            </ul>
          </nav>

          <div className="mt-10 space-y-10">
            {LANDING_FAQ_CATEGORIES.map((cat) => {
              const items = LANDING_FAQ_ITEMS.filter(
                (i) => i.category === cat.id
              );
              if (!items.length) return null;
              return (
                <section key={cat.id} aria-labelledby={`help-${cat.id}`}>
                  <h2
                    id={`help-${cat.id}`}
                    className="text-[17px] font-bold text-[#191F28]"
                  >
                    {cat.label}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        id={item.id}
                        className="rounded-2xl border border-[#E8EBED] bg-white px-5 py-4"
                      >
                        <h3 className="text-[15px] font-semibold">{item.q}</h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-[#4E5968]">
                          {item.a}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="mt-12 text-[14px] text-[#4E5968]">
            더 궁금한 점은{" "}
            <Link href="/" className="font-semibold text-[#03A94D] hover:underline">
              briclog.ai
            </Link>
            에서 오른쪽 아래 ? AI 도움말을 켜 주세요.
          </p>
          <p className="mt-4">
            <Link href="/" className="text-[13px] text-[#03A94D] hover:underline">
              ← 홈으로
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
