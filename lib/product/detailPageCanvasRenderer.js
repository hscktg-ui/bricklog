/**
 * Ecommerce detail CANVAS renderer.
 * Site Card/Button/Hero/FAQ를 쓰지 않는다.
 * 각 칸은 860×H 광고 캔버스. 한글은 사진 위 타이포로만 올린다.
 */
import { DETAIL_PAGE_WIDTH } from "@/lib/product/detailPageCatalog";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import { categoryKeyFromDetailInput } from "@/lib/product/detailPageCategoryFlow";
import {
  makeDetailPageTypeBox,
  resolveDetailPageTypePairing,
  typePairingImportCss,
} from "@/lib/product/detailPageTypePairing";
import { resolveDetailPageMall } from "@/lib/product/detailPageCompeteWins";
import {
  applyCanvasCopyToPack,
  buildDetailPageCanvasStory,
  DETAIL_PAGE_CANVAS_WIDTH,
} from "@/lib/product/detailPageCanvasStory";
import { evaluateDetailPageCanvasQuality } from "@/lib/qa/detailPageCanvasQuality";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl(text) {
  return esc(text).replace(/\n/g, "<br />");
}

function typeBox(pack) {
  const pairing = resolveDetailPageTypePairing(pack);
  return { pairing, T: makeDetailPageTypeBox(pairing) };
}

function photoLayer(frame, eager, box = "inset:0", extraStyle = "") {
  if (!frame.photo) {
    return `<div data-photo-empty="1" data-photo-slot="${esc(frame.photoSlot || "")}" data-photo-direction="${esc(frame.photoDirection || "")}" style="position:absolute;${box};background:${esc(frame.paper || "#16120e")};"></div>`;
  }
  const pos =
    frame.composition === "macro_crop"
      ? "center"
      : frame.composition === "asymmetric"
        ? "70% 50%"
        : "center";
  const scale = frame.composition === "macro_crop" ? 1.18 : 1;
  return `<img src="${esc(frame.photo)}" alt="${esc(frame.art?.message || "")}"${eager ? "" : ' loading="lazy"'} data-photo-slot="${esc(frame.photoSlot || "")}" data-photo-direction="${esc(frame.photoDirection || "")}" data-photo-shot="${esc(frame.art?.visualType || "")}" style="position:absolute;${box};width:100%;height:100%;object-fit:cover;object-position:${pos};transform:scale(${scale});transform-origin:center;display:block;border:0;${extraStyle}" />`;
}

function veil(kind, paper) {
  if (kind === "left") {
    return `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,10,8,.55) 0%,rgba(12,10,8,.12) 52%,rgba(12,10,8,0) 100%);"></div>`;
  }
  if (kind === "bottom") {
    return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,10,8,.08) 40%,rgba(12,10,8,.62) 100%);"></div>`;
  }
  if (kind === "top") {
    return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,10,8,.5) 0%,rgba(12,10,8,0) 46%);"></div>`;
  }
  if (kind === "soft") {
    return `<div style="position:absolute;inset:0;background:rgba(12,10,8,.18);"></div>`;
  }
  if (kind === "paper") {
    return `<div style="position:absolute;inset:0;background:${esc(paper || "#14110e")};"></div>`;
  }
  return "";
}

function typeBlock(frame, T, extra = "") {
  const kicker = frame.kicker
    ? `<p data-role="kicker" style="margin:0 0 14px;font-size:13px;line-height:1.45;letter-spacing:0.02em;font-weight:400;color:${esc(frame.ink)};font-family:${T.familyBody};">${esc(frame.kicker)}</p>`
    : "";
  const size =
    frame.art?.headlineScale === "XL"
      ? 46
      : frame.art?.headlineScale === "L"
        ? 36
        : frame.art?.headlineScale === "S"
          ? 18
          : 28;
  const headline = frame.headline
    ? `<${frame.type === "hero" ? "h1" : "h2"} style="margin:0;max-width:11em;font-size:${size}px;line-height:1.28;letter-spacing:0;font-weight:400;word-break:keep-all;color:${esc(frame.ink)};font-family:${T.familyDisplay};">${nl(frame.headline)}</${frame.type === "hero" ? "h1" : "h2"}>`
    : "";
  const sub = frame.sub
    ? `<p data-role="lead" style="margin:16px 0 0;max-width:16em;font-size:18px;line-height:1.55;word-break:keep-all;color:${esc(frame.ink)};font-family:${T.familyBody};opacity:.88;">${nl(frame.sub)}</p>`
    : "";
  return `${kicker}${headline}${sub}${extra}`;
}

