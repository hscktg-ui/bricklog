"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import GoldenDatasetPanel from "@/components/admin/GoldenDatasetPanel";

const TABS = [
  { id: "excellent", label: "우수글 데이터셋" },
  { id: "failure", label: "실패글 데이터셋" },
  { id: "dna", label: "업종별 DNA" },
  { id: "questions", label: "고객 질문 DB" },
  { id: "philosophy", label: "브랜드 철학 DB" },
  { id: "forbidden", label: "금칙어·문체" },
  { id: "scoring", label: "품질 평가 기준" },
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
        <h2 className="text-[18px] font-bold text-[#191F28]">콘텐츠 품질 엔진 · 평가 우선</h2>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          글 생성기가 아닌 글 평가기 — 우수글·실패글·업종 DNA·고객 질문·브랜드 철학 SSOT
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

          {tab === "questions" && dna && (
            <div className="text-[12px]">
              <p className="font-semibold">6대 고객 질문 (CUSTOMER QUESTION ENGINE)</p>
              <ul className="mt-2 space-y-2 text-[#4E5968]">
                {[
                  "왜 찾는가",
                  "누가 찾는가",
                  "언제 찾는가",
                  "무엇을 비교하는가",
                  "가장 많이 하는 질문",
                  "구매 전 실수",
                ].map((q) => (
                  <li key={q} className="rounded-lg border border-[#E8EBED] px-3 py-2">
                    {q}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[#8B95A1]">
                생성 전 prepareBriclogPreWriteContext · customerQuestionMap에 로드됩니다.
              </p>
            </div>
          )}

          {tab === "philosophy" && dna && (
            <div className="text-[12px]">
              <p className="font-semibold">브랜드 철학 DB (해신 시드)</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[#4E5968]">
                {(dna.philosophy || []).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="mt-3 text-[#8B95A1]">
                브랜드별 철학은 brandWiki·brandMemory와 병합되어 STEP4에 주입됩니다.
              </p>
            </div>
          )}

          {tab === "scoring" && dna && (
            <div className="text-[12px]">
              <p className="font-semibold">100점 만점 — 콘텐츠 평가 엔진 (contentEvaluationEngine)</p>
              <ul className="mt-2 space-y-1 text-[#4E5968]">
                <li>검색 의도 충족: 20점</li>
                <li>업종 적합도: 20점</li>
                <li>브랜드 반영: 15점</li>
                <li>정보 밀도: 15점</li>
                <li>사람 문체: 10점</li>
                <li>반복 제거: 10점</li>
                <li>Placeholder 제거: 10점</li>
              </ul>
              <p className="mt-4 text-[#8B95A1]">
                90+ PASS · 90 미만 출력 금지 · 재검수는 문단 단위 Safe Edit (원문 85%+)
              </p>
              <p className="mt-2 text-[#8B95A1]">
                벤치마크 코퍼스 없는 업종: 해신 DNA·구조 휴리스틱 94% (적응형)
              </p>
              <p className="mt-2 text-[#8B95A1]">코퍼스 있는 업종: DNA 82% + 벤치마크 유사도 18%</p>
              <p className="mt-2 text-[#8B95A1]">Safe Edit: 원문 보존 · 문단 단위 수정</p>
              <p className="mt-3 font-semibold text-[#191F28]">LLM 원고 송출 마감</p>
              <p className="mt-1 text-[#8B95A1]">
                LLM 생성 원고는 템플릿 치환 없이 말투 통일(습니다체) → DNA·조사 앵커 보강 →
                Safe Edit 순으로 마감합니다.
              </p>
              <p className="mt-1 text-[#8B95A1]">
                해신 86+ · 골든 적응 통과 시 길이 tier·SQV 제한을 완화해 송출 가능
                (llmAdaptivePublish)
              </p>
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
