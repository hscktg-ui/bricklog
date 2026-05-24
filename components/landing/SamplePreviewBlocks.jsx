"use client";

import {
  splitInstaCaption,
  splitParagraphs,
  splitPlaceDetailLines,
} from "@/lib/landing/formatSampleBody";

function Paragraphs({ text, className = "" }) {
  const parts = splitParagraphs(text);
  if (!parts.length) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      {parts.map((p, i) => (
        <p
          key={i}
          className="text-[13px] leading-[1.8] text-[#4E5968] sm:text-[14px]"
        >
          {p}
        </p>
      ))}
    </div>
  );
}

/** @param {{ blog: import('@/lib/landing/sampleContent').LANDING_SAMPLE['blog'] }} props */
export function SampleBlogPreview({ blog }) {
  const hasSections = blog.sections?.length > 0;

  return (
    <article className="sample-preview-blog">
      <h3 className="border-b border-[#E8EBED] pb-3 text-[17px] font-bold leading-snug text-[#191F28] sm:text-[18px]">
        {blog.title}
      </h3>
      {blog.excerpt ? (
        <p className="mt-4 text-[14px] font-medium leading-relaxed text-[#4E5968] sm:text-[15px]">
          {blog.excerpt}
        </p>
      ) : null}

      {hasSections ? (
        <div className="mt-6 space-y-7">
          {blog.sections.map((sec, i) => (
            <section key={i}>
              <h4 className="text-[14px] font-bold text-[#191F28] sm:text-[15px]">
                {sec.heading}
              </h4>
              <div className="mt-2.5">
                <Paragraphs text={sec.body} />
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <Paragraphs text={blog.body || blog.excerpt} />
        </div>
      )}

      {blog.conclusion ? (
        <p className="mt-7 border-t border-[#E8EBED] pt-4 text-[13px] font-semibold leading-relaxed text-[#191F28] sm:text-[14px]">
          {blog.conclusion}
        </p>
      ) : null}

      {blog.charHint ? (
        <p className="mt-4 text-[11px] text-[#8B95A1]">{blog.charHint}</p>
      ) : null}
    </article>
  );
}

/** @param {{ place: import('@/lib/landing/sampleContent').LANDING_SAMPLE['place'] }} props */
export function SamplePlacePreview({ place }) {
  const lines = splitPlaceDetailLines(place.detail);

  return (
    <article>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#03A94D]">
        플레이스
      </p>
      <h3 className="mt-2 text-[16px] font-bold text-[#191F28] sm:text-[17px]">
        {place.title}
      </h3>
      <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#191F28]">
        {place.short}
      </p>
      {lines.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-[#E8EBED] pt-4">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] leading-relaxed text-[#4E5968] sm:text-[14px]"
            >
              <span className="shrink-0 font-bold text-[#03C75A]">
                {line.startsWith("·") ? "·" : "—"}
              </span>
              <span className="min-w-0 flex-1">
                {line.replace(/^·\s*/, "")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/** @param {{ body: string }} props */
export function SampleInstaPreview({ body }) {
  const { paragraphs, hashtags } = splitInstaCaption(body);

  return (
    <article>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#E67700]">
        인스타 캡션
      </p>
      <div className="mt-3 space-y-2.5">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="whitespace-pre-line text-[14px] leading-[1.65] text-[#191F28] sm:text-[15px]"
          >
            {p}
          </p>
        ))}
      </div>
      {hashtags ? (
        <p className="mt-4 border-t border-[#E8EBED] pt-3 text-[12px] leading-relaxed text-[#8B95A1]">
          {hashtags}
        </p>
      ) : null}
    </article>
  );
}
