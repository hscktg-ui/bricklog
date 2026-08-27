/**
 * 860px 스마트스토어형 롱 HTML — 인라인 스타일만 (붙여넣기·PNG 캡처용)
 */
import { DETAIL_PAGE_WIDTH } from "@/lib/product/detailPageCatalog";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function para(text) {
  const t = esc(text);
  if (!t) return "";
  return `<p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#2a2a2a;word-break:keep-all;">${t}</p>`;
}

function imgTag(src, alt) {
  if (!src) return "";
  return `<img src="${esc(src)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;object-fit:cover;" />`;
}

function renderSection(section, images, accent, productName) {
  const type = section.type;
  const kicker = section.kicker
    ? `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${accent};font-weight:600;">${esc(section.kicker)}</p>`
    : "";
  const title = section.title
    ? `<h2 style="margin:0 0 16px;font-size:26px;line-height:1.35;letter-spacing:-0.03em;color:#111;font-weight:650;word-break:keep-all;">${esc(section.title)}</h2>`
    : "";
  const bullets = (section.bullets || []).length
    ? `<ul style="margin:0;padding:0;list-style:none;">${section.bullets
        .map(
          (b, i) =>
            `<li style="display:flex;gap:12px;margin:0 0 12px;font-size:16px;line-height:1.65;color:#2a2a2a;word-break:keep-all;"><span style="flex:none;width:22px;height:22px;border-radius:999px;background:${accent};color:#fff;font-size:11px;line-height:22px;text-align:center;font-weight:700;">${i + 1}</span><span>${esc(b)}</span></li>`
        )
        .join("")}</ul>`
    : "";
  const rows = (section.rows || []).length
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">${section.rows
        .map(
          (r) =>
            `<tr><th style="width:34%;text-align:left;padding:11px 0;border-bottom:1px solid #eee;color:#666;font-weight:500;">${esc(r[0])}</th><td style="padding:11px 0;border-bottom:1px solid #eee;color:#111;">${esc(r[1])}</td></tr>`
        )
        .join("")}</table>`
    : "";

  if (type === "hero") {
    return `<section style="padding:0 0 8px;background:#111;color:#fff;">
      ${imgTag(images[0], productName)}
      <div style="padding:36px 28px 40px;">
        ${section.kicker ? `<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7;">${esc(section.kicker)}</p>` : ""}
        <h1 style="margin:0 0 14px;font-size:34px;line-height:1.25;letter-spacing:-0.04em;font-weight:650;word-break:keep-all;">${esc(section.title)}</h1>
        <p style="margin:0;font-size:16px;line-height:1.7;opacity:0.86;word-break:keep-all;">${esc(section.body)}</p>
      </div>
    </section>`;
  }

  if (type === "cta") {
    return `<section style="padding:48px 28px;background:${accent};color:#fff;text-align:center;">
      ${section.kicker ? `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#fff;opacity:0.72;font-weight:600;">${esc(section.kicker)}</p>` : ""}
      <h2 style="margin:0 0 12px;font-size:26px;line-height:1.35;letter-spacing:-0.03em;font-weight:650;word-break:keep-all;">${esc(section.title)}</h2>
      <p style="margin:0;font-size:16px;line-height:1.7;opacity:0.92;word-break:keep-all;">${esc(section.body)}</p>
    </section>`;
  }

  const extraImg =
    type === "feature" || type === "scene" ? imgTag(images[1] || images[0], section.title) : "";

  return `<section style="padding:40px 28px;background:#fff;border-bottom:1px solid #f0f0f0;">
    ${extraImg ? `<div style="margin:0 -28px 24px;">${extraImg}</div>` : ""}
    ${kicker}${title}${para(section.body)}${bullets}${rows}
  </section>`;
}

export function renderDetailPageBodyHtml(pack, images = []) {
  const accent = pack.accent || "#1a1a1a";
  const productName = pack.productName || pack.headline || "상품";
  const sections = (pack.sections || [])
    .map((s) => renderSection(s, images, accent, productName))
    .join("");
  return `<article id="briclog-detail-page" data-engine="${esc(pack._meta?.engine || "")}" style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:#fff;color:#111;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">${sections}</article>`;
}

export function wrapSmartstoreHtml(bodyHtml) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>상세페이지</title></head><body style="margin:0;background:#f4f4f4;">${bodyHtml}</body></html>`;
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
