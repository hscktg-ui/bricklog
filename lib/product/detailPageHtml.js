/**
 * BRICLOG 상세 HTML — 860px, 인라인만, 사진 슬롯 배치
 */
import { DETAIL_PAGE_WIDTH, DETAIL_PAGE_DEFAULT_ACCENT } from "@/lib/product/detailPageCatalog";
import { assignDetailPagePhotos } from "@/lib/product/detailPagePhotos";

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
  return `<p style="margin:0 0 12px;font-size:16px;line-height:1.75;color:#2c2825;word-break:keep-all;">${t}</p>`;
}

function imgFrame(src, alt, height, slot) {
  if (!src) return "";
  const h = Number(height) || 480;
  return `<div data-photo-slot="${esc(slot || "")}" style="width:100%;height:${h}px;overflow:hidden;background:#ece8e2;">
    <img src="${esc(src)}" alt="${esc(alt)}" style="display:block;width:100%;height:${h}px;object-fit:cover;object-position:center;" />
  </div>`;
}

function galleryHtml(images, productName) {
  const photos = (images || []).filter(Boolean);
  if (!photos.length) return "";
  if (photos.length === 1) {
    return imgFrame(photos[0], productName, 420, "gallery");
  }
  const h = photos.length >= 3 ? 280 : 360;
  const cells = photos
    .map(
      (src, i) =>
        `<div style="flex:1;min-width:0;">${imgFrame(src, `${productName} ${i + 1}`, h, `gallery-${i}`)}</div>`
    )
    .join("");
  return `<section data-photo-gallery="1" style="display:flex;gap:2px;background:#fff;">${cells}</section>`;
}

function renderSection(section, photoSrc, accent, productName) {
  const kicker = section.kicker
    ? `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;color:${accent};font-weight:600;">${esc(section.kicker)}</p>`
    : "";
  const title = section.title
    ? `<h2 style="margin:0 0 14px;font-size:22px;line-height:1.4;letter-spacing:-0.03em;color:#1c1917;font-weight:600;word-break:keep-all;">${esc(section.title)}</h2>`
    : "";
  const bullets = (section.bullets || []).length
    ? `<ul style="margin:4px 0 0;padding:0;list-style:none;">${section.bullets
        .map(
          (b) =>
            `<li style="margin:0 0 10px;padding-left:14px;border-left:2px solid ${accent};font-size:16px;line-height:1.65;color:#2c2825;word-break:keep-all;">${esc(b)}</li>`
        )
        .join("")}</ul>`
    : "";
  const rows = (section.rows || []).length
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:4px;">${section.rows
        .map(
          (r) =>
            `<tr><th style="width:32%;text-align:left;padding:10px 0;border-bottom:1px solid #e8e4de;color:#6b6560;font-weight:500;">${esc(r[0])}</th><td style="padding:10px 0;border-bottom:1px solid #e8e4de;color:#1c1917;">${esc(r[1])}</td></tr>`
        )
        .join("")}</table>`
    : "";

  if (section.type === "hero") {
    return `<section data-section="hero" style="background:#1c1917;color:#f7f6f2;">
      ${imgFrame(photoSrc, productName, 520, "hero")}
      <div style="padding:32px 28px 36px;">
        ${section.kicker ? `<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;opacity:0.65;">${esc(section.kicker)}</p>` : ""}
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.28;letter-spacing:-0.04em;font-weight:600;word-break:keep-all;">${esc(section.title)}</h1>
        <p style="margin:0;font-size:16px;line-height:1.7;opacity:0.88;word-break:keep-all;">${esc(section.body)}</p>
      </div>
    </section>`;
  }

  if (section.type === "cta") {
    return `<section data-section="cta" style="padding:36px 28px;background:#f7f6f2;border-top:1px solid #e8e4de;text-align:left;">
      ${section.kicker ? `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;color:${accent};font-weight:600;">${esc(section.kicker)}</p>` : ""}
      <h2 style="margin:0 0 10px;font-size:22px;line-height:1.4;letter-spacing:-0.03em;color:#1c1917;font-weight:600;word-break:keep-all;">${esc(section.title)}</h2>
      <p style="margin:0;font-size:16px;line-height:1.7;color:#2c2825;word-break:keep-all;">${esc(section.body)}</p>
    </section>`;
  }

  const photo = photoSrc ? imgFrame(photoSrc, section.title || productName, 420, section.type) : "";

  return `<section data-section="${esc(section.type)}" style="padding:0;background:#fff;border-bottom:1px solid #f0ece6;">
    ${photo}
    <div style="padding:28px 28px 32px;">
      ${kicker}${title}${para(section.body)}${bullets}${rows}
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
  return `<article id="briclog-detail-page" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" data-photos="${assigned.placed}" style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:#fff;color:#1c1917;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">${parts.join("")}</article>`;
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
