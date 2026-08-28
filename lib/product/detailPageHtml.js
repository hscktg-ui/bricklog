/**
 * 브릭로그 상세 HTML — 860px, 섹션별 레이아웃 (카드·표·인용)
 * 스마트스토어 붙여넣기용: 인라인 + table. position:absolute 없음.
 */
import {
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_DEFAULT_ACCENT,
  DETAIL_PAGE_TYPE as BASE,
} from "@/lib/product/detailPageCatalog";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { assignDetailPagePhotos, getDetailPagePhotoDirection } from "@/lib/product/detailPagePhotos";
import { resolveDetailPageMall } from "@/lib/product/detailPageCompeteWins";
import {
  makeDetailPageTypeBox,
  resolveDetailPageTypePairing,
  typePairingImportCss,
} from "@/lib/product/detailPageTypePairing";

let T = { ...BASE };

function applyType(pack) {
  const pairing = resolveDetailPageTypePairing(pack);
  T = makeDetailPageTypeBox(pairing);
  return pairing;
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitParas(text) {
  return String(text || "")
    .split(/(?<=다\.|요\.|니다\.|까\?)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function paras(text, color = T.ink) {
  return splitParas(text)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:${T.body}px;line-height:${T.bodyLh};color:${color};font-weight:400;word-break:keep-all;letter-spacing:-0.01em;font-family:${T.familyBody};">${esc(p)}</p>`
    )
    .join("");
}

function highlightBar(highlights, accent) {
  const items = (highlights || []).map(cleanHighlight).filter(Boolean).slice(0, 6);
  if (!items.length) return "";
  const chips = items
    .map(
      (h) =>
        `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid ${accent};border-radius:999px;font-size:14px;line-height:1.4;letter-spacing:-0.02em;color:${T.ink};background:${T.paper};font-family:${T.familyKicker};">${esc(h)}</span>`
    )
    .join("");
  return `<div data-highlights="${items.length}" style="display:flex;flex-wrap:wrap;padding:18px ${T.padX}px 6px;background:${T.wash};border-bottom:1px solid ${T.rule};">${chips}</div>`;
}

function cleanHighlight(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function kickerHtml(text, color) {
  if (!text) return "";
  return `<p data-role="kicker" style="margin:0 0 10px;font-size:${T.kicker}px;line-height:1.4;letter-spacing:0.16em;color:${color};font-weight:600;font-family:${T.familyKicker};">${esc(text)}</p>`;
}

function h2Html(text, color = T.ink) {
  if (!text) return "";
  return `<h2 style="margin:0 0 18px;font-size:${T.h2}px;line-height:${T.titleLh};letter-spacing:${T.titleTrack};color:${color};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(text)}</h2>`;
}

function imgFrame(src, alt, height, slot, caption, capColor = T.muted) {
  const dir = getDetailPagePhotoDirection(slot);
  const h = Number(height || dir.height) || 440;
  const cap = caption
    ? `<p style="margin:10px ${T.padX}px 0;font-size:13px;line-height:1.55;color:${capColor};letter-spacing:-0.01em;word-break:keep-all;">${esc(caption)}</p>`
    : "";
  const attrs = `data-photo-slot="${esc(slot || "")}" data-photo-direction="${esc(slot || "")}" data-photo-shot="${esc(dir.shot || "")}"`;
  if (!src) {
    return `<table ${attrs} data-photo-empty="1" style="width:100%;border-collapse:collapse;background:${T.wash};"><tr><td style="height:${h}px;vertical-align:middle;text-align:center;border-bottom:1px solid ${T.rule};"><p style="margin:0;font-size:11px;letter-spacing:0.18em;color:${T.muted};font-family:${T.familyKicker};">${esc(dir.plate || "")}</p></td></tr></table>${cap}`;
  }
  return `<div ${attrs} style="width:100%;overflow:hidden;background:${T.wash};">
    <img src="${esc(src)}" alt="${esc(alt)}" style="display:block;width:100%;height:${h}px;object-fit:cover;object-position:center;" />
  </div>${cap}`;
}

function galleryHtml(images, productName, captions = {}) {
  const photos = (images || []).filter(Boolean);
  if (!photos.length) return "";
  if (photos.length === 1) {
    return imgFrame(photos[0], productName, 440, "gallery", captions[photos[0]]);
  }
  const h = photos.length >= 3 ? 300 : 380;
  const cells = photos
    .map(
      (src, i) =>
        `<td style="width:${Math.floor(100 / photos.length)}%;vertical-align:top;padding:0;">${imgFrame(src, `${productName} ${i + 1}`, h, `gallery-${i}`, captions[src])}</td>`
    )
    .join("");
  return `<section data-photo-gallery="1" style="background:${T.paper};"><table style="width:100%;border-collapse:collapse;"><tr>${cells}</tr></table></section>`;
}

function padBox() {
  return `padding:${T.padY}px ${T.padX}px`;
}

function uspCards(bullets, accent) {
  const items = (bullets || []).filter(Boolean);
  if (!items.length) return "";
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    const cells = pair
      .map((b, j) => {
        const n = String(i + j + 1).padStart(2, "0");
        const colspan = pair.length === 1 ? ` colspan="2"` : "";
        return `<td${colspan} style="width:${pair.length === 1 ? "100%" : "50%"};vertical-align:top;padding:22px 20px;background:${T.wash};border:1px solid ${T.rule};">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.14em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${n}</p>
          <p style="margin:0;font-size:${T.body}px;line-height:1.7;color:${T.ink};word-break:keep-all;letter-spacing:-0.01em;font-family:${T.familyBody};">${esc(b)}</p>
        </td>`;
      })
      .join("");
    rows.push(`<tr>${cells}</tr>`);
  }
  return `<table data-layout="usp-cards" style="width:100%;border-collapse:separate;border-spacing:8px;margin:4px -8px 0;"><tbody>${rows.join("")}</tbody></table>`;
}

function specSheet(rows, accent) {
  const list = (rows || []).filter((r) => Array.isArray(r) && r[0] && r[1]);
  if (!list.length) return "";
  const body = list
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 ? T.paper : T.wash};"><th style="width:32%;text-align:left;padding:14px 16px;border-bottom:1px solid ${T.rule};color:${T.muted};font-weight:500;border-left:3px solid ${i === 0 ? accent : "transparent"};">${esc(r[0])}</th><td style="padding:14px 16px;border-bottom:1px solid ${T.rule};color:${T.ink};font-weight:400;">${esc(r[1])}</td></tr>`
    )
    .join("");
  return `<table data-layout="spec-sheet" style="width:100%;border-collapse:collapse;font-size:${T.spec}px;line-height:1.6;margin-top:8px;border:1px solid ${T.rule};font-family:${T.familySpec};">${body}</table>`;
}

