"use client";

import { useEffect, useMemo, useState } from "react";
import { runKeywordIntelligence } from "@/lib/keywords/keywordIntelligence";

function KeywordRow({ item, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.keyword, item.kind)}
      className="w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-left hover:border-[#03C75A]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#191F28]">
          {item.keyword}
        </span>
        <span className="shrink-0 text-[12px] font-bold text-[#03A94D]">
          {item.composite}점
        </span>
      </div>
      <p className="mt-1 text-[10px] text-[#8B95A1]">
        지역 {item.regionFit} · 시즌 {item.seasonFit} · 브랜드 {item.brandFit}
      </p>
      <p className="mt-0.5 text-[10px] text-[#B0B8C1]">{item.volumeLabel}</p>
      {item.trendLabel && (
        <p className="text-[10px] text-[#4E5968]">{item.trendLabel}</p>
      )}
      {item.reasons?.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-[10px] text-[#8B95A1]">
          {item.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </button>
  );
}

export default function KeywordIntelligencePanel({ values, onApplyKeyword }) {
  const [report, setReport] = useState(null);

  const ready = Boolean(
    values?.region?.trim() &&
      (values?.topic?.trim() || values?.brandName?.trim())
  );

  useEffect(() => {
    if (!ready) {
      setReport(null);
      return;
    }
    const t = setTimeout(() => {
      setReport(runKeywordIntelligence(values));
    }, 280);
    return () => clearTimeout(t);
  }, [
    ready,
    values?.region,
    values?.brandName,
    values?.topic,
    values?.mainKeyword,
    values?.industry,
    values?.contentDate,
  ]);

  const strategy = useMemo(() => report?.strategy, [report]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-3">
        <p className="text-[12px] font-semibold text-[#4E5968]">키워드 인텔리전스</p>
        <p className="mt-1 text-[11px] text-[#8B95A1]">
          브랜드명·지역·주제 입력 후 검색 기반 키워드를 분석합니다.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-[#E8EBED] bg-white p-3 text-[12px] text-[#8B95A1]">
        키워드 분석 중…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-3 space-y-3">
      <div>
        <p className="text-[12px] font-semibold text-[#03A94D]">키워드 인텔리전스</p>
        <p className="text-[11px] text-[#8B95A1]">
          {report.dataVerified
            ? "트렌드 스냅샷 반영 · "
            : ""}
          검색량 API: {report.apiStatus === "keyword_apis_pending" ? "연동 대기" : report.apiStatus}
        </p>
      </div>

      <div className="rounded-lg bg-[#F0FAF4] px-3 py-2">
        <p className="text-[11px] font-semibold text-[#03A94D]">추천 전략 · {strategy}</p>
        <p className="text-[11px] text-[#4E5968]">{report.strategyReason}</p>
        <p className="mt-1 text-[12px] font-bold text-[#191F28]">
          메인 권장: {report.recommendedMain}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-[#4E5968]">추천 메인</p>
        <div className="space-y-1.5">
          {report.mains.slice(0, 3).map((k) => (
            <KeywordRow key={k.keyword} item={k} onSelect={onApplyKeyword} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-[#4E5968]">서브</p>
        <div className="flex flex-wrap gap-1.5">
          {report.subs.slice(0, 6).map((k) => (
            <button
              key={k.keyword}
              type="button"
              onClick={() => onApplyKeyword(k.keyword, "sub")}
              className="rounded-full border border-[#E8EBED] px-2.5 py-1 text-[11px] hover:border-[#03C75A]"
            >
              {k.keyword}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-[#4E5968]">롱테일</p>
        <div className="space-y-1">
          {report.longtails.slice(0, 4).map((k) => (
            <KeywordRow key={k.keyword} item={k} onSelect={onApplyKeyword} />
          ))}
        </div>
      </div>
    </div>
  );
}
