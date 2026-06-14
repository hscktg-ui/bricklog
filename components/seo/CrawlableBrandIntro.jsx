import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_DESCRIPTION_EN,
  BRAND_META_TITLE,
} from "@/lib/brand/copy";

/** 검색 크롤러·스크린리더용 브랜드 소개 — 본문에 항상 포함 */
export default function CrawlableBrandIntro() {
  return (
    <div className="sr-only" aria-label={`${BRAND_META_TITLE} 소개`}>
      <p>
        <strong>{BRAND_META_TITLE}</strong> — {BRAND_META_DESCRIPTION}
      </p>
      <p>
        {BRAND_LATEST_UPDATE.label}: {BRAND_LATEST_UPDATE.headline}.{" "}
        {BRAND_LATEST_UPDATE.bullets.join(" ")}
      </p>
      <p lang="en">{BRAND_META_DESCRIPTION_EN}</p>
    </div>
  );
}
