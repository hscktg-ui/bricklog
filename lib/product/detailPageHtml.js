/**
 * BRICLOG 상세 HTML — 에디토리얼 지면, 860px, 인라인만
 */
import { DETAIL_PAGE_WIDTH, DETAIL_PAGE_DEFAULT_ACCENT } from "@/lib/product/detailPageCatalog";

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
  return `<p style="margin:0 0 16px;font-size:17px;line-height:1.8;color:#2c2825;word-break:keep-all;">${t}</p>`;
}

function imgTag(src, alt) {
  if (!src) return "";
  return `<img src="${esc(src)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;object-fit:cover;" />`;
}

function renderSection(section, images, accent, productName) {
  const kicker = section.kicker
    ? `<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;color:${accent};font-weight:600;">${esc(section.kicker)}</p>`
    : "";
  const title = section.title
    ? `<h2 style="margin:0 0 18px;font-size:24px;line-height:1.4;letter-spacing:-0.03em;color:#1c1917;font-weight:600;word-break:keep-all;">${esc(section.title)}</h2>`
    : "";
  const bullets = (section.bullets || []).length
    ? `<ul style="margin:8px 0 0;padding:0;list-style:none;">${section.bullets
        .map(
          (b) =>
            `<li style="margin:0 0 14px;padding-left:16px;border-left:2px solid ${accent};font-size:16px;line-height:1.7;color:#2c2825;word-break:keep-all;">${esc(b)}</li>`
        )
        .join("")}</ul>`
    : "";
  const rows = (section.rows || []).length
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">${section.rows
        .map(
          (r) =>
            `<tr><th style="width:32%;text-align:left;padding:12px 0;border-bottom:1px solid #e8e4de;color:#6b6560;font-weight:500;">${esc(r[0])}</th><td style="padding:12px 0;border-bottom:1px solid #e8e4de;color:#1c1917;">${esc(r[1])}</td></tr>`
        )
        .join("")}</table>`
    : "";

  if (section.type === "hero") {
    return `<section style="background:#1c1917;color:#f7f6f2;">
      ${imgTag(images[0], productName)}
      <div style="padding:40px 32px 44px;">
        ${section.kicker ? `<p style="margin:0 0 12px;font-size:11px;letter-spacing:0.2em;opacity:0.65;">${esc(section.kicker)}</p>` : ""}
        <h1 style="margin:0 0 16px;font-size:32px;line-height:1.3;letter-spacing:-0.04em;font-weight:600;word-break:keep-all;">${esc(section.title)}</h1>
        <p style="margin:0;font-size:17px;line-height:1.75;opacity:0.88;word-break:keep-all;">${esc(section.body)}</p>
      </div>
    </section>`;
  }

  if (section.type === "cta") {
    return `<section style="padding:44px 32px;background:#f7f6f2;border-top:1px solid #e8e4de;text-align:left;">
      ${section.kicker ? `<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;color:${accent};font-weight:600;">${esc(section.kicker)}</p>` : ""}
      <h2 style="margin:0 0 12px;font-size:24px;line-height:1.4;letter-spacing:-0.03em;color:#1c1917;font-weight:600;word-break:keep-all;">${esc(section.title)}</h2>
      <p style="margin:0;font-size:17px;line-height:1.75;color:#2c2825;word-break:keep-all;">${esc(section.body)}</p>
    </section>`;
  }

  const extraImg =
    section.type === "feature" || section.type === "scene"
      ? imgTag(images[1] || images[0], section.title)
      : "";

  return `<section style="padding:40px 32px;background:#fff;border-bottom:1px solid #f0ece6;">
    ${extraImg ? `<div style="margin:0 -32px 24px;">${extraImg}</div>` : ""}
    ${kicker}${title}${para(section.body)}${bullets}${rows}
  </section>`;
}

export function renderDetailPageBodyHtml(pack, images = []) {
  const accent = pack.accent || DETAIL_PAGE_DEFAULT_ACCENT;
  const productName = pack.productName || pack.headline || "상품";
  const sections = (pack.sections || [])
    .map((s) => renderSection(s, images, accent, productName))
    .join("");
  return `<article id="briclog-detail-page" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:#fff;color:#1c1917;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">${sections}</article>`;
}

export function wrapSmartstoreHtml(bodyHtml) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>상세페이지</title></head><body style="margin:0;background:#efece7;">${bodyHtml}</body></html>`;
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
