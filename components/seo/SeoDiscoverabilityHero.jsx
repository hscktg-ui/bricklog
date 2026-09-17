import Link from "next/link";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE_KO,
} from "@/lib/brand/copy";
import { GUIDE_PAGES } from "@/lib/seo/guidePages";

/**
 * 서버 HTML에 항상 포함 — 네이버·구글 크롤러용 (JS 없이 브랜드·서비스 설명)
 * 첫 화면은 클라이언트 홈이 담당하고, 여기는 검색엔진용 설명 블록을 유지한다.
 */
export default function SeoDiscoverabilityHero() {
  const featuredGuides = GUIDE_PAGES.slice(0, 4);

  return (
    <section id="briclog-seo-intro" className="sr-only" aria-label="브릭로그 서비스 소개">
      <h1>{BRAND_META_TITLE_KO}</h1>
      <p>{BRAND_META_DESCRIPTION}</p>
      <p>
        BRICLOG은 AI 트렌드를 검색하고, 왜 중요한지 이해한 뒤, 브랜드 콘텐츠로 연결하는
        서비스입니다. 기존 블로그, 스마트플레이스, 인스타 초안 생성과 발행 준비도 확인 기능은
        그대로 유지됩니다.
      </p>
      <p>
        {BRAND_LATEST_UPDATE.label}: {BRAND_LATEST_UPDATE.headline}
      </p>
      <ul>
        {BRAND_LATEST_UPDATE.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <nav aria-label="검색용 가이드 링크">
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
