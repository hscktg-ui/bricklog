import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_META_TITLE } from "@/lib/brand/copy";
import { buildLegalPageMetadata, resolvePublicSiteUrl } from "@/lib/brand/seo";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { GUIDE_PAGES, getGuidePage } from "@/lib/seo/guidePages";

export function generateStaticParams() {
  return GUIDE_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getGuidePage(slug);
  if (!page) return {};
  return buildLegalPageMetadata({
    title: `${page.title} · ${BRAND_META_TITLE}`,
    description: page.description,
    path: `/guides/${page.slug}`,
  });
}

function buildArticleJsonLd(page, siteUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    keywords: page.keywords.join(", "),
    author: { "@type": "Organization", name: BRAND_META_TITLE },
    publisher: { "@type": "Organization", name: BRAND_META_TITLE },
    mainEntityOfPage: `${siteUrl}/guides/${page.slug}`,
    inLanguage: "ko-KR",
  };
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const page = getGuidePage(slug);
  if (!page) notFound();

  const siteUrl = resolvePublicSiteUrl();
  const jsonLd = buildArticleJsonLd(page, siteUrl);

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <main className="min-h-screen bg-[#F7F8FA] px-4 py-12 text-[#191F28]">
        <article className="mx-auto max-w-3xl">
          <p className="text-[12px] font-semibold text-[#03A94D]">
            <Link href="/guides" className="hover:underline">
              가이드
            </Link>
          </p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight">{page.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#4E5968]">{page.description}</p>

          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[18px] font-bold text-[#191F28]">{section.heading}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4E5968]">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-[#03A94D]/30 bg-white p-6 shadow-sm">
            <p className="text-[14px] font-bold text-[#191F28]">{page.cta}</p>
            <p className="mt-2 text-[13px] text-[#4E5968]">
              브랜드·지역·주제를 넣고 이야기·플레이스·인스타 미리보기를 무료로 확인하세요.
            </p>
            <Link
              href="/#public-brand-test"
              className="mt-4 inline-flex rounded-xl bg-[#03C75A] px-5 py-3 text-[14px] font-bold text-white"
            >
              발행 샘플 무료로 보기
            </Link>
          </div>

          <nav className="mt-10 flex flex-wrap gap-3 text-[12px]">
            <Link href="/guides" className="text-[#03A94D] hover:underline">
              ← 가이드 목록
            </Link>
            <Link href="/help" className="text-[#4E5968] hover:underline">
              FAQ
            </Link>
          </nav>
        </article>
      </main>
    </>
  );
}
