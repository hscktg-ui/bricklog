import Link from "next/link";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_DESCRIPTION_EN,
  BRAND_META_TITLE_KO,
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

  return (
    <section id="briclog-seo-intro" className="sr-only" aria-label="브릭로그 서비스 소개">
      <h1>{BRAND_META_TITLE_KO} — AI 순위·랭킹 트렌드 보기</h1>
      <p>{BRAND_META_DESCRIPTION}</p>
      <p>
        브릭로그는 AI 도구·모델 순위와 실시간 랭킹 트렌드를 보여 주고, 왜 움직이는지 설명한 뒤
        네이버 블로그·스마트플레이스·인스타 초안으로 연결합니다. 구글 SEO·네이버 SEO·AI 검색·브리핑에
        잡히기 쉬운 설명형 콘텐츠를 확인 후 복사해 게시합니다.
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
      <h2>AI 순위 · 실시간 랭킹 Top 10</h2>
      <p>
        ChatGPT, Gemini, Claude, Midjourney 등 AI 도구·모델의 현재 순위, 변동, 점수를 한 화면에서
        확인하세요. 구글·네이버에서 「AI 순위」「AI 랭킹」「AI 트렌드 보기」로 찾는 정보를
        브릭로그가 정리합니다.
      </p>
      <h2>Live AI Trend Ranking</h2>
      <p>
        BRICLOG tracks live AI tool and model rankings for founders, marketers, operators, and
        developers — then turns the insight into brand content drafts.
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
        AI 순위·랭킹만 보고 끝내지 않습니다. 주제 권위, 경험·관찰, 브랜드·지역 엔티티를 넣어
        구글 검색·네이버 검색·네이버 AI 브리핑에 인용되기 쉬운 초안 구조로 이어갑니다.
      </p>
      <nav aria-label="검색용 가이드 링크">
        <Link href="/?landing=1" data-briclog-cta="start">
          AI 순위·랭킹 트렌드 보기
        </Link>
        <Link href="/#trend-list">실시간 AI 랭킹</Link>
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
        <Link href="/help">자주 묻는 질문</Link>
        <Link href="/guides">콘텐츠 가이드</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
      </nav>
    </section>
  );
}