function featureList(bullets, accent) {
  const items = (bullets || []).filter(Boolean);
  if (!items.length) return "";
  return `<table data-layout="feature-list" style="width:100%;border-collapse:separate;border-spacing:0 10px;margin-top:8px;">${items
    .map((b, i) => {
      const n = String(i + 1).padStart(2, "0");
      return `<tr><td style="width:48px;vertical-align:top;padding:4px 12px 4px 0;font-size:13px;letter-spacing:0.12em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${n}</td><td style="vertical-align:top;padding:2px 0;font-size:${T.body}px;line-height:1.75;color:${T.ink};word-break:keep-all;letter-spacing:-0.01em;font-family:${T.familyBody};">${esc(b)}</td></tr>`;
    })
    .join("")}</table>`;
}

function wrapSection({ type, layout, bg, extra = "", photo, inner }) {
  return `<section data-section="${esc(type)}" data-layout="${esc(layout)}" style="padding:0;background:${bg};border-bottom:1px solid ${T.rule};">
    ${photo || ""}
    <div style="${padBox()}${extra}">
      ${inner}
    </div>
  </section>`;
}

function renderSection(section, photoSrc, accent, productName, caption) {
  const type = section.type;
  const dir = getDetailPagePhotoDirection(type);
  const photoH = dir.height || (type === "scene" ? 520 : type === "feature" ? 480 : 440);
  const photoWell = type === "hero" || type === "observe" || type === "feature";
  const photo =
    photoSrc || photoWell
      ? imgFrame(photoSrc, section.title || productName, photoH, type, caption)
      : "";

  if (type === "hero") {
    return `<section data-section="hero" data-layout="hero-stack" style="background:${T.heroBg};color:${T.heroFg};">
      ${imgFrame(photoSrc, productName, 680, "hero", caption, "rgba(247,244,239,0.72)")}
      <div style="${padBox()};border-top:3px solid ${accent};">
        ${kickerHtml(section.kicker, "rgba(247,244,239,0.62)")}
        <h1 style="margin:0 0 16px;font-size:${T.h1}px;line-height:1.28;letter-spacing:${T.h1Track};font-weight:650;word-break:keep-all;color:${T.heroFg};font-family:${T.familyDisplay};">${esc(section.title)}</h1>
        ${paras(section.body, "rgba(247,244,239,0.88)")}
      </div>
    </section>`;
  }

  if (type === "cta") {
    return wrapSection({
      type,
      layout: "cta-bar",
      bg: T.wash,
      extra: `;border-left:6px solid ${accent}`,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body, T.ink)}`,
    });
  }

  if (type === "usp") {
    return wrapSection({
      type,
      layout: "usp-cards",
      bg: T.paper,
      photo,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body)}${uspCards(section.bullets, accent)}`,
    });
  }

  if (type === "spec") {
    return wrapSection({
      type,
      layout: "spec-sheet",
      bg: T.wash,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body)}${specSheet(section.rows, accent)}`,
    });
  }

  if (type === "observe") {
    return wrapSection({
      type,
      layout: "observe-quote",
      bg: T.wash,
      photo,
      extra: `;border-left:4px solid ${accent}`,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body)}${featureList(section.bullets, accent)}`,
    });
  }

  if (type === "intent" || type === "problem") {
    return wrapSection({
      type,
      layout: "intent-wash",
      bg: T.wash,
      photo,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body)}${featureList(section.bullets, accent)}`,
    });
  }

  if (type === "feature" || type === "scene") {
    return wrapSection({
      type,
      layout: type === "scene" ? "scene-bleed" : "feature-list",
      bg: T.paper,
      photo,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body)}${featureList(section.bullets, accent)}`,
    });
  }

  if (type === "brand" || type === "notice") {
    return wrapSection({
      type,
      layout: type === "notice" ? "notice-quiet" : "brand-quiet",
      bg: type === "notice" ? T.wash : T.paper,
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${paras(section.body, T.ink)}${featureList(section.bullets, accent)}`,
    });
  }

  return wrapSection({
    type,
    layout: "copy-block",
    bg: T.paper,
    photo,
    inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${paras(section.body)}${featureList(section.bullets, accent)}${specSheet(section.rows, accent)}`,
  });
}

export function renderDetailPageBodyHtml(pack, images = []) {
  const pairing = applyType(pack);
  const accent = pack.accent || DETAIL_PAGE_DEFAULT_ACCENT;
  const productName = pack.productName || pack.headline || "상품";
  const assigned = assignDetailPagePhotos(pack.sections, images);
  const parts = [];
  let heroDone = false;
  for (const section of pack.sections || []) {
    if (section.type === "cta" && assigned.leftovers.length) {
      parts.push(galleryHtml(assigned.leftovers, productName, assigned.captions));
    }
    const src = assigned.byType[section.type] || "";
    parts.push(
      renderSection(section, src, accent, productName, assigned.captions[src] || "")
    );
    if (!heroDone && section.type === "hero") {
      parts.push(highlightBar(pack.highlights, accent));
      heroDone = true;
    }
  }
  const score = pack._meta?.sqv?.score ?? "";
  const fontFace = `<style>${typePairingImportCss(pairing)}#gollaboda-detail-page{font-family:${T.familyBody};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}</style>`;
  return `${fontFace}<article id="gollaboda-detail-page" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" data-type="${esc(pairing.id)}" data-fonts="${esc(`${pairing.displayKo}+${pairing.displayEn}`)}" data-grade="${esc(String(score))}" data-photos="${assigned.placed}" data-ui="section-layouts" data-visual="first-glance" data-mall-ready="smartstore,coupang" style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:${T.paper};color:${T.ink};font-family:${T.familyBody};">${parts.join("")}</article>`;
}

export function wrapMallHtml(bodyHtml, pack = {}, mallId = "smartstore") {
  const mall = resolveDetailPageMall(mallId);
  const pairing = applyType(pack);
  const links = pairing.hrefs
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${DETAIL_PAGE_PRODUCT.name}</title>${links}</head><body data-mall="${esc(mall.id)}" data-mall-width="${esc(String(mall.width))}" style="margin:0;background:${T.wash};font-family:${T.familyBody};">${bodyHtml}</body></html>`;
}

export function wrapSmartstoreHtml(bodyHtml, pack = {}) {
  return wrapMallHtml(bodyHtml, pack, "smartstore");
}

export function packToPlainText(pack) {
  const lines = [pack.headline, pack.subhead, ""];
  for (const s of pack.sections || []) {
    if (s.kicker) lines.push(`[${s.kicker}]`);
    if (s.title) lines.push(s.title);
    if (s.body) lines.push(s.body);
    for (const b of s.bullets || []) lines.push(`- ${b}`);
    for (const r of s.rows || []) lines.push(`${r[0]}: ${r[1]}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
