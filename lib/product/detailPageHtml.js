/**
 * 브릭로그 상세 HTML — 860px. 원판은 섹션 레이아웃, 주출고는 섹션 PNG 스택.
 * wrapDetailPageImageStackHtml 이 몰에 붙는 산출물이다.
 */
import {
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_DEFAULT_ACCENT,
  DETAIL_PAGE_TYPE as BASE,
} from "@/lib/product/detailPageCatalog";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { assignDetailPagePhotos, getDetailPagePhotoDirection } from "@/lib/product/detailPagePhotos";
import { resolveDetailPageMall } from "@/lib/product/detailPageCompeteWins";
import { categoryKeyFromDetailInput } from "@/lib/product/detailPageCategoryFlow";
import {
  makeDetailPageTypeBox,
  resolveDetailPageTypePairing,
  typePairingImportCss,
} from "@/lib/product/detailPageTypePairing";
import {
  designedListItems,
  firstSentence,
} from "@/lib/product/detailPageListDesign";
import { DETAIL_PAGE_COMPOSITIONS } from "@/lib/product/detailPagePlan";

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

function leadHtml(text, color = T.ink) {
  const line = firstSentence(text);
  if (!line) return "";
  return `<p data-role="lead" style="margin:0 0 20px;font-size:${T.body}px;line-height:${T.bodyLh};color:${color};font-weight:400;word-break:keep-all;letter-spacing:-0.01em;font-family:${T.familyBody};">${esc(line)}</p>`;
}

function highlightBar(highlights, accent) {
  const items = (highlights || []).map(cleanHighlight).filter(Boolean).slice(0, 6);
  if (!items.length) return "";
  const chips = items
    .map(
      (h) =>
        `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid ${accent};border-radius:999px;font-size:14px;line-height:1.4;letter-spacing:-0.02em;color:#f7f4ef;background:#171412;font-family:${T.familyKicker};">${esc(h)}</span>`
    )
    .join("");
  return `<div data-section="highlights" data-highlights="${items.length}" style="display:flex;flex-wrap:wrap;margin-top:18px;">${chips}</div>`;
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
  const zoom = Math.max(1, Number(dir.zoom) || 1);
  const pos = dir.objectPosition || "center";
  const attrs = `data-photo-slot="${esc(slot || "")}" data-photo-direction="${esc(slot || "")}" data-photo-shot="${esc(dir.shot || "")}"`;
  if (!src) {
    const shot = esc(dir.shot || "상품 사진");
    const hint = dir.hint
      ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${T.muted};letter-spacing:-0.01em;word-break:keep-all;">${esc(dir.hint)}</p>`
      : "";
    return `<table ${attrs} data-photo-empty="1" style="width:100%;border-collapse:collapse;background:${T.wash};"><tr><td style="height:${h}px;vertical-align:middle;text-align:center;border-bottom:1px solid ${T.rule};padding:28px ${T.padX}px;"><p style="margin:0 0 12px;font-size:11px;letter-spacing:0.18em;color:${T.muted};font-family:${T.familyKicker};">${esc(dir.plate || "")}</p><p style="margin:0;font-size:22px;line-height:1.28;letter-spacing:-0.03em;color:${T.ink};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${shot}</p>${hint}<p style="margin:16px 0 0;font-size:12px;letter-spacing:0.02em;color:${T.muted};">상품 사진 칸 · 생성 또는 업로드</p></td></tr></table>`;
  }
  return `<div ${attrs} data-photo-crop="${esc(slot || "")}" style="width:100%;overflow:hidden;background:${T.wash};height:${h}px;">
    <img src="${esc(src)}" alt="${esc(alt)}" style="display:block;width:100%;height:${Math.round(h * zoom)}px;margin-top:${Math.round((h - h * zoom) * 0.35)}px;object-fit:cover;object-position:${esc(pos)};" />
  </div>`;
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
  return `<section data-section="gallery" data-photo-gallery="1" style="background:${T.paper};"><table style="width:100%;border-collapse:collapse;"><tr>${cells}</tr></table></section>`;
}

