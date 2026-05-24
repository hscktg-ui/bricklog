/**
 * 로그인 후 클릭 차단 DOM 진단 (브라우저 전용)
 */

import { getDebugState } from "./debugStateRegistry";

function describeElement(el) {
  if (!el || el.nodeType !== 1) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName,
    id: el.id || null,
    role: el.getAttribute("role"),
    className: String(el.className || "").slice(0, 240),
    position: s.position,
    zIndex: s.zIndex,
    pointerEvents: s.pointerEvents,
    opacity: s.opacity,
    visibility: s.visibility,
    display: s.display,
    rect: {
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
    },
  };
}

function probeAt(x, y, name) {
  const px = Math.round(x);
  const py = Math.round(y);
  const top = document.elementFromPoint(px, py);
  return {
    name,
    coords: { x: px, y: py },
    top: describeElement(top),
    path: document.elementsFromPoint(px, py).slice(0, 16).map(describeElement),
  };
}

function findByText(text, root = document) {
  const nodes = root.querySelectorAll("button, a, [role='menuitem']");
  for (const el of nodes) {
    if ((el.textContent || "").includes(text)) return el;
  }
  return null;
}

function listFixedAbsoluteInset() {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    const cls = String(el.className || "");
    if (s.position !== "fixed" && s.position !== "absolute") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const insetLike =
      cls.includes("inset-0") ||
      cls.includes("inset-x-0") ||
      (r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9);
    if (!insetLike && r.width < window.innerWidth * 0.5) continue;
    out.push({
      ...describeElement(el),
      insetLike,
      blocksClicks: s.pointerEvents !== "none" && parseFloat(s.opacity) > 0.05,
    });
  }
  return out.sort((a, b) => (parseInt(b.zIndex, 10) || 0) - (parseInt(a.zIndex, 10) || 0));
}

function listHighZ(minZ = 30) {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    const z = parseInt(s.zIndex, 10);
    if (!Number.isFinite(z) || z < minZ) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) continue;
    if (s.display === "none" || s.visibility === "hidden") continue;
    out.push({ zIndex: z, ...describeElement(el) });
  }
  return out.sort((a, b) => b.zIndex - a.zIndex);
}

function listPointerEventsAuto() {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.pointerEvents !== "auto") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (s.display === "none" || s.visibility === "hidden") continue;
    const z = parseInt(s.zIndex, 10);
    if (Number.isFinite(z) && z >= 30) {
      out.push(describeElement(el));
    } else if (r.width >= window.innerWidth * 0.85 && r.height >= window.innerHeight * 0.85) {
      out.push(describeElement(el));
    }
  }
  return out.slice(0, 80);
}

function listInvisibleButClickable() {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.pointerEvents === "none") continue;
    const op = parseFloat(s.opacity);
    if (!Number.isFinite(op) || op > 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < window.innerWidth * 0.5 || r.height < window.innerHeight * 0.5) continue;
    out.push(describeElement(el));
  }
  return out;
}

function detectModalsInDom() {
  const termsEl = document.getElementById("terms-consent-title")?.closest('[role="dialog"]')
    || document.querySelector('[aria-labelledby="terms-consent-title"]');
  const pricingEl = document.getElementById("pricing-modal-title")?.closest('[role="dialog"]');
  const confirmEl = document.querySelector('[role="alertdialog"]');
  const profileEl = document.getElementById("profile-complete-title")?.closest('[role="dialog"]');
  const genOverlay = [...document.querySelectorAll("*")].find((el) => {
    const s = getComputedStyle(el);
    const z = parseInt(s.zIndex, 10);
    return s.position === "fixed" && Number.isFinite(z) && z >= 200;
  });

  const sidebarBackdrop = document.querySelector(
    'button.fixed.inset-0.z-40[aria-label="메뉴 닫기"]'
  );

  function modalReport(el, label) {
    if (!el) return { rendered: false, label };
    const root = el.closest(".fixed") || el;
    return {
      rendered: true,
      label,
      root: describeElement(root),
      dialog: describeElement(el),
    };
  }

  return {
    termsConsentModal: modalReport(termsEl, "TermsConsentModal"),
    pricingModal: modalReport(pricingEl, "PricingModal"),
    confirmModal: modalReport(confirmEl, "ConfirmModal"),
    profileCompletionModal: modalReport(profileEl, "ProfileCompletionModal"),
    generationLoadingOverlay: genOverlay
      ? { rendered: true, root: describeElement(genOverlay) }
      : { rendered: false },
    sidebarMobileBackdrop: sidebarBackdrop
      ? { rendered: true, element: describeElement(sidebarBackdrop) }
      : { rendered: false },
  };
}

