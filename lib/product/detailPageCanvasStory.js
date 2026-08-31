/**
 * 상세페이지 Art Director — 웹 섹션이 아니라 광고 캔버스 스토리보드.
 * 이미지 AI는 사진만. 한글은 이 JSON 이후 타이포 엔진이 올린다.
 */
import { categoryKeyFromDetailInput } from "@/lib/product/detailPageCategoryFlow";
import { DETAIL_PAGE_WIDTH } from "@/lib/product/detailPageCatalog";
import { isNeedFact, needFact } from "@/lib/product/detailPageFactDossier";

export const DETAIL_PAGE_CANVAS_WIDTH = DETAIL_PAGE_WIDTH;

export const DETAIL_PAGE_CANVAS_COMPOSITIONS = Object.freeze([
  "full_bleed_photo",
  "centered_product",
  "macro_crop",
  "product_left",
  "product_right",
  "editorial",
  "asymmetric",
  "lifestyle",
  "typography_overlay",
  "split_visual",
  "negative_space",
  "specification",
  "dramatic_hero",
]);

export const DETAIL_PAGE_PHOTOGRAPHY_DIRECTION = Object.freeze({
  grocery:
    "Korean premium food commercial photography, appetizing food styling, realistic rice texture, natural steam, soft directional lighting, macro food photography, shallow depth of field, premium advertising campaign, editorial food photography, realistic materials, natural highlights",
  cafe:
    "Korean cafe commercial photography, roasted bean oil texture, crema, steam, warm directional window light, lifestyle coffee advertising, shallow depth of field, editorial still life, realistic materials",
  beauty:
    "Premium beauty still-life photography, glass and serum texture, softbox highlight, clean negative space, cosmetic campaign, no model face, realistic materials",
  appliance:
    "Industrial product photography, clean studio, metal and plastic materials, precise edge light, technical advertising, realistic scale",
  furniture:
    "Interior product photography, material close-up, natural room light, architectural still life, realistic wood and fabric",
  fashion:
    "Editorial garment still life, fabric drape, studio light, no fake model face, fashion campaign photography",
  default:
    "Premium commercial product photography, studio lighting, realistic materials, advertising campaign, no website UI, no text in image",
});

const RICE_SRC = {
  meal: "/detail-sample/open-rice-canvas-meal.png",
  field: "/detail-sample/open-rice-canvas-field.png",
  macro: "/detail-sample/open-rice-canvas-macro.png",
  mill: "/detail-sample/open-rice-canvas-mill.png",
  cook: "/detail-sample/open-rice-canvas-cook.png",
  pack: "/detail-sample/open-rice-canvas-pack.png",
  packLegacy: "/detail-sample/open-rice-hero.png",
  label: "/detail-sample/open-rice-observe.png",
  table: "/detail-sample/open-rice-canvas-table.png",
  finale: "/detail-sample/open-rice-canvas-finale.png",
};

const BEANS_SRC = {
  pour: "/detail-sample/open-beans-canvas-pour.png",
  macro: "/detail-sample/open-beans-canvas-macro.png",
  table: "/detail-sample/open-beans-canvas-table.png",
  pack: "/detail-sample/open-beans-hero.png",
  label: "/detail-sample/open-beans-observe.png",
  bag: "/detail-sample/open-beans-feature.png",
};

function asPhotoList(photos = []) {
  return (Array.isArray(photos) ? photos : [])
    .map((item, i) => {
      if (typeof item === "string") return { src: item, slot: i === 0 ? "hero" : "" };
      if (item?.src) return item;
      return null;
    })
    .filter(Boolean);
}

function photoBySlot(photos = [], slot) {
  const hit = asPhotoList(photos).find((p) => p?.slot === slot && p?.src);
  return hit?.src || "";
}

function isEditedPack(pack) {
  const mode = pack?._meta?.mode || "";
  return pack?._meta?.edited === true || mode === "edited" || mode === "llm-edited";
}