function padBox() {
  return `padding:${T.padY}px ${T.padX}px`;
}

function uspCards(bullets, accent) {
  const items = designedListItems(bullets, 6);
  if (!items.length) return "";
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    const cells = pair
      .map((item, j) => {
        const n = String(i + j + 1).padStart(2, "0");
        const colspan = pair.length === 1 ? ` colspan="2"` : "";
        const title = item.label || item.hint;
        const hint = item.label ? item.hint : "";
        return `<td${colspan} style="width:${pair.length === 1 ? "100%" : "50%"};vertical-align:top;padding:26px 22px;background:${T.wash};border:1px solid ${T.rule};">
          <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.16em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${n}</p>
          <p style="margin:0;font-size:22px;line-height:1.28;letter-spacing:-0.03em;color:${T.ink};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(title)}</p>
          ${hint ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.45;color:${T.muted};word-break:keep-all;letter-spacing:-0.01em;font-family:${T.familyBody};">${esc(hint)}</p>` : ""}
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
        `<tr style="background:${i % 2 ? T.paper : T.wash};"><th style="width:32%;text-align:left;padding:14px 16px;border-bottom:1px solid ${T.rule};color:${T.muted};font-weight:500;font-size:13px;letter-spacing:0.04em;border-left:3px solid ${i === 0 ? accent : "transparent"};">${esc(r[0])}</th><td style="padding:14px 16px;border-bottom:1px solid ${T.rule};color:${T.ink};font-weight:500;font-size:16px;word-break:keep-all;">${esc(r[1])}</td></tr>`
    )
    .join("");
  return `<table data-layout="spec-sheet" style="width:100%;border-collapse:collapse;font-size:${T.spec}px;line-height:1.45;margin-top:8px;border:1px solid ${T.rule};font-family:${T.familySpec};">${body}</table>`;
}

