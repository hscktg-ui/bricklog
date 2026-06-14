"use client";

import Link from "next/link";
import { StatCard } from "@/components/admin/AdminCharts";

/**
 * @param {{ snapshot?: import("@/lib/admin/productOverviewSnapshot").ReturnType<typeof import("@/lib/admin/productOverviewSnapshot").getProductOverviewSnapshot> | null, publicTest?: object }} props
 */
export default function AdminProductOverviewPanel({ snapshot, publicTest = {} }) {
  if (!snapshot) {
    return (
      <section className="rounded-2xl border border-[#E8EBED] bg-white p-5">
        <p className="text-[14px] text-[#8B95A1]">제품 개요를 불러오는 중…</p>
      </section>
    );
  }

  const { product, seo, assistant, quality } = snapshot;
  const ver = seo.verification || {};
  const verOk = ver.google && ver.naver;

  return (
    <section className="rounded-2xl border border-[#E8EBED] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#03A94D]">
            제품 · SEO · 도움말 AI
          </p>
          <h2 className="mt-1 text-[18px] font-bold text-[#191F28]">
            {product.latestUpdate?.label}
          </h2>
          <p className="mt-1 text-[13px] text-[#4E5968]">
            {product.latestUpdate?.headline}
          </p>
        </div>
        <Link
          href="/help"
          target="_blank"
          className="rounded-lg border border-[#E8EBED] px-3 py-1.5 text-[12px] font-medium text-[#03A94D] hover:bg-[#F6FDF9]"
        >
          FAQ 미리보기 ↗
        </Link>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {(product.latestUpdate?.bullets || []).map((line) => (
          <li
            key={line}
            className="flex gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2 text-[12px] text-[#4E5968]"
          >
            <span className="text-[#03A94D]">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="FAQ 항목" value={assistant.faqCount} small />
        <StatCard label="AI 추천 질문" value={assistant.quickPromptCount} small />
        <StatCard
          label="무료 샘플 7일"
          value={publicTest.runs7d ?? "—"}
          small
        />
        <StatCard
          label="품질 준비도"
          value={quality.readinessScore ?? "—"}
          small
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E8EBED] p-4">
          <h3 className="text-[14px] font-bold">검색 노출 (메타·사이트맵)</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-[#4E5968]">
            <strong className="text-[#191F28]">제목</strong> — {product.title}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#4E5968]">
            <strong className="text-[#191F28]">설명</strong> — {product.description}…
          </p>
          <p className="mt-3 text-[12px] text-[#4E5968]">
            사이트맵: {seo.sitemapPaths?.join(", ")}
          </p>
          <p className="mt-2 text-[12px]">
            Search Console — Google{" "}
            <span className={ver.google ? "text-[#03A94D]" : "text-amber-700"}>
              {ver.google ? "설정됨" : "미설정"}
            </span>
            {" · "}
            Naver{" "}
            <span className={ver.naver ? "text-[#03A94D]" : "text-amber-700"}>
              {ver.naver ? "설정됨" : "미설정"}
            </span>
            {!verOk ? (
              <span className="mt-1 block text-[11px] text-amber-800">
                NEXT_PUBLIC_GOOGLE/NAVER_SITE_VERIFICATION env 확인
              </span>
            ) : null}
          </p>
        </div>

        <div className="rounded-xl border border-[#E8EBED] p-4">
          <h3 className="text-[14px] font-bold">품질 KPI · 채널 배치</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(product.kpis || []).map((k) => (
              <span
                key={k.id}
                className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[11px] font-medium text-[#4E5968]"
              >
                {k.label} {k.weight}
              </span>
            ))}
          </div>
          {quality.crossChannelBatch ? (
            <p className="mt-3 text-[12px] text-[#4E5968]">
              cross-channel 배치 — 통과율{" "}
              {quality.crossChannelBatch.passRate ?? "—"}% / n=
              {quality.crossChannelBatch.total ?? "—"}
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-[#8B95A1]">
              cross-channel 배치 요약 없음 (artifacts/cross-channel-batch)
            </p>
          )}
          <ul className="mt-3 space-y-1 text-[12px] text-[#4E5968]">
            {(product.features || []).map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