function overlayFromPack(pack, type, key, fallback) {
  if (!isEditedPack(pack)) return fallback;
  const section = (pack.sections || []).find((s) => s.type === type);
  if (!section) return fallback;
  if (key === "headline") return section.title || fallback;
  if (key === "sub") return section.body || fallback;
  if (key === "kicker") return section.kicker || fallback;
  return fallback;
}

function factOrNeed(value, label) {
  const v = String(value || "").trim();
  if (v && !isNeedFact(v)) return v;
  return needFact(label);
}

function photoByHint(photos = [], hint) {
  const key = String(hint || "");
  if (!key) return "";
  const hit = asPhotoList(photos).find((p) => String(p?.src || "").includes(key));
  return hit?.src || "";
}

function photoAt(photos = [], index) {
  return asPhotoList(photos)[index]?.src || "";
}

function hasRiceBank(photos = []) {
  const list = asPhotoList(photos);
  if (!list.length) return true;
  return list.some((p) => /open-rice-canvas/.test(p.src));
}

function pickRicePhoto(photos, { hint, slot, sample, index = 0 }) {
  const hinted = hint ? photoByHint(photos, hint) : "";
  if (hinted) return hinted;
  const slotted = slot ? photoBySlot(photos, slot) : "";
  if (slotted) return slotted;
  const uploaded = photoAt(photos, index);
  if (uploaded && !hasRiceBank(photos) && !/open-rice-(hero|observe|feature)/.test(uploaded)) {
    return uploaded;
  }
  if (hasRiceBank(photos) || !asPhotoList(photos).length) return sample;
  return uploaded || "";
}

export function photographyDirectionFor(input = {}) {
  const key = categoryKeyFromDetailInput(input);
  return DETAIL_PAGE_PHOTOGRAPHY_DIRECTION[key] || DETAIL_PAGE_PHOTOGRAPHY_DIRECTION.default;
}

export function isRiceCanvasProduct(pack = {}) {
  const name = `${pack.productName || ""} ${pack.presetId || ""} ${pack.id || ""}`;
  return /햅쌀|양곡|open-rice|쌀가게/.test(name);
}

export function isBeansCanvasProduct(pack = {}) {
  const name = `${pack.productName || ""} ${pack.presetId || ""} ${pack.id || ""}`;
  return /원두|블렌드|open-beans|카페/.test(name);
}

function art(partial) {
  return {
    section: partial.section,
    purpose: partial.purpose,
    message: partial.message,
    visualType: partial.visualType,
    composition: partial.composition,
    productScale: partial.productScale ?? 0.72,
    imageCoverage: partial.imageCoverage ?? 0.82,
    background: partial.background,
    camera: partial.camera,
    lighting: partial.lighting,
    textPosition: partial.textPosition,
    headlineScale: partial.headlineScale || "M",
    body: partial.body !== false,
    uiElements: false,
    photography: partial.photography,
    height: partial.height,
    ink: partial.ink,
    paper: partial.paper,
  };
}

function canvas(partial) {
  return {
    n: partial.n,
    type: partial.type,
    purpose: partial.purpose,
    composition: partial.composition,
    height: partial.height,
    imageCoverage: partial.imageCoverage,
    photo: partial.photo,
    photoSlot: partial.photoSlot || partial.type,
    photoDirection: partial.photoDirection || partial.photoSlot || partial.type,
    textPosition: partial.textPosition,
    kicker: partial.kicker || "",
    headline: partial.headline || "",
    sub: partial.sub || "",
    facts: partial.facts || [],
    ink: partial.ink || "#f4efe6",
    paper: partial.paper || "#16120e",
    art: partial.art,
  };
}

