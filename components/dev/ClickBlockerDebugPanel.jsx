"use client";

import { useCallback, useEffect, useState } from "react";
import { useContentPipelineState } from "@/context/ContentContext";
import { runClickBlockerDiagnostics } from "@/lib/dev/clickBlockerDiagnostics";
import { isClickDebugEnabled } from "@/lib/dev/debugStateRegistry";
import { GENERATION_ACTIVE_EVENT } from "@/lib/generation/generationSession";

function describeClickTarget(target) {
  const t = target;
  if (!t || t.nodeType !== 1) return null;
  const s = getComputedStyle(t);
  const r = t.getBoundingClientRect();
  return {
    target: t.tagName,
    id: t.id || null,
    className: String(t.className || "").slice(0, 200),
    pointerEvents: s.pointerEvents,
    text: (t.textContent || "").trim().slice(0, 80) || null,
    rect: {
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
    },
  };
}

export default function ClickBlockerDebugPanel() {
  const { generating, loadingOverlay } = useContentPipelineState();
  const [generationSessionActive, setGenerationSessionActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [lastClick, setLastClick] = useState(null);
  const [captureArmed, setCaptureArmed] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const run = useCallback(() => {
    const r = runClickBlockerDiagnostics();
    setReport(r);
    return r;
  }, []);

  const armCapture = useCallback(() => {
    setCaptureArmed(true);
    setLastClick(null);
    window.__BRICLOG_DEBUG_CAPTURE_CLICK__ = true;
    window.__BRICLOG_LAST_CLICK__ = null;
  }, []);

  const copyJson = useCallback(() => {
    const r = report || run();
    try {
      void navigator.clipboard.writeText(JSON.stringify(r, null, 2));
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  }, [report, run]);

  useEffect(() => {
    if (!isClickDebugEnabled()) return undefined;

    const onCaptured = (e) => {
      setLastClick(e.detail || window.__BRICLOG_LAST_CLICK__ || null);
      setCaptureArmed(false);
    };

    window.addEventListener("briclog-click-captured", onCaptured);
    return () => window.removeEventListener("briclog-click-captured", onCaptured);
  }, []);

  useEffect(() => {
    if (!isClickDebugEnabled()) return undefined;
    const onSession = (e) => {
      setGenerationSessionActive(Boolean(e.detail?.active));
    };
    window.addEventListener(GENERATION_ACTIVE_EVENT, onSession);
    return () => window.removeEventListener(GENERATION_ACTIVE_EVENT, onSession);
  }, []);

  const hideDuringGeneration =
    generationSessionActive ||
    Boolean(loadingOverlay?.active) ||
    Boolean(
      generating?.blog ||
        generating?.place ||
        generating?.instagram ||
        generating?.image
    );

  useEffect(() => {
    if (!hideDuringGeneration || !open) return;
    setOpen(false);
    setCaptureArmed(false);
    window.__BRICLOG_DEBUG_CAPTURE_CLICK__ = false;
  }, [hideDuringGeneration, open]);

  useEffect(() => {
    if (!isClickDebugEnabled()) return undefined;
    if (window.__BRICLOG_CLICK_DEBUG_LISTENER__) return undefined;

    window.__BRICLOG_CLICK_DEBUG_LISTENER__ = true;
    const onClick = (e) => {
      console.log("CLICK TARGET:", e.target);
      console.log("PATH:", e.composedPath().slice(0, 15));
      if (!window.__BRICLOG_DEBUG_CAPTURE_CLICK__) return;

      const payload = describeClickTarget(e.target);
      window.__BRICLOG_DEBUG_CAPTURE_CLICK__ = false;
      window.__BRICLOG_LAST_CLICK__ = payload;
      window.dispatchEvent(
        new CustomEvent("briclog-click-captured", { detail: payload })
      );
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!isClickDebugEnabled() || hideDuringGeneration) return null;

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

          <div className="shrink-0 border-b border-[#E8EBED] bg-[#FAFBFC] px-3 py-2 text-[10px] leading-relaxed text-[#6B7684]">
            <strong className="text-[#191F28]">진단 실행</strong>은 지금 화면을
            스캔합니다.{" "}
            <strong className="text-[#191F28]">막히는 버튼 1회</strong>는 그다음
            누르는 클릭만 기록합니다(앞에서 기다려도 됨, 확인 창은 누르지 마세요).
          </div>

          {captureArmed ? (
            <div className="shrink-0 border-b border-[#03C75A]/40 bg-[#F0FFF5] px-3 py-2 text-[11px] font-medium text-[#03A94D]">
              대기 중 — 문제가 되는 버튼·메뉴를 화면에서 한 번 눌러 주세요.
            </div>
          ) : null}

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
              {copyDone ? "복사됨" : "JSON 복사"}
            </button>
            <button
              type="button"
              onClick={armCapture}
              disabled={captureArmed}
              className="rounded-lg border border-[#E8EBED] px-2.5 py-1 text-[11px] disabled:opacity-50"
            >
              {captureArmed ? "캡처 대기…" : "막히는 버튼 1회"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[10px] leading-relaxed text-[#4E5968]">
            {lastClick ? (
              <>
                <p className="font-semibold text-[#191F28]">캡처된 클릭 (1회)</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[#E8F9EF] p-2">
                  {JSON.stringify(lastClick, null, 2)}
                </pre>
              </>
            ) : null}

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

              </>
            ) : (
              <p>「진단 실행」으로 현재 화면을 스캔하세요. 콘솔에도 전체 로그가 출력됩니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
