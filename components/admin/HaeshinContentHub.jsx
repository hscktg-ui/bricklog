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
  const [newForbidden, setNewForbidden] = useState("");
  const [savingForbidden, setSavingForbidden] = useState(false);

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

  const onAddForbidden = async () => {
    const phrase = newForbidden.trim();
    if (!phrase) return;
    setSavingForbidden(true);
    try {
      const res = await fetchWithAuth("/api/admin/haeshin-dna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addForbidden: [phrase] }),
      });
      setDna((prev) => ({
        ...(prev || {}),
        forbiddenGlobal: res.forbiddenGlobal,
        overrides: res.overrides,
      }));
      setNewForbidden("");
      showToast?.("금칙어가 추가되었습니다. 다음 생성부터 반영됩니다.", "success");
    } catch (err) {
      showToast?.(err?.message || "저장 실패", "error");
    } finally {
      setSavingForbidden(false);
    }
  };

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-[18px] font-bold text-[#191F28]">해신기획 콘텐츠 DNA · 적응형 품질 엔진</h2>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          업종 DNA·조사·LLM이 기본 — 우수글 코퍼스는 있으면 참고 보강 (없어도 생성 가능)
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

      {tab === "excellent" && (
        <GoldenDatasetPanel showToast={showToast} embedded sampleKind="excellent" />
      )}

      {tab === "failure" && (
        <div className="space-y-4">
          <GoldenDatasetPanel showToast={showToast} embedded sampleKind="failure" />
          {dna && (
            <div className="rounded-xl border border-red-100 bg-red-50/30 p-4">
              <p className="text-[12px] font-semibold text-red-800">
                코드 시드 실패글 {dna.seedFailureCount}건 (기본 패턴)
              </p>
              <ul className="mt-2 max-h-[200px] space-y-1 overflow-y-auto text-[11px] text-[#4E5968]">
                {(dna.seedFailureSamples || []).map((s) => (
                  <li key={s.id}>
                    {s.title} · {s.fail_reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab !== "excellent" && tab !== "failure" && (
        <div className="rounded-xl border border-[#E8EBED] bg-white p-5">
          {loading && <p className="text-[13px] text-[#8B95A1]">불러오는 중…</p>}

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
              <div className="rounded-lg border border-[#E8EBED] bg-[#F7F8FA] p-3">
                <p className="font-semibold">운영 금칙어 추가</p>
                <p className="mt-1 text-[#8B95A1]">
                  배포 없이 config/haeshin-dna-overrides.json에 저장 · 서버 생성에 즉시 반영
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
                    placeholder="추가할 금칙어"
                    value={newForbidden}
                    onChange={(e) => setNewForbidden(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={savingForbidden}
                    onClick={onAddForbidden}
                    className="rounded-lg bg-[#03A94D] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
                {dna.overrides?.forbiddenGlobal?.length > 0 && (
                  <p className="mt-2 text-[#4E5968]">
                    운영 추가: {dna.overrides.forbiddenGlobal.join(" · ")}
                  </p>
                )}
              </div>
              <div>
                <p className="font-semibold">전역 금칙어 (시드+운영)</p>
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
                90+ PASS · 80–89 Safe Edit · 80 미만 FAIL
              </p>
              <p className="mt-2 text-[#8B95A1]">
                벤치마크 코퍼스 없는 업종: 해신 DNA·구조 휴리스틱 94% (적응형)
              </p>
              <p className="mt-2 text-[#8B95A1]">코퍼스 있는 업종: DNA 82% + 벤치마크 유사도 18%</p>
              <p className="mt-2 text-[#8B95A1]">Safe Edit: 원문 보존 · 문단 단위 수정</p>
              <p className="mt-2 text-[#8B95A1]">
                실패글 등록 시 동일 패턴 감지 → FAIL
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