export function buildRiceCanvasStory(pack = {}, photos = []) {
  const meal = pickRicePhoto(photos, { hint: "canvas-meal", slot: "scene", sample: RICE_SRC.meal, index: 0 });
  const field = pickRicePhoto(photos, { hint: "canvas-field", sample: RICE_SRC.field, index: 1 });
  const macro = pickRicePhoto(photos, { hint: "canvas-macro", slot: "observe", sample: RICE_SRC.macro, index: 1 });
  const mill = pickRicePhoto(photos, { hint: "canvas-mill", sample: RICE_SRC.mill, index: 2 });
  const cook = pickRicePhoto(photos, { hint: "canvas-cook", sample: RICE_SRC.cook, index: 2 });
  const packShot = pickRicePhoto(photos, {
    hint: "canvas-pack",
    sample: RICE_SRC.pack,
    index: 0,
  });
  const label = packShot;
  const table = pickRicePhoto(photos, { hint: "canvas-table", sample: RICE_SRC.table, index: 3 });
  const finale = pickRicePhoto(photos, { hint: "canvas-finale", sample: RICE_SRC.finale, index: 4 });
  const photoDir = DETAIL_PAGE_PHOTOGRAPHY_DIRECTION.grocery;
  const price = factOrNeed(pack.price, "가격");
  const shipping = factOrNeed(pack.shipping, "배송비");
  const dispatch = factOrNeed(pack.dispatch, "출고 일정");
  const options = factOrNeed(pack.options, "판매 옵션");
  const island = factOrNeed(pack.islandShipping, "도서산간 배송");
  const exchange = factOrNeed(pack.exchange, "교환·환불 기준");

  const frames = [
    canvas({
      n: 1,
      type: "hero",
      purpose: "hero",
      composition: "dramatic_hero",
      height: 1400,
      imageCoverage: 0.88,
      photo: meal,
      photoSlot: "hero",
      photoDirection: "hero",
      textPosition: "upper_left",
      kicker: overlayFromPack(pack, "hero", "kicker", "여주 햅쌀"),
      headline: overlayFromPack(pack, "hero", "headline", "오늘 도정한 쌀,\n오늘의 밥맛은 다릅니다."),
      ink: "#f7f1e6",
      art: art({
        section: 1,
        purpose: "hero",
        message: "오늘 도정한 쌀, 오늘의 밥맛은 다릅니다.",
        visualType: "premium_food_photography",
        composition: "dramatic_hero",
        productScale: 0.78,
        imageCoverage: 0.88,
        background: "warm_korean_dining",
        camera: "85mm food commercial photography",
        lighting: "warm directional natural light",
        textPosition: "upper_left",
        headlineScale: "XL",
        body: false,
        photography: photoDir,
        height: 1400,
      }),
    }),
    canvas({
      n: 2,
      type: "intent",
      purpose: "origin",
      composition: "full_bleed_photo",
      height: 1200,
      imageCoverage: 0.92,
      photo: field,
      photoSlot: "scene",
      photoDirection: "scene",
      textPosition: "lower_left",
      kicker: "산지",
      headline: "들판에서 온 햅쌀",
      ink: "#f6f0e4",
      art: art({
        section: 2,
        purpose: "origin",
        message: "들판에서 온 햅쌀",
        visualType: "landscape_harvest",
        composition: "full_bleed_photo",
        productScale: 0.2,
        imageCoverage: 0.92,
        background: "yeoju_paddy_late_light",
        camera: "35mm landscape",
        lighting: "golden hour",
        textPosition: "lower_left",
        headlineScale: "M",
        photography: photoDir,
        height: 1200,
      }),
    }),
    canvas({
      n: 3,
      type: "observe",
      purpose: "texture",
      composition: "macro_crop",
      height: 1000,
      imageCoverage: 0.94,
      photo: macro,
      photoSlot: "observe",
      photoDirection: "observe",
      textPosition: "lower_left",
      kicker: "쌀알",
      headline: "",
      ink: "#f3ebd8",
      art: art({
        section: 3,
        purpose: "texture",
        message: "쌀알",
        visualType: "macro_commercial",
        composition: "macro_crop",
        productScale: 1,
        imageCoverage: 0.94,
        background: "grain_closeup",
        camera: "100mm macro",
        lighting: "soft directional",
        textPosition: "lower_left",
        headlineScale: "S",
        body: false,
        photography: photoDir,
        height: 1000,
      }),
    }),
    canvas({
      n: 4,
      type: "usp",
      purpose: "mill",
      composition: "typography_overlay",
      height: 1200,
      imageCoverage: 0.86,
      photo: mill,
      photoSlot: "feature",
      photoDirection: "feature",
      textPosition: "center_left",
      headline: "당일 도정",
      sub: "주문 받은 날 깎습니다",
      ink: "#f6f1e6",
      art: art({
        section: 4,
        purpose: "mill",
        message: "당일 도정",
        visualType: "fresh_milled_grain",
        composition: "typography_overlay",
        productScale: 0.7,
        imageCoverage: 0.86,
        background: "mill_pile",
        camera: "50mm still life",
        lighting: "warm side light",
        textPosition: "center_left",
        headlineScale: "XL",
        photography: photoDir,
        height: 1200,
      }),
    }),
    canvas({
      n: 5,
      type: "scene",
      purpose: "cook",
      composition: "lifestyle",
      height: 1200,
      imageCoverage: 0.9,
      photo: cook,
      photoSlot: "scene",
      textPosition: "upper_left",
      kicker: "짓기 전",
      headline: "씻고, 앉힌다",
      ink: "#f7f3ea",
      art: art({
        section: 5,
        purpose: "cook",
        message: "씻고, 앉힌다",
        visualType: "cook_process",
        composition: "lifestyle",
        productScale: 0.55,
        imageCoverage: 0.9,
        background: "korean_kitchen_sink",
        camera: "50mm lifestyle",
        lighting: "window light",
        textPosition: "upper_left",
        headlineScale: "L",
        photography: photoDir,
        height: 1200,
      }),
    }),
    canvas({
      n: 6,
      type: "feature",
      purpose: "package",
      composition: "centered_product",
      height: 1400,
      imageCoverage: 0.8,
      photo: packShot,
      photoSlot: "hero",
      photoDirection: "hero",
      textPosition: "lower_left",
      kicker: "",
      headline: "10kg",
      ink: "#2a241c",
      paper: "#d8c7a6",
      art: art({
        section: 6,
        purpose: "package",
        message: "진공 포장",
        visualType: "studio_packshot",
        composition: "centered_product",
        productScale: 0.82,
        imageCoverage: 0.8,
        background: "warm_studio",
        camera: "85mm product",
        lighting: "soft studio",
        textPosition: "lower_center",
        headlineScale: "L",
        photography: photoDir,
        height: 1400,
        ink: "#2a241c",
        paper: "#d8c7a6",
      }),
    }),
    canvas({
      n: 7,
      type: "explain",
      purpose: "detail",
      composition: "editorial",
      height: 1100,
      imageCoverage: 0.62,
      photo: label,
      photoSlot: "feature",
      photoDirection: "feature",
      textPosition: "right_column",
      kicker: "",
      headline: "진상",
      sub: "10kg · 진공",
      facts: [],
      ink: "#f3ead8",
      paper: "#1b1712",
      art: art({
        section: 7,
        purpose: "detail",
        message: "진상 10kg 진공",
        visualType: "editorial_pack_facts",
        composition: "editorial",
        productScale: 0.6,
        imageCoverage: 0.62,
        background: "dark_editorial",
        camera: "label close-up",
        lighting: "soft key",
        textPosition: "right_column",
        headlineScale: "L",
        photography: photoDir,
        height: 1100,
      }),
    }),
    canvas({
      n: 8,
      type: "brand",
      purpose: "table",
      composition: "asymmetric",
      height: 1200,
      imageCoverage: 0.88,
      photo: table,
      photoSlot: "scene",
      textPosition: "lower_right",
      headline: "한 끼가 된다",
      ink: "#f6efe4",
      art: art({
        section: 8,
        purpose: "table",
        message: "한 끼가 된다",
        visualType: "home_table",
        composition: "asymmetric",
        productScale: 0.45,
        imageCoverage: 0.88,
        background: "korean_home_table",
        camera: "35mm lifestyle",
        lighting: "late window light",
        textPosition: "lower_right",
        headlineScale: "L",
        body: false,
        photography: photoDir,
        height: 1200,
      }),
    }),
    canvas({
      n: 9,
      type: "spec",
      purpose: "spec",
      composition: "specification",
      height: 1000,
      imageCoverage: 0.38,
      photo: packShot,
      photoSlot: "hero",
      textPosition: "left_stack",
      kicker: "",
      headline: price,
      facts: [
        ["옵션", options],
        ["배송", shipping],
        ["출고", dispatch],
        ["도서산간", island],
        ["교환", exchange],
      ],
      ink: "#efe6d6",
      paper: "#14110e",
      art: art({
        section: 9,
        purpose: "spec",
        message: price,
        visualType: "information_field",
        composition: "specification",
        productScale: 0.35,
        imageCoverage: 0.38,
        background: "dark_info",
        camera: "pack ghosted",
        lighting: "low",
        textPosition: "left_stack",
        headlineScale: "XL",
        photography: photoDir,
        height: 1000,
      }),
    }),
    canvas({
      n: 10,
      type: "cta",
      purpose: "close",
      composition: "split_visual",
      height: 1300,
      imageCoverage: 0.84,
      photo: finale,
      photoSlot: "hero",
      textPosition: "upper_left",
      kicker: pack.brandName || "우리쌀가게",
      headline: "오늘의 밥",
      ink: "#f6efe6",
      art: art({
        section: 10,
        purpose: "close",
        message: "오늘의 밥",
        visualType: "finale_still_life",
        composition: "split_visual",
        productScale: 0.7,
        imageCoverage: 0.84,
        background: "bag_and_bowl",
        camera: "85mm still life",
        lighting: "warm window",
        textPosition: "upper_left",
        headlineScale: "L",
        photography: photoDir,
        height: 1300,
      }),
    }),
  ];

  return stampStory(pack, frames, "grocery", photoDir);
}

