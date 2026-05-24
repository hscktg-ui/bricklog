/**
 * UI 인터랙션 안정성 테스트용 DOM 진단 (브라우저 컨텍스트에서 evaluate)
 */
export function collectUiInteractionDiagnostics(clickTarget = null) {
  const targetDesc = clickTarget
    ? describeEl(clickTarget)
    : null;

  const fixedOverlays = [];
  const pointerNoneEls = [];
  const highZ = [];

  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    const z = parseInt(s.zIndex, 10);
    if (s.pointerEvents === "none") {
      const r = el.getBoundingClientRect();
      if (r.width > 40 && r.height > 40) {
        pointerNoneEls.push(describeEl(el));
      }
    }
    if (Number.isFinite(z) && z >= 50) {
      highZ.push(describeEl(el));
    }
    if (s.position !== "fixed" && s.position !== "absolute") continue;
    const r = el.getBoundingClientRect();
    const cls = String(el.className || "");
    const covers =
      r.width >= window.innerWidth * 0.85 &&
      r.height >= window.innerHeight * 0.85;
    if (covers || cls.includes("inset-0")) {
      fixedOverlays.push({
        ...describeEl(el),
        coversViewport: covers,
        blocksClicks: s.pointerEvents !== "none" && parseFloat(s.opacity) > 0.05,
      });
    }
  }

  fixedOverlays.sort(
    (a, b) => (parseInt(b.zIndex, 10) || 0) - (parseInt(a.zIndex, 10) || 0)
  );
  highZ.sort(
    (a, b) => (parseInt(b.zIndex, 10) || 0) - (parseInt(a.zIndex, 10) || 0)
  );

  const cx = Math.floor(window.innerWidth / 2);
  const cy = Math.floor(window.innerHeight / 2);

  return {
    url: location.href,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    clickTarget: targetDesc,
    elementFromPointCenter: describeEl(document.elementFromPoint(cx, cy)),
    fixedOverlays: fixedOverlays.slice(0, 24),
    pointerEventsNoneLarge: pointerNoneEls.slice(0, 24),
    zIndex50Plus: highZ.slice(0, 32),
    blockingOverlays: fixedOverlays.filter(
      (o) => o.blocksClicks && o.coversViewport
    ),
  };
}

function describeEl(el) {
  if (!el || el.nodeType !== 1) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName,
    id: el.id || null,
    role: el.getAttribute("role"),
    className: String(el.className || "").slice(0, 200),
    position: s.position,
    zIndex: s.zIndex,
    pointerEvents: s.pointerEvents,
    opacity: s.opacity,
    cursor: s.cursor,
    rect: {
      w: Math.round(r.width),
      h: Math.round(r.height),
    },
  };
}
