/**
 * 브릭로그 상세 HTML — 맛보기 주출고는 텍스트 HTML.
 * 몰 붙여넣기용 섹션 PNG는 wrapDetailPageImageStackHtml.
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
import { isNeedFact } from "@/lib/product/detailPageFactDossier";

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

function highlightMarker(highlights) {
  const items = [...new Set((highlights || []).map(cleanHighlight).filter(Boolean))].slice(0, 4);
  if (!items.length) return "";
  return ` data-highlights="${items.length}"`;
}

function cleanHighlight(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function kickerHtml(text, color) {
  if (!text) return "";
  return `<p data-role="kicker" style="margin:0 0 14px;font-size:12px;line-height:1.45;letter-spacing:0.06em;color:${color};font-weight:500;font-family:${T.familyBody};">${esc(text)}</p>`;
}

function h2Html(text, color = T.ink, size = 26) {
  if (!text) return "";
  return `<h2 style="margin:0 0 16px;max-width:16em;font-size:${size}px;line-height:1.35;letter-spacing:${T.titleTrack || "0"};color:${color};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(text)}</h2>`;
}

function padBox(kind = "std") {
  const pads = {
    plate: "40px 48px 48px",
    intent: "52px 48px 56px",
    explain: "36px 40px 48px",
    usp: "48px 52px 56px",
    observe: "40px 48px 56px",
    feature: "28px 40px 44px",
    scene: "56px 52px 64px",
    spec: "20px 40px 36px",
    brand: "36px 48px 40px",
    notice: "28px 40px 36px",
    cta: "48px 48px 56px",
    std: `${T.padY}px ${T.padX}px`,
  };
  return `padding:${pads[kind] || pads.std}`;
}

function splitOffer(body, priceFromPack) {
  const fromPack = String(priceFromPack || "").trim();
  const parts = String(body || "")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  const priced = parts.find((p) => /\d/.test(p) && /원/.test(p)) || fromPack;
  const rest = parts.filter((p) => p !== priced).join(" · ");
  return { price: priced, rest };
}

function priceHtml(price, color = T.ink) {
  const t = String(price || "").trim();
  if (!t || isNeedFact(t)) return "";
  const m = t.match(/^([\d,.\s]+)\s*(원.*)$/);
  const num = m ? m[1].replace(/\s/g, "") : t;
  const unit = m ? m[2] : "";
  return `<p data-price="1" style="margin:20px 0 0;font-size:38px;line-height:1.05;letter-spacing:0;font-weight:400;font-variant-numeric:tabular-nums;color:${color};font-family:${T.familyDisplay};">${esc(num)}${unit ? `<span style="margin-left:6px;font-size:15px;font-weight:400;letter-spacing:0;font-family:${T.familyBody};">${esc(unit)}</span>` : ""}</p>`;
}

function imgFrame(src, alt, height, slot, caption, capColor = T.muted, extra = {}) {
  const dir = getDetailPagePhotoDirection(slot);
  const h = Number(height || dir.height) || 440;
  const zoom = Math.max(1, Number(dir.zoom) || 1);
  const pos = dir.objectPosition || "center";
  const lazy = extra.eager ? "" : ` loading="lazy"`;
  const attrs = `data-photo-slot="${esc(slot || "")}" data-photo-direction="${esc(slot || "")}" data-photo-shot="${esc(dir.shot || "")}" data-photo-plate="${esc(dir.plate || "")}"`;
  if (!src) {
    if (slot === "hero") {
      return `<table ${attrs} data-photo-empty="1" style="width:100%;border-collapse:collapse;background:${T.heroBg};"><tr><td style="height:${h}px;vertical-align:middle;padding:28px ${T.padX}px;"></td></tr></table>`;
    }
    return "";
  }
  const inset = extra.inset ? "28px 28px 0" : "0";
  return `<div ${attrs} data-photo-crop="${esc(slot || "")}" style="width:100%;overflow:hidden;background:${T.wash};height:${h}px;padding:${inset};box-sizing:border-box;">
    <img src="${esc(src)}" alt="${esc(alt)}"${lazy} style="display:block;width:100%;height:${Math.round(h * zoom)}px;margin-top:${Math.round((h - h * zoom) * 0.35)}px;object-fit:cover;object-position:${esc(pos)};" />
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

function faqHtml(faqs) {
  const list = (faqs || []).filter((item) => item?.q && item?.a);
  if (!list.length) return "";
  const rows = list
    .map(
      (item) =>
        `<div style="padding:16px 0;border-bottom:1px solid ${T.rule};"><dt style="margin:0 0 6px;font-size:15px;line-height:1.45;font-weight:500;color:${T.ink};word-break:keep-all;font-family:${T.familyBody};">${esc(item.q)}</dt><dd style="margin:0;font-size:16px;line-height:1.6;color:${T.muted};word-break:keep-all;font-family:${T.familyBody};">${esc(item.a)}</dd></div>`
    )
    .join("");
  return `<dl data-layout="faq" style="margin:16px 0 0;">${rows}</dl>`;
}

function questionsHtml(bullets) {
  const items = (bullets || []).map((b) => String(b || "").trim()).filter(Boolean).slice(0, 3);
  if (!items.length) return "";
  return `<div data-layout="buyer-questions" style="margin:28px 0 0;">${items
    .map(
      (q) =>
        `<p style="margin:0 0 14px;font-size:17px;line-height:1.7;color:${T.ink};word-break:keep-all;font-family:${T.familyBody};">${esc(q)}</p>`
    )
    .join("")}</div>`;
}

function ctaButton(label = "구매하기") {
  return `<p style="margin:28px 0 0;"><a href="#detail-buy" data-cta="buy" role="button" style="display:inline-block;padding:13px 22px;background:${T.ink};color:${T.paper};text-decoration:none;font-size:15px;line-height:1.3;letter-spacing:0;font-weight:500;font-family:${T.familyBody};">${esc(label)}</a></p>`;
}

function buyButton(label = "구매하기") {
  return `<p style="margin:28px 0 0;"><button type="button" data-cta="buy" style="display:inline-block;padding:13px 22px;border:0;background:${T.ink};color:${T.paper};font-size:15px;line-height:1.3;letter-spacing:0;font-weight:500;font-family:${T.familyBody};cursor:pointer;">${esc(label)}</button></p>`;
}

function uspCards(bullets, accent) {
  const items = designedListItems(bullets, 6);
  if (!items.length) return "";
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    const cells = pair
      .map((item) => {
        const colspan = pair.length === 1 ? ` colspan="2"` : "";
        const title = item.label || item.hint;
        const hint = item.label ? item.hint : "";
        return `<td${colspan} style="width:${pair.length === 1 ? "100%" : "50%"};vertical-align:top;padding:22px 20px 26px 0;">
          <p style="margin:0;font-size:22px;line-height:1.32;letter-spacing:0;color:${T.ink};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(title)}</p>
          ${hint ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:${T.muted};word-break:keep-all;font-family:${T.familyBody};">${esc(hint)}</p>` : ""}
        </td>`;
      })
      .join("");
    rows.push(`<tr>${cells}</tr>`);
  }
  return `<table data-layout="usp-cards" style="width:100%;border-collapse:collapse;margin:8px 0 0;"><tbody>${rows.join("")}</tbody></table>`;
}

function specSheet(rows, accent) {
  const list = (rows || []).filter((r) => Array.isArray(r) && r[0] && r[1]);
  if (!list.length) return "";
  const filled = list.filter((r) => !isNeedFact(r[1]));
  const missingRequired = list.filter(
    (r) => isNeedFact(r[1]) && /^(가격|중량|원산지|상품명)$/.test(r[0])
  );
  const shown = filled.length ? [...filled, ...missingRequired] : list.slice(0, 8);
  const body = shown
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
    .map((item) => {
      const title = item.label || item.hint;
      const hint = item.label ? item.hint : "";
      return `<td style="width:${width}%;vertical-align:top;padding:8px 20px 8px 0;">
        <p style="margin:0;font-size:20px;line-height:1.35;letter-spacing:0;color:${T.ink};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(title)}</p>
        ${hint ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${T.muted};word-break:keep-all;">${esc(hint)}</p>` : ""}
      </td>`;
    })
    .join("");
  return `<table data-layout="choose-steps" style="width:100%;border-collapse:separate;border-spacing:8px;margin:4px -8px 0;"><tr>${cells}</tr></table>`;
}

function pointsFive(bullets) {
  const items = designedListItems(bullets, 5);
  if (items.length < 3) return "";
  const rows = items
    .map((item) => {
      const label = item.label || item.hint;
      const value = item.label && item.hint ? item.hint : label;
      return `<tr>
        <td style="width:22%;vertical-align:top;padding:16px 16px 16px 0;border-bottom:1px solid ${T.rule};font-size:13px;line-height:1.45;color:${T.muted};font-family:${T.familyBody};">${esc(label)}</td>
        <td style="vertical-align:top;padding:16px 0;border-bottom:1px solid ${T.rule};font-size:24px;line-height:1.3;letter-spacing:0;color:${T.ink};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(value)}</td>
      </tr>`;
    })
    .join("");
  return `<table data-layout="points-5" data-ranking-slot="5-points" style="width:100%;border-collapse:collapse;margin-top:8px;">${rows}</table>`;
}

function comparePair(rows, accent) {
  const pair = (rows || []).filter((r) => Array.isArray(r) && r[0] && r[1]).slice(0, 2);
  if (pair.length < 2) return "";
  const cells = pair
    .map(
      (r, i) =>
        `<td style="width:50%;vertical-align:top;padding:28px 22px;background:${i === 0 ? T.wash : T.paper};border:1px solid ${T.rule};">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.04em;font-weight:500;color:${accent};font-family:${T.familyBody};">${esc(r[0])}</p>
          <p style="margin:0;font-size:22px;line-height:1.35;letter-spacing:0;color:${T.ink};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(r[1])}</p>
        </td>`
    )
    .join("");
  return `<table data-layout="compare-pair" style="width:100%;border-collapse:separate;border-spacing:8px;margin:8px -8px 0;"><tr>${cells}</tr></table>`;
}

function quoteHtml(text, color = T.ink) {
  const line = firstSentence(text);
  if (!line) return "";
  return `<p data-layout="observe-line" style="margin:0;max-width:14em;font-size:26px;line-height:1.4;letter-spacing:0;color:${color};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(line)}</p>`;
}

function featureList(bullets) {
  const items = designedListItems(bullets, 6);
  if (!items.length) return "";
  return `<table data-layout="feature-list" style="width:100%;border-collapse:collapse;margin-top:12px;">${items
    .map((item) => {
      const title = item.label || item.hint;
      const hint = item.label ? item.hint : "";
      return `<tr><td style="vertical-align:top;padding:14px 0;border-bottom:1px solid ${T.rule};"><p style="margin:0;font-size:20px;line-height:1.35;letter-spacing:0;color:${T.ink};font-weight:400;word-break:keep-all;font-family:${T.familyDisplay};">${esc(title)}</p>${hint ? `<p style="margin:6px 0 0;font-size:15px;line-height:1.55;color:${T.muted};word-break:keep-all;font-family:${T.familyBody};">${esc(hint)}</p>` : ""}</td></tr>`;
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

function wrapSection({ type, layout, bg, extra = "", photo, photoSlot, inner, padKind = "std" }) {
  const dir = photoSlot ? getDetailPagePhotoDirection(photoSlot) : null;
  const emptySlot =
    photoSlot && !photo
      ? ` data-photo-slot="${esc(photoSlot)}" data-photo-direction="${esc(photoSlot)}" data-photo-shot="${esc(dir?.shot || "")}" data-photo-empty="1"`
      : "";
  return `<section data-section="${esc(type)}" data-layout="${esc(layout)}"${compositionAttr(type)}${emptySlot} style="padding:0;background:${bg};border-bottom:1px solid ${T.rule};">
    ${photo || ""}
    <div style="${padBox(padKind)}${extra}">
      ${inner}
    </div>
  </section>`;
}

function renderSection(section, photoSrc, accent, productName, pack = {}) {
  const type = section.type;
  const dir = getDetailPagePhotoDirection(type);
  const photoH = dir.height || (type === "scene" ? 520 : type === "feature" ? 480 : 440);
  const photoSlot = type === "observe" || type === "feature" ? type : "";
  const alt = section.altText || section.title || productName;
  const photo = photoSrc
    ? imgFrame(photoSrc, alt, photoH, type, "", T.muted, {
        eager: type === "hero",
        inset: type === "feature",
      })
    : "";

  if (type === "hero") {
    const h = 760;
    const heroPhoto = imgFrame(photoSrc, alt, h, "hero", "", T.muted, {
      eager: true,
    });
    const { price, rest } = splitOffer(section.body, pack.price);
    const hasPrice = Boolean(price && !isNeedFact(price));
    const brand = pack.brandName
      ? `<p data-role="brand" style="margin:0 0 12px;font-size:13px;line-height:1.4;letter-spacing:0.04em;color:${T.muted};font-family:${T.familyBody};">${esc(pack.brandName)}</p>`
      : "";
    const who = rest
      ? `<p data-role="who" style="margin:10px 0 0;font-size:15px;line-height:1.5;color:${T.muted};font-family:${T.familyBody};">${esc(rest)}</p>`
      : "";
    const proof = section.proof
      ? `<p data-role="proof" style="margin:12px 0 0;font-size:15px;line-height:1.5;color:${T.muted};word-break:keep-all;font-family:${T.familyBody};">${esc(section.proof)}</p>`
      : "";
    return `<section data-section="hero" data-layout="hero-banner" data-hero="plate" data-ranking-slot="hero-banner"${compositionAttr("hero")} style="background:${T.paper};color:${T.ink};">
      ${heroPhoto}
      <div data-nameplate="1" style="background:${T.paper};color:${T.ink};${padBox("plate")}">
        ${brand}
        ${kickerHtml(section.kicker, T.muted)}
        <h1 style="margin:0;max-width:14em;font-size:${hasPrice ? 34 : T.h1}px;line-height:1.28;letter-spacing:${T.h1Track};font-weight:400;word-break:keep-all;color:${T.ink};font-family:${T.familyDisplay};">${esc(section.title)}</h1>
        ${hasPrice ? priceHtml(price, T.ink) : leadHtml(section.body, T.muted)}
        ${hasPrice ? who : ""}
        ${proof}
        ${ctaButton(section.ctaLabel || "구매하기")}
      </div>
    </section>`;
  }

  if (type === "cta") {
    const { price, rest } = splitOffer(section.body, pack.price);
    return `<section id="detail-buy" data-section="cta" data-layout="cta-bar"${compositionAttr("cta")} style="padding:0;background:${T.paper};border-top:1px solid ${T.rule};">
      <div style="${padBox("cta")}">
        ${kickerHtml(section.kicker, T.muted)}${priceHtml(price || pack.price, T.ink)}${rest ? leadHtml(rest, T.muted) : ""}${specSheet(section.rows, accent)}${buyButton(section.ctaLabel || "구매하기")}
      </div>
    </section>`;
  }

  if (type === "usp") {
    return wrapSection({
      type,
      layout: "usp-rows",
      bg: T.paper,
      padKind: "usp",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${featureList(section.bullets)}`,
    });
  }

  if (type === "spec") {
    return wrapSection({
      type,
      layout: "spec-sheet",
      bg: T.wash,
      padKind: "spec",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title, T.ink, 20)}${specSheet(section.rows, accent)}`,
    });
  }

  if (type === "observe") {
    return wrapSection({
      type,
      layout: "observe-quote",
      bg: T.paper,
      photo,
      photoSlot,
      padKind: "observe",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${quoteHtml(section.body)}`,
    });
  }

  if (type === "intent" || type === "problem") {
    return wrapSection({
      type,
      layout: "problem-band",
      bg: T.wash,
      padKind: "intent",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title, T.ink, 28)}${leadHtml(section.body, T.ink)}${questionsHtml(section.bullets)}`,
    });
  }

  if (type === "explain") {
    const points = pointsFive(section.bullets);
    const compare = points ? "" : comparePair(section.rows, accent);
    return wrapSection({
      type,
      layout: points ? "points-5" : compare ? "reason-band" : "copy-block",
      bg: T.paper,
      padKind: "explain",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${points || compare || leadHtml(section.body, T.ink)}`,
    });
  }

  if (type === "feature") {
    return wrapSection({
      type,
      layout: "feature-well",
      bg: T.wash,
      photo,
      photoSlot,
      padKind: "feature",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${leadHtml(section.body)}${featureList(section.bullets)}`,
    });
  }

  if (type === "scene") {
    return wrapSection({
      type,
      layout: "scene-bleed",
      bg: T.paper,
      padKind: "scene",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title, T.ink, 30)}${leadHtml(section.body)}`,
    });
  }

  if (type === "brand") {
    return wrapSection({
      type,
      layout: section.faqs?.length ? "faq" : "brand-quiet",
      bg: T.paper,
      padKind: "brand",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${leadHtml(section.body)}${faqHtml(section.faqs)}`,
    });
  }

  if (type === "notice") {
    return wrapSection({
      type,
      layout: "notice-quiet",
      bg: T.wash,
      padKind: "notice",
      inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title, T.ink, 20)}${leadHtml(section.body, T.ink)}${faqHtml(section.faqs)}`,
    });
  }

  return wrapSection({
    type,
    layout: "copy-block",
    bg: T.paper,
    photo,
    inner: `${kickerHtml(section.kicker, T.muted)}${h2Html(section.title)}${leadHtml(section.body)}${featureList(section.bullets)}${specSheet(section.rows, accent)}${faqHtml(section.faqs)}`,
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
    parts.push(renderSection(section, src, accent, productName, pack));
  }
  const score = pack._meta?.sqv?.score ?? "";
  const flowKey = pack._meta?.categoryFlow?.id || categoryKeyFromDetailInput(pack);
  const ranking = pack._meta?.ranking || {};
  const fontFace = `<style>${typePairingImportCss(pairing)}#gollaboda-detail-page{box-sizing:border-box;width:100%;max-width:${DETAIL_PAGE_WIDTH}px;min-width:360px;margin:0 auto;background:${T.paper};color:${T.ink};font-family:${T.familyBody};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}#gollaboda-detail-page *,#gollaboda-detail-page *::before,#gollaboda-detail-page *::after{box-sizing:border-box;}#gollaboda-detail-page img{max-width:100%;height:auto;}#gollaboda-detail-page [data-role="lead"]{font-size:18px;}#gollaboda-detail-page dd{font-size:16px;line-height:1.6;}@media (max-width:400px){#gollaboda-detail-page{min-width:0;width:100%;}#gollaboda-detail-page h1{font-size:28px;line-height:1.28;}#gollaboda-detail-page h2{font-size:22px;}#gollaboda-detail-page [data-price="1"]{font-size:32px;}}</style>`;
  return `${fontFace}<article id="gollaboda-detail-page" data-deliverable="html" data-commerce="html" data-engine="${esc(pack._meta?.engine || "")}" data-standard="${esc(pack._meta?.standardVersion || "")}" data-ranking="${esc(ranking.source || "naver-shop-rank")}" data-list-sample="${esc(ranking.listSample || "creazy")}" data-type="${esc(pairing.id)}" data-category-flow="${esc(flowKey)}" data-fonts="${esc(`${pairing.displayKo}+${pairing.displayEn}`)}" data-grade="${esc(String(score))}" data-photos="${assigned.placed}" data-ui="section-layouts" data-visual="first-glance" data-mall-ready="smartstore,coupang" ${pipelineArticleAttrs(pack)}${highlightMarker(pack.highlights)} style="width:100%;max-width:${DETAIL_PAGE_WIDTH}px;min-width:360px;margin:0 auto;background:${T.paper};color:${T.ink};font-family:${T.familyBody};">${parts.join("")}</article>`;
}

export function wrapMallHtml(bodyHtml, pack = {}, mallId = "smartstore") {
  const mall = resolveDetailPageMall(mallId);
  const pairing = applyType(pack);
  const links = pairing.hrefs
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pack.productName || DETAIL_PAGE_PRODUCT.name)}</title>${links}<style>html,body{margin:0;overflow-x:hidden;background:${T.wash};}</style></head><body data-mall="${esc(mall.id)}" data-mall-width="${esc(String(mall.width))}" data-deliverable="html" style="margin:0;background:${T.wash};font-family:${T.familyBody};">${bodyHtml}</body></html>`;
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