function chooseSteps(bullets, accent) {
  const items = designedListItems(bullets, 4);
  if (items.length < 2) return "";
  const width = Math.floor(100 / items.length);
  const cells = items
    .map((item, i) => {
      const n = String(i + 1).padStart(2, "0");
      const title = item.label || item.hint;
      const hint = item.label ? item.hint : "";
      return `<td style="width:${width}%;vertical-align:top;padding:22px 16px;background:${T.paper};border:1px solid ${T.rule};">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.16em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${n}</p>
        <p style="margin:0;font-size:20px;line-height:1.3;letter-spacing:-0.03em;color:${T.ink};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(title)}</p>
        ${hint ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.4;color:${T.muted};word-break:keep-all;">${esc(hint)}</p>` : ""}
      </td>`;
    })
    .join("");
  return `<table data-layout="choose-steps" style="width:100%;border-collapse:separate;border-spacing:8px;margin:4px -8px 0;"><tr>${cells}</tr></table>`;
}

function pointsFive(bullets, accent) {
  const items = designedListItems(bullets, 5);
  if (items.length < 3) return "";
  const rows = items
    .map((item, i) => {
      const n = String(i + 1).padStart(2, "0");
      const label = item.label || item.hint;
      const value = item.label && item.hint ? item.hint : label;
      return `<tr>
        <td style="width:56px;vertical-align:middle;padding:20px 0;border-bottom:1px solid rgba(247,244,239,0.14);font-size:11px;letter-spacing:0.16em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${n}</td>
        <td style="width:26%;vertical-align:middle;padding:20px 16px 20px 0;border-bottom:1px solid rgba(247,244,239,0.14);font-size:15px;line-height:1.35;color:rgba(247,244,239,0.62);letter-spacing:-0.02em;font-family:${T.familyBody};">${esc(label)}</td>
        <td style="vertical-align:middle;padding:20px 0;border-bottom:1px solid rgba(247,244,239,0.14);font-size:28px;line-height:1.25;letter-spacing:-0.03em;color:${T.heroFg};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(value)}</td>
      </tr>`;
    })
    .join("");
  return `<table data-layout="points-5" data-ranking-slot="5-points" style="width:100%;border-collapse:collapse;margin-top:12px;">${rows}</table>`;
}

function comparePair(rows, accent) {
  const pair = (rows || []).filter((r) => Array.isArray(r) && r[0] && r[1]).slice(0, 2);
  if (pair.length < 2) return "";
  const cells = pair
    .map(
      (r, i) =>
        `<td style="width:50%;vertical-align:top;padding:28px 22px;background:${i === 0 ? T.wash : T.paper};border:1px solid ${T.rule};">
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.16em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${esc(r[0])}</p>
          <p style="margin:0;font-size:22px;line-height:1.32;letter-spacing:-0.03em;color:${T.ink};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(r[1])}</p>
        </td>`
    )
    .join("");
  return `<table data-layout="compare-pair" style="width:100%;border-collapse:separate;border-spacing:8px;margin:8px -8px 0;"><tr>${cells}</tr></table>`;
}

function quoteHtml(text, color = T.ink) {
  const line = firstSentence(text);
  if (!line) return "";
  return `<p data-layout="observe-line" style="margin:0;font-size:22px;line-height:1.4;letter-spacing:-0.03em;color:${color};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(line)}</p>`;
}

function featureList(bullets, accent) {
  const items = designedListItems(bullets, 6);
  if (!items.length) return "";
  return `<table data-layout="feature-list" style="width:100%;border-collapse:separate;border-spacing:0 8px;margin-top:8px;">${items
    .map((item, i) => {
      const n = String(i + 1).padStart(2, "0");
      const title = item.label || item.hint;
      const hint = item.label ? item.hint : "";
      return `<tr><td style="width:48px;vertical-align:top;padding:6px 12px 6px 0;font-size:11px;letter-spacing:0.16em;font-weight:650;color:${accent};font-family:${T.familyKicker};">${n}</td><td style="vertical-align:top;padding:2px 0;"><p style="margin:0;font-size:20px;line-height:1.3;letter-spacing:-0.03em;color:${T.ink};font-weight:650;word-break:keep-all;font-family:${T.familyDisplay};">${esc(title)}</p>${hint ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.45;color:${T.muted};word-break:keep-all;">${esc(hint)}</p>` : ""}</td></tr>`;
    })
    .join("")}</table>`;
}

function compositionAttr(type) {
  const id = DETAIL_PAGE_COMPOSITIONS[type];
  return id ? ` data-composition="${esc(id)}"` : "";
}

function pipelineArticleAttrs(pack = {}) {
  const oneshot = pack?._meta?.pipeline?.oneShot === true;
  return `data-pipeline="${oneshot ? "oneshot" : "planned"}" data-korean-in-image="0" data-image-gen="product-only"`;
}

function wrapSection({ type, layout, bg, extra = "", photo, inner }) {
  return `<section data-section="${esc(type)}" data-layout="${esc(layout)}"${compositionAttr(type)} style="padding:0;background:${bg};border-bottom:1px solid ${T.rule};">
    ${photo || ""}
    <div style="${padBox()}${extra}">
      ${inner}
    </div>
  </section>`;
}

function renderSection(section, photoSrc, accent, productName, highlights = []) {
  const type = section.type;
  const dir = getDetailPagePhotoDirection(type);
  const photoH = dir.height || (type === "scene" ? 520 : type === "feature" ? 480 : 440);
  const photoWell = type === "hero" || type === "observe" || type === "feature";
  const photo =
    photoSrc || photoWell
      ? imgFrame(photoSrc, section.title || productName, photoH, type, "")
      : "";

  if (type === "hero") {
    const h = 720;
    const heroPhoto = imgFrame(photoSrc, productName, h, "hero", "");
    const chips = highlightBar(highlights, accent);
    return `<section data-section="hero" data-layout="hero-banner" data-ranking-slot="hero-banner"${compositionAttr("hero")} style="position:relative;background:${T.heroBg};color:${T.heroFg};">
      ${heroPhoto}
      <div style="position:absolute;left:0;right:0;bottom:0;padding:52px ${T.padX}px 40px;background:linear-gradient(180deg,rgba(23,20,18,0) 0%,rgba(23,20,18,0.82) 42%,rgba(23,20,18,0.96) 100%);">
        ${kickerHtml(section.kicker, "rgba(247,244,239,0.62)")}
        <h1 style="margin:0;font-size:${T.h1}px;line-height:1.22;letter-spacing:${T.h1Track};font-weight:650;word-break:keep-all;color:${T.heroFg};font-family:${T.familyDisplay};">${esc(section.title)}</h1>
        ${chips}
      </div>
    </section>`;
  }

  if (type === "cta") {
    return wrapSection({
      type,
      layout: "cta-bar",
      bg: T.wash,
      extra: `;border-left:6px solid ${accent}`,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${leadHtml(section.body, T.ink)}`,
    });
  }

  if (type === "usp") {
    return wrapSection({
      type,
      layout: "usp-rows",
      bg: T.paper,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${featureList(section.bullets, accent)}`,
    });
  }

  if (type === "spec") {
    return wrapSection({
      type,
      layout: "spec-sheet",
      bg: T.wash,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${specSheet(section.rows, accent)}`,
    });
  }

  if (type === "observe") {
    return wrapSection({
      type,
      layout: "observe-quote",
      bg: T.wash,
      photo,
      extra: `;border-left:4px solid ${accent}`,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${quoteHtml(section.body)}`,
    });
  }

  if (type === "intent" || type === "problem") {
    return wrapSection({
      type,
      layout: "problem-band",
      bg: T.wash,
      extra: `;border-left:6px solid ${accent}`,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${leadHtml(section.body, T.ink)}`,
    });
  }

  if (type === "explain") {
    const points = pointsFive(section.bullets, accent);
    const compare = points ? "" : comparePair(section.rows, accent);
    return wrapSection({
      type,
      layout: points ? "points-5" : compare ? "reason-band" : "copy-block",
      bg: T.heroBg,
      extra: `;color:${T.heroFg}`,
      inner: `${kickerHtml(section.kicker, "rgba(247,244,239,0.62)")}${h2Html(section.title, T.heroFg)}${points || compare || leadHtml(section.body, "rgba(247,244,239,0.88)")}`,
    });
  }

  if (type === "feature" || type === "scene") {
    return wrapSection({
      type,
      layout: type === "scene" ? "scene-bleed" : "feature-well",
      bg: T.paper,
      photo,
      inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${leadHtml(section.body)}${type === "feature" ? featureList(section.bullets, accent) : ""}`,
    });
  }

  if (type === "brand") {
    return wrapSection({
      type,
      layout: "brand-dark",
      bg: T.heroBg,
      extra: `;color:${T.heroFg}`,
      inner: `${kickerHtml(section.kicker, "rgba(247,244,239,0.62)")}${h2Html(section.title, T.heroFg)}${leadHtml(section.body, "rgba(247,244,239,0.88)")}`,
    });
  }

  if (type === "notice") {
    return wrapSection({
      type,
      layout: "notice-quiet",
      bg: T.wash,
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${leadHtml(section.body, T.ink)}`,
    });
  }

  return wrapSection({
    type,
    layout: "copy-block",
    bg: T.paper,
    photo,
    inner: `${kickerHtml(section.kicker, accent)}${h2Html(section.title)}${leadHtml(section.body)}${featureList(section.bullets, accent)}${specSheet(section.rows, accent)}`,
  });
}

