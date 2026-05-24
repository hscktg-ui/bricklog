import { BLOG_MIN_BODY_CHARS, BLOG_MAX_BODY_CHARS } from "@/lib/constants";

function Score({ label, ok, detail }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-[12px] ${
        ok ? "bg-[#E8F9EF] text-[#03A94D]" : "bg-[#FFF8E6] text-[#E67700]"
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-[11px]">{detail}</span>
    </div>
  );
}

export default function QualityPanel({ results, meta }) {
  if (!results?.blog) return null;

  const blogChars = meta?.blogCharCount ?? results.blog._meta?.charCount ?? 0;
  const mainKw = meta?.mainKeywordUses ?? results.blog._meta?.mainKeywordUses ?? 0;
  const placeDetail = meta?.placeDetailChars ?? results.smartplace?._meta?.detailChars ?? 0;
  const instaBody = meta?.instaBodyChars ?? results.insta?._meta?.bodyChars ?? 0;
  const hashtagCount =
    meta?.hashtagTotal ??
    results.hashtag?.all?.length ??
    0;

  const blogOk =
    blogChars >= BLOG_MIN_BODY_CHARS && blogChars <= BLOG_MAX_BODY_CHARS + 150;
  const mainOk = mainKw >= 6 && mainKw <= 12;
  const placeOk = placeDetail >= 250 && placeDetail <= 500;
  const instaOk = instaBody >= 500 && instaBody <= 950;
  const tagOk = hashtagCount >= 15;

  const passed = [blogOk, mainOk, placeOk, instaOk, tagOk].filter(Boolean).length;

  return (
    <div className="mb-3 rounded-xl border border-[#E8EBED] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#191F28]">발행 전 검수</p>
        <span className="text-[11px] font-semibold text-[#03A94D]">
          {passed}/5 충족
        </span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <Score
          label="블로그"
          ok={blogOk}
          detail={`${blogChars.toLocaleString()}자`}
        />
        <Score label="메인키워드" ok={mainOk} detail={`${mainKw}회`} />
        <Score label="플레이스" ok={placeOk} detail={`${placeDetail}자`} />
        <Score label="인스타" ok={instaOk} detail={`${instaBody}자`} />
        <Score label="해시태그" ok={tagOk} detail={`${hashtagCount}개`} />
      </div>
    </div>
  );
}