export function buildBeansCanvasStory(pack = {}, photos = []) {
  const pour = photoByHint(photos, "canvas-pour") || BEANS_SRC.pour;
  const macro = photoByHint(photos, "canvas-macro") || photoBySlot(photos, "observe") || BEANS_SRC.macro;
  const table = photoByHint(photos, "canvas-table") || BEANS_SRC.table;
  const packShot = photoBySlot(photos, "hero") || BEANS_SRC.pack;
  const label = photoBySlot(photos, "feature") || BEANS_SRC.label;
  const bag = photoByHint(photos, "open-beans-feature") || BEANS_SRC.bag;
  const photoDir = DETAIL_PAGE_PHOTOGRAPHY_DIRECTION.cafe;
  const price = factOrNeed(pack.price, "가격");

  const frames = [
    canvas({
      n: 1,
      type: "hero",
      purpose: "hero",
      composition: "dramatic_hero",
      height: 1400,
      imageCoverage: 0.86,
      photo: pour,
      photoSlot: "hero",
      photoDirection: "hero",
      textPosition: "upper_left",
      kicker: "하우스 블렌드",
      headline: "향은\n내려야 안다",
      ink: "#f6efe6",
      art: art({
        section: 1,
        purpose: "hero",
        message: "향은 내려야 안다",
        visualType: "espresso_pour",
        composition: "dramatic_hero",
        imageCoverage: 0.86,
        background: "cafe_counter",
        camera: "85mm cafe",
        lighting: "warm directional",
        textPosition: "upper_left",
        headlineScale: "XL",
        body: false,
        photography: photoDir,
        height: 1400,
      }),
    }),
    canvas({
      n: 2,
      type: "intent",
      purpose: "choose",
      composition: "macro_crop",
      height: 1000,
      imageCoverage: 0.93,
      photo: macro,
      photoSlot: "observe",
      photoDirection: "observe",
      textPosition: "lower_left",
      kicker: "원두",
      headline: "중배전",
      ink: "#f3eadc",
      art: art({
        section: 2,
        purpose: "choose",
        message: "중배전",
        visualType: "bean_macro",
        composition: "macro_crop",
        imageCoverage: 0.93,
        background: "bean_closeup",
        camera: "100mm macro",
        lighting: "hard highlight",
        textPosition: "lower_left",
        headlineScale: "M",
        photography: photoDir,
        height: 1000,
      }),
    }),
    canvas({
      n: 3,
      type: "observe",
      purpose: "pack",
      composition: "centered_product",
      height: 1300,
      imageCoverage: 0.78,
      photo: packShot,
      photoSlot: "hero",
      textPosition: "lower_center",
      kicker: "200g",
      headline: "밸브 포장",
      ink: "#2a2118",
      paper: "#c9b49a",
      art: art({
        section: 3,
        purpose: "pack",
        message: "밸브 포장",
        visualType: "studio_bag",
        composition: "centered_product",
        imageCoverage: 0.78,
        background: "kraft_studio",
        camera: "85mm product",
        lighting: "soft studio",
        textPosition: "lower_center",
        headlineScale: "L",
        photography: photoDir,
        height: 1300,
      }),
    }),
    canvas({
      n: 4,
      type: "usp",
      purpose: "roast",
      composition: "typography_overlay",
      height: 1100,
      imageCoverage: 0.84,
      photo: bag,
      photoSlot: "feature",
      photoDirection: "feature",
      textPosition: "center_left",
      headline: "당일 로스팅",
      sub: "주문 후 분쇄 가능",
      ink: "#f7f1e6",
      art: art({
        section: 4,
        purpose: "roast",
        message: "당일 로스팅",
        visualType: "bag_still",
        composition: "typography_overlay",
        imageCoverage: 0.84,
        background: "dark_bag",
        camera: "50mm",
        lighting: "side light",
        textPosition: "center_left",
        headlineScale: "XL",
        photography: photoDir,
        height: 1100,
      }),
    }),
    canvas({
      n: 5,
      type: "scene",
      purpose: "home",
      composition: "lifestyle",
      height: 1200,
      imageCoverage: 0.9,
      photo: table,
      photoSlot: "scene",
      textPosition: "upper_right",
      headline: "집에서 내린다",
      ink: "#f6efe6",
      art: art({
        section: 5,
        purpose: "home",
        message: "집에서 내린다",
        visualType: "home_cafe",
        composition: "lifestyle",
        imageCoverage: 0.9,
        background: "morning_table",
        camera: "35mm lifestyle",
        lighting: "window",
        textPosition: "upper_right",
        headlineScale: "L",
        photography: photoDir,
        height: 1200,
      }),
    }),
    canvas({
      n: 6,
      type: "feature",
      purpose: "label",
      composition: "product_left",
      height: 1100,
      imageCoverage: 0.64,
      photo: label,
      photoSlot: "feature",
      textPosition: "right_column",
      kicker: "원산지",
      headline: "블렌드",
      facts: [
        ["중량", "200g"],
        ["포장", "밸브"],
      ],
      ink: "#f3ead8",
      paper: "#1c1612",
      art: art({
        section: 6,
        purpose: "label",
        message: "블렌드 200g",
        visualType: "label_editorial",
        composition: "product_left",
        imageCoverage: 0.64,
        background: "dark_editorial",
        camera: "label",
        lighting: "soft",
        textPosition: "right_column",
        headlineScale: "L",
        photography: photoDir,
        height: 1100,
      }),
    }),
    canvas({
      n: 7,
      type: "explain",
      purpose: "grind",
      composition: "negative_space",
      height: 900,
      imageCoverage: 0.42,
      photo: macro,
      photoSlot: "observe",
      textPosition: "left_stack",
      kicker: "분쇄",
      headline: "홀빈\n에스프레소\n핸드드립",
      ink: "#2a2118",
      paper: "#efe6d4",
      art: art({
        section: 7,
        purpose: "grind",
        message: "홀빈 / 에스프레소 / 핸드드립",
        visualType: "option_field",
        composition: "negative_space",
        imageCoverage: 0.42,
        background: "cream_paper",
        camera: "crop",
        lighting: "flat warm",
        textPosition: "left_stack",
        headlineScale: "L",
        photography: photoDir,
        height: 900,
      }),
    }),
    canvas({
      n: 8,
      type: "brand",
      purpose: "brand",
      composition: "full_bleed_photo",
      height: 1100,
      imageCoverage: 0.91,
      photo: table,
      photoSlot: "scene",
      textPosition: "lower_left",
      headline: pack.brandName || "골목카페",
      ink: "#f6efe6",
      art: art({
        section: 8,
        purpose: "brand",
        message: pack.brandName || "골목카페",
        visualType: "brand_table",
        composition: "full_bleed_photo",
        imageCoverage: 0.91,
        background: "table",
        camera: "35mm",
        lighting: "window",
        textPosition: "lower_left",
        headlineScale: "M",
        photography: photoDir,
        height: 1100,
      }),
    }),
    canvas({
      n: 9,
      type: "spec",
      purpose: "spec",
      composition: "specification",
      height: 1000,
      imageCoverage: 0.36,
      photo: packShot,
      photoSlot: "hero",
      textPosition: "left_stack",
      kicker: "",
      headline: price,
      facts: [
        ["옵션", factOrNeed(pack.options, "판매 옵션")],
        ["배송", factOrNeed(pack.shipping, "배송비")],
        ["출고", factOrNeed(pack.dispatch, "출고 일정")],
        ["도서산간", factOrNeed(pack.islandShipping, "도서산간 배송")],
        ["교환", factOrNeed(pack.exchange, "교환·환불 기준")],
      ],
      ink: "#efe6d6",
      paper: "#14110e",
      art: art({
        section: 9,
        purpose: "spec",
        message: price,
        visualType: "information_field",
        composition: "specification",
        imageCoverage: 0.36,
        background: "dark_info",
        camera: "ghost pack",
        lighting: "low",
        textPosition: "left_stack",
        headlineScale: "XL",
        photography: photoDir,
        height: 1000,
      }),
    }),
    canvas({
      n: 10,
      type: "cta",
      purpose: "close",
      composition: "product_right",
      height: 1200,
      imageCoverage: 0.7,
      photo: pour,
      photoSlot: "hero",
      textPosition: "left_stack",
      kicker: pack.brandName || "골목카페",
      headline: "한 잔",
      ink: "#f6efe6",
      paper: "#1a1410",
      art: art({
        section: 10,
        purpose: "close",
        message: "한 잔",
        visualType: "finale_pour",
        composition: "product_right",
        imageCoverage: 0.7,
        background: "dark_pour",
        camera: "85mm",
        lighting: "warm",
        textPosition: "left_stack",
        headlineScale: "L",
        photography: photoDir,
        height: 1200,
      }),
    }),
  ];

  return stampStory(pack, frames, "cafe", photoDir);
}