export function renderDetailPageBodyHtml(pack, images = []) {
  const pairing = applyType(pack);
  const accent = pack.accent || DETAIL_PAGE_DEFAULT_ACCENT;
  const productName = pack.productName || pack.headline || "상품";
  const assigned = assignDetailPagePhotos(pack.sections, images);
  const parts = [];
  for (const section of pack.sections || []) {
    if (section.type === "cta" && assigned.leftovers.length) {
      parts.push(galleryHtml(assigned.leftovers, productName, assigned.captions));
    }
    const src = assigned.byType[section.type] || "";
    parts.push(
      renderSection(section, src, accent, productName, pack.highlights || [])
    );
  }
  const score = pack._meta?.sqv?.score ?? "";
  const flowKey = pack._meta?.categoryFlow?.id || categoryKeyFromDetailInput(pack);
  const ranking = pack._meta?.ranking || {};
  const fontFace = `<style>${typePairingImportCss(pairing)}#gollaboda-detail-page{font-family:${T.familyBody};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}</style>`;
  return `${fontFace}<article id="gollaboda-detail-page" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" data-ranking="${esc(ranking.source || "naver-shop-rank")}" data-list-sample="${esc(ranking.listSample || "creazy")}" data-type="${esc(pairing.id)}" data-category-flow="${esc(flowKey)}" data-fonts="${esc(`${pairing.displayKo}+${pairing.displayEn}`)}" data-grade="${esc(String(score))}" data-photos="${assigned.placed}" data-ui="section-layouts" data-visual="first-glance" data-mall-ready="smartstore,coupang" ${pipelineArticleAttrs(pack)} style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:${T.paper};color:${T.ink};font-family:${T.familyBody};">${parts.join("")}</article>`;
}