function chainPointerEvents() {
  const chain = ["html", "body", "#__next", "main", '[data-workspace-preview]'];
  const report = {};
  for (const sel of chain) {
    const el = sel.startsWith("#") || sel.startsWith("[")
      ? document.querySelector(sel)
      : document.querySelector(sel);
    if (!el) {
      report[sel] = null;
      continue;
    }
    const s = getComputedStyle(el);
    report[sel] = { pointerEvents: s.pointerEvents, display: s.display, position: s.position };
  }
  return report;
}

function probeElement(el, name) {
  if (!el) return { name, found: false };
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) {
    return { name, found: true, visible: false, element: describeElement(el) };
  }
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return {
    name,
    found: true,
    visible: true,
    element: describeElement(el),
    hit: probeAt(cx, cy, `${name}_hit`),
  };
}

function defaultButtonProbes() {
  const aside = document.querySelector("aside");
  return [
    probeElement(findByText("로그아웃", aside || document), "sidebar_logout"),
    probeElement(
      document.querySelector('button[aria-label*="계정 메뉴"]'),
      "header_profile_menu"
    ),
    probeElement(findByText("로그아웃"), "logout_any"),
    probeElement(findByText("브랜드 추가"), "brand_add"),
    probeElement(findByText("이야기 쓰기"), "generate_blog"),
    probeElement(findByText("플레이스"), "menu_place"),
    probeElement(findByText("인스타"), "menu_insta"),
    probeElement(
      aside?.querySelector("button") || findByText("이야기"),
      "sidebar_first_menu"
    ),
    probeElement(
      document.querySelector('[class*="mobile"] button, nav button'),
      "mobile_nav_first"
    ),
  ];
}

function findLikelyBlockers(probes, fixedList) {
  const blockers = fixedList.filter((f) => f.blocksClicks && f.insetLike);
  const primary =
    probes.find((p) => p.top?.position === "fixed" && p.top?.pointerEvents === "auto") ||
    blockers[0] ||
    null;
  return { primary, blockers, probeHits: probes };
}

/**
 * @returns {object} full diagnostic report
 */
export function runClickBlockerDiagnostics() {
  const reactState = getDebugState();
  const w = window.innerWidth;
  const h = window.innerHeight;

  const center = probeAt(w / 2, h / 2, "viewport_center");
  const sidebar = probeAt(120, Math.min(300, h - 100), "sidebar_120_300");
  const main = probeAt(w * 0.55, h * 0.45, "main_workspace");
  const header = probeAt(w - 80, 40, "header_right");

  const buttonProbes = defaultButtonProbes();
  const fixedAbsoluteInset = listFixedAbsoluteInset();
  const zIndex30Plus = listHighZ(30);
  const pointerEventsAuto = listPointerEventsAuto();
  const invisibleClickable = listInvisibleButClickable();
  const modalsDom = detectModalsInDom();
  const pointerChain = chainPointerEvents();

  const analysis = findLikelyBlockers(
    [center, sidebar, main, header, ...buttonProbes.filter((p) => p.top)],
    fixedAbsoluteInset
  );

  const report = {
    ranAt: new Date().toISOString(),
    url: location.href,
    viewport: { w, h },
    reactState,
    centerElement: center.top,
    elementFromPointCenter: center,
    probes: { center, sidebar, main, header, buttons: buttonProbes },
    fixedAbsoluteInset,
    zIndex30Plus,
    pointerEventsAuto,
    invisibleOpacity0PointerAuto: invisibleClickable,
    modalsDom,
    reactFlags: {
      termsConsentModal: reactState.page?.needsTerms ?? reactState.needsTerms,
      pricingModalOpen: reactState.dashboard?.pricingOpen,
      confirmChannelPicker: reactState.dashboard?.confirmChannelPicker,
      confirmFreshStart: reactState.dashboard?.confirmFreshStart,
      generationLoadingOverlayActive:
        reactState.dashboard?.loadingOverlayBlocking ??
        reactState.content?.loadingOverlay?.active,
      sidebarMobileOpen: reactState.dashboard?.mobileOpen,
      welcomeOpen: reactState.dashboard?.welcomeOpen,
      showChannelWelcome: reactState.dashboard?.showChannelWelcome,
      profileLoading: reactState.page?.profileLoading,
      authLoading: reactState.page?.loading,
    },
    pointerEventsChain: pointerChain,
    analysis,
  };

  console.group("[BRICLOG] Click blocker diagnostics");
  console.log("CENTER ELEMENT:", center.top);
  console.log("React flags:", report.reactFlags);
  console.log("Modals in DOM:", modalsDom);
  console.log("Primary suspect:", analysis.primary);
  console.log("Full report:", report);
  console.groupEnd();

  return report;
}