const GENERIC_ROTATION = [
  "dramatic_hero",
  "full_bleed_photo",
  "macro_crop",
  "typography_overlay",
  "lifestyle",
  "centered_product",
  "editorial",
  "asymmetric",
  "specification",
  "split_visual",
  "negative_space",
];

export function buildGenericCanvasStory(pack = {}, photos = []) {
  const key = categoryKeyFromDetailInput(pack);
  const photoDir = photographyDirectionFor(pack);
  const sections = Array.isArray(pack.sections) ? pack.sections : [];
  const used = [];
  const frames = sections.map((section, i) => {
    let composition = GENERIC_ROTATION[i % GENERIC_ROTATION.length];
    if (used.slice(-2).includes(composition)) {
      composition = GENERIC_ROTATION[(i + 3) % GENERIC_ROTATION.length];
    }
    used.push(composition);
    const photo =
      photoBySlot(photos, section.type) ||
      photos[Math.min(i, Math.max(0, photos.length - 1))]?.src ||
      "";
    const imageCoverage =
      composition === "specification" ? 0.36 : composition === "editorial" ? 0.6 : 0.82;
    return canvas({
      n: i + 1,
      type: section.type,
      purpose: section.purpose || section.type,
      composition,
      height: composition === "dramatic_hero" ? 1400 : composition === "macro_crop" ? 1000 : 1200,
      imageCoverage,
      photo,
      photoSlot: section.type === "hero" || section.type === "observe" || section.type === "feature"
        ? section.type
        : section.type,
      photoDirection: section.type,
      textPosition: composition === "editorial" ? "right_column" : "upper_left",
      kicker: section.kicker || "",
      headline: section.title || pack.productName || "",
      sub: section.body || "",
      facts: Array.isArray(section.rows) ? section.rows : [],
      ink: "#f4efe6",
      paper: "#16120e",
      art: art({
        section: i + 1,
        purpose: section.purpose || section.type,
        message: section.title || pack.productName || "",
        visualType: `${key}_commercial`,
        composition,
        imageCoverage,
        background: "studio",
        camera: "85mm commercial",
        lighting: "soft directional",
        textPosition: composition === "editorial" ? "right_column" : "upper_left",
        headlineScale: i === 0 ? "XL" : "L",
        photography: photoDir,
        height: 1200,
      }),
    });
  });
  return stampStory(pack, frames, key, photoDir);
}

