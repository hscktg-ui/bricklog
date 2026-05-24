"use client";

import { useCallback, useState } from "react";
import { runClickBlockerDiagnostics } from "@/lib/dev/clickBlockerDiagnostics";
import { isClickDebugEnabled } from "@/lib/dev/debugStateRegistry";

export default function ClickBlockerDebugPanel() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [lastClick, setLastClick] = useState(null);

  const run = useCallback(() => {
    const r = runClickBlockerDiagnostics();
    setReport(r);
    return r;
  }, []);

  const copyJson = useCallback(() => {
    const r = report || run();
    try {
      void navigator.clipboard.writeText(JSON.stringify(r, null, 2));
      alert("진단 JSON을 클립보드에 복사했습니다.");
    } catch {
      alert("복사 실패 — 콘솔의 Full report를 확인하세요.");
    }
  }, [report, run]);

  if (!isClickDebugEnabled()) return null;

  if (typeof window !== "undefined" && !window.__BRICLOG_CLICK_DEBUG_LISTENER__) {
    window.__BRICLOG_CLICK_DEBUG_LISTENER__ = true;
    document.addEventListener(
      "click",
      (e) => {
        console.log("CLICK TARGET:", e.target);
        console.log("PATH:", e.composedPath().slice(0, 15));
        if (window.__BRICLOG_DEBUG_CAPTURE_CLICK__) {
          const t = e.target;
          const s = t && t.nodeType === 1 ? getComputedStyle(t) : null;
          window.__BRICLOG_LAST_CLICK__ = {
            target: t?.tagName,
            className: String(t?.className || "").slice(0, 200),
            pointerEvents: s?.pointerEvents,
          };
        }
      },
      true
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) run();
        }}
        className="fixed bottom-4 left-4 z-[9999] rounded-full bg-[#191F28] px-3 py-2 text-[11px] font-bold text-white shadow-lg ring-2 ring-[#03C75A]"
        style={{ pointerEvents: "auto" }}
      >
        클릭 진단
      </button>

      {open ? (
        <div
          className="fixed bottom-14 left-4 z-[9999] flex max-h-[min(70dvh,520px)] w-[min(92vw,420px)] flex-col overflow-hidden rounded-xl border border-[#E8EBED] bg-white shadow-2xl"
          style={{ pointerEvents: "auto" }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#E8EBED] bg-[#F8FDF9] px-3 py-2">
            <p className="text-[12px] font-bold text-[#191F28]">클릭 차단 진단 (dev)</p>
            <button
              type="button"
              className="text-[11px] text-[#8B95A1]"
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-b border-[#E8EBED] p-2">
            <button
              type="button"
              onClick={run}
              className="rounded-lg bg-[#03C75A] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              진단 실행
            </button>
            <button
              type="button"
              onClick={copyJson}
              className="rounded-lg border border-[#E8EBED] px-2.5 py-1 text-[11px]"
            >
              JSON 복사
            </button>
            <button
              type="button"
              onClick={() => {
                window.__BRICLOG_DEBUG_CAPTURE_CLICK__ = true;
                alert("다음 클릭 1회를 기록합니다. 버튼을 눌러 보세요.");
              }}
              className="rounded-lg border border-[#E8EBED] px-2.5 py-1 text-[11px]"
            >
              다음 클릭 캡처
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[10px] leading-relaxed text-[#4E5968]">
            {report ? (
              <>
                <p className="font-semibold text-[#191F28]">중앙 hit</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#F7F8FA] p-2">
                  {JSON.stringify(report.centerElement, null, 2)}
                </pre>

                <p className="mt-3 font-semibold text-[#191F28]">React flags</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#F7F8FA] p-2">
                  {JSON.stringify(report.reactFlags, null, 2)}
                </pre>

                <p className="mt-3 font-semibold text-[#191F28]">Modals (DOM)</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#F7F8FA] p-2">
                  {JSON.stringify(report.modalsDom, null, 2)}
                </pre>

                <p className="mt-3 font-semibold text-[#E65100]">Primary suspect</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#FFF4E5] p-2">
                  {JSON.stringify(report.analysis?.primary, null, 2)}
                </pre>

                <p className="mt-3 font-semibold text-[#191F28]">
                  Blocking fixed layers ({report.analysis?.blockers?.length ?? 0})
                </p>
                <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-all rounded bg-[#F7F8FA] p-2">
                  {JSON.stringify(report.analysis?.blockers?.slice(0, 8), null, 2)}
                </pre>

                <p className="mt-3 font-semibold text-[#191F28]">opacity:0 + pe:auto</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#F7F8FA] p-2">
                  {JSON.stringify(report.invisibleOpacity0PointerAuto, null, 2)}
                </pre>

                {window.__BRICLOG_LAST_CLICK__ ? (
                  <>
                    <p className="mt-3 font-semibold text-[#191F28]">Last captured click</p>
                    <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#E8F9EF] p-2">
                      {JSON.stringify(window.__BRICLOG_LAST_CLICK__, null, 2)}
                    </pre>
                  </>
                ) : null}
              </>
            ) : (
              <p>「진단 실행」을 누르세요. 콘솔에도 전체 로그가 출력됩니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
