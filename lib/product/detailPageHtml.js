/**
 * BRICLOG 상세 HTML — 860px, 95점 글꼴·간격, 사진 슬롯
 */
import {
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_DEFAULT_ACCENT,
  DETAIL_PAGE_TYPE as T,
} from "@/lib/product/detailPageCatalog";
import { assignDetailPagePhotos } from "@/lib/product/detailPagePhotos";

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
        `<p style="margin:0 0 16px;font-size:${T.body}px;line-height:${T.bodyLh};color:${color};font-weight:400;word-break:keep-all;letter-spacing:-0.01em;">${esc(p)}</p>`
    )
    .join("");
}

function kickerHtml(text, color) {
  if (!text) return "";
  return `<p style="margin:0 0 10px;font-size:${T.kicker}px;line-height:1.4;letter-spacing:0.16em;color:${color};font-weight:600;">${esc(text)}</p>`;
}

function h2Html(text, color = T.ink) {
  if (!text) return "";
  return `<h2 style="margin:0 0 18px;font-size:${T.h2}px;line-height:${T.titleLh};letter-spacing:-0.035em;color:${color};font-weight:650;word-break:keep-all;">${esc(text)}</h2>`;
}

function imgFrame(src, alt, height, slot) {
  if (!src) return "";
  const h = Number(height) || 480;
  return `<div data-photo-slot="${esc(slot || "")}" style="width:100%;height:${h}px;overflow:hidden;background:${T.rule};">
    <img src="${esc(src)}" alt="${esc(alt)}" style="display:block;width:100%;height:${h}px;object-fit:cover;object-position:center;" />
  </div>`;
}

function galleryHtml(images, productName) {
  const photos = (images || []).filter(Boolean);
  if (!photos.length) return "";
  if (photos.length === 1) {
    return imgFrame(photos[0], productName, 440, "gallery");
  }
  const h = photos.length >= 3 ? 300 : 380;
  const cells = photos
    .map(
      (src, i) =>
        `<div style="flex:1;min-width:0;">${imgFrame(src, `${productName} ${i + 1}`, h, `gallery-${i}`)}</div>`
    )
    .join("");
  return `<section data-photo-gallery="1" style="display:flex;gap:2px;background:${T.paper};">${cells}</section>`;
}

function padBox() {
  return `padding:${T.padY}px ${T.padX}px`;
}

function renderSection(section, photoSrc, accent, productName) {
  const bullets = (section.bullets || []).length
    ? `<ul style="margin:8px 0 0;padding:0;list-style:none;">${section.bullets
        .map(
          (b) =>
            `<li style="margin:0 0 14px;padding:0 0 0 18px;border-left:2px solid ${accent};font-size:${T.body}px;line-height:1.75;color:${T.ink};word-break:keep-all;letter-spacing:-0.01em;">${esc(b)}</li>`
        )
        .join("")}</ul>`
    : "";
  const rows = (section.rows || []).length
    ? `<table style="width:100%;border-collapse:collapse;font-size:${T.spec}px;line-height:1.6;margin-top:8px;">${section.rows
        .map(
          (r) =>
            `<tr><th style="width:30%;text-align:left;padding:12px 0;border-bottom:1px solid ${T.rule};color:${T.muted};font-weight:500;">${esc(r[0])}</th><td style="padding:12px 0;border-bottom:1px solid ${T.rule};color:${T.ink};font-weight:400;">${esc(r[1])}</td></tr>`
        )
        .join("")}</table>`
    : "";

  if (section.type === "hero") {
    return `<section data-section="hero" style="background:${T.heroBg};color:${T.heroFg};">
      ${imgFrame(photoSrc, productName, 540, "hero")}
      <div style="${padBox()}">
        ${kickerHtml(section.kicker, "rgba(247,244,239,0.62)")}
        <h1 style="margin:0 0 16px;font-size:${T.h1}px;line-height:1.28;letter-spacing:-0.04em;font-weight:650;word-break:keep-all;color:${T.heroFg};">${esc(section.title)}</h1>
        ${paras(section.body, "rgba(247,244,239,0.88)")}
      </div>
    </section>`;
  }

  if (section.type === "cta") {
    return `<section data-section="cta" style="${padBox()};background:${T.wash};border-top:1px solid ${T.rule};text-align:left;">
      ${kickerHtml(section.kicker, accent)}
      ${h2Html(section.title)}
      ${paras(section.body, T.ink)}
    </section>`;
  }

  const photo = photoSrc ? imgFrame(photoSrc, section.title || productName, 440, section.type) : "";

  return `<section data-section="${esc(section.type)}" style="padding:0;background:${T.paper};border-bottom:1px solid ${T.rule};">
    ${photo}
    <div style="${padBox()}">
      ${kickerHtml(section.kicker, accent)}
      ${h2Html(section.title)}
      ${paras(section.body)}
      ${bullets}
      ${rows}
    </div>
  </section>`;
}

export function renderDetailPageBodyHtml(pack, images = []) {
  const accent = pack.accent || DETAIL_PAGE_DEFAULT_ACCENT;
  const productName = pack.productName || pack.headline || "상품";
  const assigned = assignDetailPagePhotos(pack.sections, images);
  const parts = [];
  for (const section of pack.sections || []) {
    if (section.type === "cta" && assigned.leftovers.length) {
      parts.push(galleryHtml(assigned.leftovers, productName));
    }
    parts.push(
      renderSection(section, assigned.byType[section.type] || "", accent, productName)
    );
  }
  const score = pack._meta?.sqv?.score ?? "";
  const fontFace = `<style>@import url('${T.href}');#briclog-detail-page{font-family:${T.family};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}</style>`;
  return `${fontFace}<article id="briclog-detail-page" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" data-grade="${esc(String(score))}" data-photos="${assigned.placed}" style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:${T.paper};color:${T.ink};font-family:${T.family};">${parts.join("")}</article>`;
}

export function wrapSmartstoreHtml(bodyHtml) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>상세페이지</title><link rel="stylesheet" href="${T.href}" /></head><body style="margin:0;background:${T.wash};font-family:${T.family};">${bodyHtml}</body></html>`;
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