export function wrapMallHtml(bodyHtml, pack = {}, mallId = "smartstore") {
  const mall = resolveDetailPageMall(mallId);
  const pairing = applyType(pack);
  const links = pairing.hrefs
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${DETAIL_PAGE_PRODUCT.name}</title>${links}</head><body data-mall="${esc(mall.id)}" data-mall-width="${esc(String(mall.width))}" style="margin:0;background:${T.wash};font-family:${T.familyBody};">${bodyHtml}</body></html>`;
}

/**
 * 몰 주출고 — 섹션마다 860 <img>. 리스트(후커블·크리에이지·드랩·젠시)와 같은 붙이는 방식.
 * HTML 표·카드는 원판이고, 이 스택이 스마트스토어·쿠팡에 올라가는 화면이다.
 */
export function wrapDetailPageImageStackHtml(images = [], pack = {}, mallId = "smartstore") {
  const mall = resolveDetailPageMall(mallId);
  const productName = pack.productName || pack.headline || "상품";
  const imgs = (Array.isArray(images) ? images : [])
    .map((item, i) => {
      const src = typeof item === "string" ? item : item?.src;
      if (!src) return "";
      const alt =
        (typeof item === "object" && item?.alt) || `${productName} ${i + 1}`;
      return `<img src="${esc(src)}" alt="${esc(alt)}" width="${DETAIL_PAGE_WIDTH}" data-stack-index="${i}" style="display:block;width:${DETAIL_PAGE_WIDTH}px;max-width:100%;height:auto;border:0;margin:0;padding:0;" />`;
    })
    .filter(Boolean)
    .join("");
  const ranking = pack._meta?.ranking || {};
  const body = `<article id="gollaboda-detail-page" data-deliverable="image-stack" data-engine="${esc(pack._meta?.engine || "")}" data-ranking="${esc(ranking.source || "naver-shop-rank")}" data-list-sample="${esc(ranking.listSample || "creazy")}" data-mall-ready="smartstore,coupang" ${pipelineArticleAttrs(pack)} style="width:${DETAIL_PAGE_WIDTH}px;margin:0 auto;background:#fff;">${imgs}</article>`;
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${DETAIL_PAGE_PRODUCT.name}</title></head><body data-mall="${esc(mall.id)}" data-mall-width="${esc(String(mall.width))}" data-deliverable="image-stack" style="margin:0;background:#fff;">${body}</body></html>`;
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
