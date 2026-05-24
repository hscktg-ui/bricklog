"use client";

import { researchTypeLabels } from "@/lib/research/types";

/**
 * @param {{
 *   result: import("@/lib/research/types").ResearchResult | null;
 *   query?: string;
 *   types?: string[];
 * }} props
 */
export default function ResearchResultPanel({ result, query = "", types = [] }) {
  if (!result?.summary) return null;

  const typeLine = researchTypeLabels(types).join(" · ");
  const researchedAt = result.researchedAt
    ? new Date(result.researchedAt).toLocaleString("ko-KR")
    : null;

  return (
    <section
      className="mb-6 rounded-2xl border border-[#03C75A]/25 bg-gradient-to-br from-[#F6FDF9] to-white p-4 shadow-sm md:p-5"
      aria-labelledby="research-result-heading"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3
          id="research-result-heading"
          className="text-[14px] font-bold text-[#03A94D]"
        >
          [조사결과]
        </h3>
        {researchedAt ? (
          <span className="text-[11px] text-[#8B95A1]">{researchedAt}</span>
        ) : null}
      </div>

      {query ? (
        <p className="text-[12px] text-[#4E5968]">
          <span className="font-medium text-[#191F28]">주제</span> {query}
          {typeLine ? (
            <span className="text-[#8B95A1]"> · {typeLine}</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B95A1]">
            요약
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#191F28]">
            {result.summary}
          </p>
        </div>

        {(result.keywords || []).length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B95A1]">
              키워드
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {result.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[12px] text-[#4E5968] ring-1 ring-[#E8EBED]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {(result.channelInsights || []).length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B95A1]">
              채널별 참고 (국내·해외)
            </p>
            <ul className="mt-1.5 space-y-2 text-[12px] leading-relaxed text-[#4E5968]">
              {result.channelInsights.map((row, i) => (
                <li
                  key={`${row.channel}-${i}`}
                  className="rounded-lg bg-white px-3 py-2 ring-1 ring-[#E8EBED]"
                >
                  <span className="font-semibold text-[#191F28]">
                    {row.channel || "채널"}
                  </span>
                  <p className="mt-0.5">{row.finding || row.note}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(result.competitors || []).length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B95A1]">
              경쟁사 정보
            </p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-[#4E5968]">
              {result.competitors.map((c, i) => (
                <li key={`${c.name}-${i}`}>
                  <span className="font-medium text-[#191F28]">
                    {c.name || "—"}
                  </span>
                  {c.note ? ` — ${c.note}` : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(result.sources || []).length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B95A1]">
              출처
            </p>
            <ul className="mt-1.5 space-y-1.5 text-[12px] text-[#4E5968]">
              {result.sources.map((s, i) => (
                <li key={`${s.title}-${i}`}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#03A94D] hover:underline"
                    >
                      {s.title || s.url}
                    </a>
                  ) : (
                    <span className="font-medium text-[#191F28]">
                      {s.title || "참고"}
                    </span>
                  )}
                  {s.note ? (
                    <span className="block text-[#8B95A1]">{s.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result.disclaimer ? (
          <p className="rounded-lg bg-[#FFF9E6] px-3 py-2 text-[11px] leading-relaxed text-[#8A6D00]">
            {result.disclaimer}
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[#03C75A]/15 pt-3">
        <p className="text-[11px] font-semibold text-[#8B95A1]">↓ 최종 콘텐츠</p>
      </div>
    </section>
  );
}