function stampStory(pack, frames, category, photography) {
  const compositions = frames.map((f) => f.composition);
  return {
    width: DETAIL_PAGE_CANVAS_WIDTH,
    category,
    photography,
    frames,
    sections: frames.map((f) => ({
      type: f.type,
      kicker: f.kicker,
      title: String(f.headline || "").replace(/\n/g, " "),
      body: f.sub,
      bullets: f.type === "usp" ? [f.headline, f.sub].filter(Boolean) : undefined,
      rows: f.facts?.length ? f.facts : undefined,
      composition: f.composition,
      purpose: f.purpose,
      art: f.art,
      altText: pack.productName || "",
    })),
    meta: {
      renderer: "detail-canvas",
      canvasCount: frames.length,
      compositions,
      uniqueCompositions: new Set(compositions).size,
      photography,
      category,
    },
  };
}

export function buildDetailPageCanvasStory(pack = {}, photos = []) {
  if (isRiceCanvasProduct(pack)) return buildRiceCanvasStory(pack, photos);
  if (isBeansCanvasProduct(pack)) return buildBeansCanvasStory(pack, photos);
  return buildGenericCanvasStory(pack, photos);
}

export function applyCanvasCopyToPack(pack, story) {
  if (!pack || !story?.frames?.length) return pack;
  const byType = Object.fromEntries(story.sections.map((s) => [s.type, s]));
  const sections = (pack.sections || []).map((s) => {
    const next = byType[s.type];
    if (!next) return s;
    return {
      ...s,
      title: ["intent", "explain", "scene"].includes(s.type) ? s.title : next.title || s.title,
      body: next.body || s.body,
      composition: next.composition,
      purpose: next.purpose,
      art: next.art,
      rows: s.rows?.length ? s.rows : next.rows,
      bullets: (s.bullets || []).length >= 2 ? s.bullets : next.bullets || s.bullets,
    };
  });
  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      canvas: story.meta,
      renderer: "detail-canvas",
      plan: { ...(pack._meta?.plan || {}), customOrder: true },
    },
  };
}