function factLines(facts, ink, T, catalog = false) {
  if (!facts?.length) return "";
  if (catalog) {
    return facts
      .map(
        ([k, v], i) =>
          `<p style="margin:${i ? 14 : 0}px 0 0;font-size:17px;line-height:1.55;word-break:keep-all;color:${esc(ink)};font-family:${T.familyBody};">${esc(v)}${k && !String(v).includes(k) ? `<span style="margin-left:10px;font-size:13px;opacity:.5;">${esc(k)}</span>` : ""}</p>`
      )
      .join("");
  }
  return facts
    .map(
      ([k, v], i) =>
        `<p style="margin:${i ? 18 : 0}px 0 0;font-size:15px;line-height:1.55;word-break:keep-all;color:${esc(ink)};font-family:${T.familyBody};"><span style="display:block;font-size:12px;letter-spacing:0.02em;opacity:.62;margin-bottom:4px;">${esc(k)}</span>${esc(v)}</p>`
    )
    .join("");
}

function composeFrame(frame, T, eager) {
  const w = DETAIL_PAGE_CANVAS_WIDTH;
  const h = frame.height || 1200;
  const cov = frame.imageCoverage ?? 0.8;
  const ink = frame.ink || "#f4efe6";
  const paper = frame.paper || "#16120e";
  const c = frame.composition;
  let layers = "";

  if (c === "editorial" || c === "product_left") {
    layers = `${photoLayer(frame, eager)}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,10,8,0) 42%,rgba(12,10,8,.42) 100%);"></div>
      <div style="position:absolute;top:88px;right:40px;width:240px;color:${esc(ink)};">${typeBlock(frame, T, factLines(frame.facts, ink, T))}</div>`;
  } else if (c === "product_right") {
    layers = `<div style="position:absolute;inset:0;background:${esc(paper)};"></div>
      ${photoLayer(frame, eager, "top:0;right:0;bottom:0;left:38%")}
      <div style="position:absolute;top:80px;left:48px;width:260px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "specification") {
    layers = `<div style="position:absolute;inset:0;background:${esc(paper)};"></div>
      ${photoLayer(frame, eager, "top:80px;right:0;bottom:80px;left:46%", "object-fit:contain;opacity:.95;")}
      <div style="position:absolute;top:72px;left:44px;width:320px;color:${esc(ink)};">
        ${typeBlock(frame, T)}
        <div style="margin-top:40px;">${factLines(frame.facts, ink, T, true)}</div>
      </div>`;
  } else if (c === "negative_space") {
    layers = `<div style="position:absolute;inset:0;background:${esc(paper)};"></div>
      ${photoLayer(frame, eager, "top:0;right:0;width:48%;height:100%")}
      <div style="position:absolute;top:80px;left:52px;width:300px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "centered_product") {
    layers = `${photoLayer(frame, eager)}
      <div style="position:absolute;left:40px;bottom:48px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "typography_overlay") {
    layers = `${photoLayer(frame, eager)}
      ${veil("left")}
      <div style="position:absolute;top:42%;left:48px;right:80px;transform:translateY(-50%);color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "macro_crop") {
    layers = `${photoLayer(frame, eager)}
      ${veil("bottom")}
      <div style="position:absolute;left:40px;bottom:40px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "full_bleed_photo") {
    layers = `${photoLayer(frame, eager)}
      ${veil("bottom")}
      <div style="position:absolute;left:44px;bottom:48px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "asymmetric") {
    layers = `${photoLayer(frame, eager)}
      ${veil("bottom")}
      <div style="position:absolute;right:44px;bottom:52px;text-align:right;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "lifestyle") {
    layers = `${photoLayer(frame, eager)}
      ${veil(frame.textPosition === "upper_right" || frame.textPosition === "upper_left" ? "top" : "bottom")}
      <div style="position:absolute;${frame.textPosition === "upper_right" ? "top:48px;right:44px;text-align:right;" : "top:48px;left:44px;"}color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else if (c === "split_visual") {
    layers = `${photoLayer(frame, eager)}
      ${veil("top")}
      <div style="position:absolute;top:48px;left:44px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  } else {
    layers = `${photoLayer(frame, eager)}
      ${veil("left")}
      <div style="position:absolute;top:56px;left:44px;right:72px;color:${esc(ink)};">${typeBlock(frame, T)}</div>`;
  }

  const priceMark = /\d/.test(frame.headline) && /원/.test(frame.headline)
    ? ' data-price="1"'
    : "";
  const close = frame.type === "cta" ? ' data-cta="close"' : "";

  return `<section data-section="${esc(frame.type)}" data-canvas="${frame.n}" data-layout="ad-canvas" data-composition="${esc(c)}" data-purpose="${esc(frame.purpose)}" data-image-ratio="${esc(String(cov))}" data-image-coverage="${esc(String(cov))}" data-ui-elements="0" data-photo-direction="${esc(frame.photoDirection || "")}"${priceMark}${close} style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${esc(paper)};margin:0;padding:0;">
    ${layers}
  </section>`;
}

export function renderDetailPageCanvasHtml(story, pack = {}) {
  const { pairing, T } = typeBox(pack);
  const frames = story?.frames || [];
  const pageWidth = DETAIL_PAGE_CANVAS_WIDTH;
  const flowKey = pack._meta?.categoryFlow?.id || categoryKeyFromDetailInput(pack);
  const ranking = pack._meta?.ranking || {};
  const score = pack._meta?.sqv?.score ?? "";
  const parts = frames.map((frame, i) => composeFrame(frame, T, i === 0));
  const highlights = [...new Set((pack.highlights || []).filter(Boolean))].slice(0, 4);
  const highlightAttr = highlights.length ? ` data-highlights="${highlights.length}"` : "";
  const css = `<style>${typePairingImportCss(pairing)}#gollaboda-detail-page{box-sizing:border-box;width:${pageWidth}px;max-width:${pageWidth}px;min-width:${pageWidth}px;margin:0 auto;background:#11100e;color:${T.ink};font-family:${T.familyBody};-webkit-font-smoothing:antialiased;}#gollaboda-detail-page *,#gollaboda-detail-page *::before,#gollaboda-detail-page *::after{box-sizing:border-box;}#gollaboda-detail-page [data-composition="specification"] h2,#gollaboda-detail-page [data-price="1"] h2,#gollaboda-detail-page [data-price="1"] h1{font-size:38px;line-height:1.05;font-variant-numeric:tabular-nums;}</style>`;
  return `${css}<article id="gollaboda-detail-page" data-deliverable="mall-image" data-renderer="detail-canvas" data-commerce="canvas" data-role="ecommerce-art-director" data-ui-elements="0" data-ui="ad-canvas" data-visual="first-glance" data-hero="canvas" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" data-ranking="${esc(ranking.source || "naver-shop-rank")}" data-list-sample="${esc(ranking.listSample || "creazy")}" data-type="${esc(pairing.id)}" data-category-flow="${esc(flowKey)}" data-style="${esc(pack._meta?.style?.id || "")}" data-fonts="${esc(`${pairing.displayKo}+${pairing.displayEn}`)}" data-grade="${esc(String(score))}" data-photos="${frames.filter((f) => f.photo).length}" data-mall-ready="smartstore,coupang" data-pipeline="planned" data-korean-in-image="0" data-image-gen="product-only"${highlightAttr} style="width:${pageWidth}px;max-width:${pageWidth}px;min-width:360px;margin:0 auto;background:#11100e;color:${T.ink};font-family:${T.familyBody};">${parts.join("")}</article>`;
}

export function renderDetailPageFromCanvas(pack, photos = []) {
  const story = buildDetailPageCanvasStory(pack, photos);
  const stamped = applyCanvasCopyToPack(pack, story);
  const html = renderDetailPageCanvasHtml(story, stamped);
  const quality = evaluateDetailPageCanvasQuality(story, html);
  return { html, story, pack: stamped, quality };
}

export function wrapCanvasDocument(bodyHtml, pack = {}, mallId = "smartstore") {
  const mall = resolveDetailPageMall(mallId);
  const { pairing, T } = typeBox(pack);
  const links = pairing.hrefs
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pack.productName || DETAIL_PAGE_PRODUCT.name)}</title>${links}<style>html,body{margin:0;overflow-x:hidden;background:#11100e;}</style></head><body data-mall="${esc(mall.id)}" data-mall-width="${esc(String(mall.width || DETAIL_PAGE_WIDTH))}" data-deliverable="canvas" data-renderer="detail-canvas" style="margin:0;background:#11100e;font-family:${T.familyBody};">${bodyHtml}</body></html>`;
}
