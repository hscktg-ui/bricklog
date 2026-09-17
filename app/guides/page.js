import Link from "next/link";
import { BRAND_META_TITLE } from "@/lib/brand/copy";
import { buildGuidesIndexJsonLd, buildLegalPageMetadata, resolvePublicSiteUrl } from "@/lib/brand/seo";
import PageJsonLdScript from "@/components/seo/PageJsonLdScript";
import { GUIDE_PAGES } from "@/lib/seo/guidePages";

export const metadata = buildLegalPageMetadata({
  title: `콘텐츠·AI 순위 가이드 · ${BRAND_META_TITLE}`,
  description:
    "AI 도구 순위·랭킹 보는 법, 네이버·구글 SEO·AI 검색 가이드, 블로그·플레이스·인스타 매장 콘텐츠 작성법. 브릭로그 무료 샘플과 함께 확인하세요.",
  path: "/guides",
});

export default function GuidesIndexPage() {
  const siteUrl = resolvePublicSiteUrl();

  return (
    <>
      <PageJsonLdScript graphs={[buildGuidesIndexJsonLd(siteUrl)]} />
      <main className="min-h-screen bg-[#F7F8FA] px-4 py-12 text-[#191F28]">
      <div className="mx-auto max-w-3xl">
        <p className="text-[12px] font-semibold text-[#03A94D]">브릭로그 가이드</p>
        <h1 className="mt-2 text-[26px] font-bold tracking-tight">
          AI 순위·랭킹 · 매장 콘텐츠 가이드
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#4E5968]">
          AI 도구 순위 보는 법, 구글·네이버 SEO·AI 검색, 그리고 이야기·플레이스·인스타
          채널별 작성법을 정리했습니다.{" "}
          <Link href="/#trend-list" className="text-[#03A94D] hover:underline">
            실시간 AI 랭킹
          </Link>
          과{" "}
          <Link href="/#public-brand-test" className="text-[#03A94D] hover:underline">
            무료 발행 샘플
          </Link>
          로 바로 이어갈 수 있습니다.
        </p>

        <ul className="mt-10 space-y-4">
          {GUIDE_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                href={`/guides/${page.slug}`}
                className="block rounded-2xl border border-[#E8EBED] bg-white p-5 shadow-sm transition hover:border-[#03A94D]/40"
              >
                <h2 className="text-[17px] font-bold text-[#191F28]">{page.title}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4E5968]">
                  {page.description}
                </p>
                <p className="mt-3 text-[12px] font-medium text-[#03A94D]">자세히 보기 →</p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-[12px] text-[#8B95A1]">
          <Link href="/help" className="text-[#03A94D] hover:underline">
            FAQ·도움말
          </Link>
          {" · "}
          <a href={siteUrl} className="text-[#03A94D] hover:underline">
            briclog.ai
          </a>
        </p>
      </div>
    </main>
    </>
  );
}
