"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import GoldenDatasetPanel from "@/components/admin/GoldenDatasetPanel";

const TABS = [
  { id: "excellent", label: "우수글 데이터셋" },
  { id: "failure", label: "실패글 데이터셋" },
  { id: "dna", label: "업종별 DNA" },
  { id: "forbidden", label: "금칙어·문체" },
  { id: "scoring", label: "품질 점수 기준" },
];

export default function HaeshinContentHub({ showToast }) {
  const [tab, setTab] = useState("excellent");
  const [dna, setDna] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDna = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/haeshin-dna");
      setDna(res);
    } catch (err) {
      showToast?.(err?.message || "DNA 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (tab !== "excellent") loadDna();
  }, [tab, loadDna]);

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-[18px] font-bold text-[#191F28]">해신기획 콘텐츠 DNA · Golden Dataset</h2>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          GPT 재학습 없음 — 생성·검수·Safe Edit·점수 산정 SSOT
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                tab === t.id
                  ? "bg-[#03A94D] text-white"
                  : "border border-[#E8EBED] bg-white text-[#4E5968]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "excellent" && <GoldenDatasetPanel showToast={showToast} embedded />}

      {tab !== "excellent" && (
        <div className="rounded-xl border border-[#E8EBED] bg-white p-5">
          {loading && <p className="text-[13px] text-[#8B95A1]">불러오는 중…</p>}

          {tab === "failure" && dna && (
            <div>
              <p className="text-[13px] text-[#4E5968]">
                실패글 패턴 {dna.seedFailureCount}건 — 생성 후 동일 패턴 감지 시 FAIL
              </p>
              <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
                {(dna.seedFailureSamples || []).map((s) => (
                  <li key={s.id} className="rounded-lg border border-red-100 bg-red-50/50 p-3 text-[12px]">
                    <p className="font-semibold text-red-800">
                      {s.title} · {s.fail_reason}
                    </p>
                    <p className="mt-1 text-[#4E5968]">{s.content}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "dna" && dna && (
            <div className="max-h-[520px] space-y-3 overflow-y-auto text-[12px]">
              {Object.entries(dna.industryDna || {}).map(([key, item]) => (
                <div key={key} className="rounded-lg border border-[#E8EBED] p-3">
                  <p className="font-bold text-[#191F28]">
                    {item.label} ({key})
                  </p>
                  <p className="mt-1 text-[#4E5968]">{item.direction}</p>
                  <p className="mt-1 text-[#8B95A1]">
                    검색의도: {(item.searchIntents || []).slice(0, 5).join(", ")}
                  </p>
                  <p className="mt-1 text-[#8B95A1]">
                    금지: {(item.forbiddenWords || []).map((r) => r.source).join(" · ") || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === "forbidden" && dna && (
            <div className="space-y-4 text-[12px]">
              <div>
                <p className="font-semibold">전역 금칙어</p>
                <p className="mt-1 text-[#4E5968]">{(dna.forbiddenGlobal || []).join(" · ")}</p>
              </div>
              <div>
                <p className="font-semibold">AI 관용구</p>
                <p className="mt-1 text-[#4E5968]">{(dna.aiCliche || []).join(" · ")}</p>
              </div>
              <div>
                <p className="font-semibold">대표님 문체 DNA</p>
                <ul className="mt-1 list-disc pl-4 text-[#4E5968]">
                  {(dna.kimTaegyuVoice || []).map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">기본 문체 프로필</p>
                <pre className="mt-1 overflow-x-auto rounded bg-[#F7F8FA] p-2 text-[11px]">
                  {JSON.stringify(dna.styleProfile, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {tab === "scoring" && dna && (
            <div className="text-[12px]">
              <p className="font-semibold">100점 만점 가중치</p>
              <ul className="mt-2 space-y-1 text-[#4E5968]">
                {Object.entries(dna.scoreWeights || {}).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}점
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[#8B95A1]">
                90+ PASS · 80–89 수정 권장(Safe Edit) · 80 미만 FAIL(차단·재작성)
              </p>
              <p className="mt-2 text-[#8B95A1]">Safe Edit: 원문 보존 85% 이상 · 문단 단위 수정 only</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
