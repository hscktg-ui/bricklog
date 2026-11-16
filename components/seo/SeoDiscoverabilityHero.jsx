import Link from "next/link";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_DESCRIPTION_EN,
  BRAND_META_TITLE_KO,
  LANDING_PRIMARY_CTA,
  LANDING_SECONDARY_CTA,
} from "@/lib/brand/copy";
import { GUIDE_PAGES } from "@/lib/seo/guidePages";

/**
 * 서버 HTML에 항상 포함 — 네이버·구글 크롤러용 (JS 없이 브랜드·서비스 설명)
 * 첫 화면은 클라이언트 홈이 담당하고, 여기는 검색엔진용 설명 블록을 유지한다.
 */
export default function SeoDiscoverabilityHero({
  trendCatalog,
  initialQuery = "",
  initialCategory = "all",
}) {
  const featuredGuides = GUIDE_PAGES.slice(0, 4);
  const query = String(initialQuery || "").trim().toLowerCase();
  const activeCategory = String(initialCategory || "all").trim().toLowerCase();
  const allTrends = trendCatalog?.items || [];
  const featuredTrends = (trendCatalog?.topItems || allTrends).slice(0, 10);
  const filteredTrends = allTrends
    .filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (!query) return true;
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
    })
    .slice(0, 10);
  const freshness =
    trendCatalog?.live?.freshnessLabel ||
    trendCatalog?.live?.liveLabel ||
    trendCatalog?.note ||
    "";
  const isSample = trendCatalog?.mode === "sample";

  return (
    <section id="briclog-seo-intro" className="sr-only" aria-label="브릭로그 서비스 소개">
      <h1>{BRAND_META_TITLE_KO} — 브랜드의 생각을, 콘텐츠로</h1>
      <p>{BRAND_META_DESCRIPTION}</p>
      <p>
        브릭로그는 브랜드명·지역·주제를 받아 네이버 블로그·스마트플레이스·인스타그램 초안을
        만듭니다. 조사·검수 뒤 복사해 각 앱에 게시하고, 가입 후 작업실에서 브랜드 기록을
        이어갑니다. AI 도구·모델 순위는 별도 섹션과 트렌드 페이지에서 탐색할 수 있습니다.
      </p>
      <p>
        {BRAND_LATEST_UPDATE.label}: {BRAND_LATEST_UPDATE.headline}
      </p>
      <p lang="en">{BRAND_META_DESCRIPTION_EN}</p>
      <ul>
        {BRAND_LATEST_UPDATE.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h2>브랜드 콘텐츠 미리보기</h2>
      <p>
        브랜드명·지역·주제를 입력하면 블로그·스마트플레이스·인스타 미리보기를 받을 수 있습니다.
        마음에 들면 가입 후 작업실에서 전체 초안과 운영 기록을 이어가세요.
      </p>
      <h2>AI 도구 순위·트렌드</h2>
      <p>
        ChatGPT, Gemini, Claude, Midjourney 등 AI 도구·모델의 순위와 수집 상태를 확인할 수
        있습니다.{" "}
        {isSample
          ? "현재 화면은 예시(SAMPLE) 구조일 수 있으며, 실시간 변동을 보장하지 않습니다."
          : freshness
            ? `최근 수집 상태: ${freshness}`
            : "수집 시각과 출처는 트렌드 화면에서 확인할 수 있습니다."}
      </p>
      {query ? (
        <>
          <h2>Search Results</h2>
          <p>
            Search results for {query} {activeCategory !== "all" ? `in ${activeCategory}` : ""}.
          </p>
          <ul>
            {filteredTrends.map((item, index) => (
              <li key={`query-${item.slug}`}>
                <Link href={`/trend/${item.slug}`}>
                  {index + 1}. {item.name} - {item.description}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <ol>
        {featuredTrends.map((item, index) => (
          <li key={item.slug}>
            <Link href={`/trend/${item.slug}`}>
              {item.currentRank || index + 1}위 {item.name} — {item.description}
              {item.trendScore != null ? ` · 점수 ${item.trendScore}` : ""}
            </Link>
          </li>
        ))}
      </ol>
      <h2>구글·네이버 SEO와 AI 검색</h2>
      <p>
        주제 권위, 경험·관찰, 브랜드·지역 엔티티를 넣어 구글 검색·네이버 검색에 읽히기 쉬운
        설명형 초안 구조로 이어갑니다. 검색 상위 노출을 보장하지는 않습니다.
      </p>
      <nav aria-label="검색용 가이드 링크">
        <Link href="/?landing=1#public-brand-test" data-briclog-cta="start">
          {LANDING_PRIMARY_CTA}
        </Link>
        <Link href="/#trend-list">{LANDING_SECONDARY_CTA}</Link>
        <Link href="/guides/ai-trend-ranking">AI 도구 순위·랭킹 보는 법</Link>
        <Link href="/guides/naver-google-ai-seo">네이버·구글 AI 검색 SEO 가이드</Link>
        <Link href="/#public-brand-test" id="landing-sample">
          샘플 체험
        </Link>
        <Link href="/#landing-pricing" id="landing-pricing-seo">
          무료 시작 및 채널 안내
        </Link>
        <span id="pricing" hidden>
          요금 · 플랜
        </span>
        {featuredGuides.map((page) => (
          <Link key={page.slug} href={`/guides/${page.slug}`}>
            {page.title}
          </Link>
        ))}
      </nav>
    </section>
  );
}
