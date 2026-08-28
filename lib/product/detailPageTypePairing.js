/**
 * 골라보다 카테고리 글꼴 — 무료 한글+영문 페어.
 * 제목은 영문 디스플레이+한글 제목체, 본문은 한글 고딕+영문 산세리프.
 * 글리프 구멍은 Pretendard로 받는다. 라이선스: SIL OFL / Google Fonts.
 */
import { DETAIL_PAGE_TYPE } from "@/lib/product/detailPageCatalog";
import { resolveIndustryCategoryKey } from "@/lib/product/industryCategoryKey";

export const DETAIL_PAGE_TYPE_PAIRING_VERSION = "gollaboda-type-v1";

const PRETENDARD_HREF =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";
const PRETENDARD = "'Pretendard Variable','Pretendard'";
const KO_SANS_FB = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','맑은 고딕',sans-serif";
const KO_SERIF_FB = "'Noto Serif KR','Batang','바탕',serif";

function googleHref(families) {
  const q = families.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

function pair({
  id,
  mood,
  label,
  displayKo,
  displayEn,
  bodyKo,
  bodyEn,
  google,
  pretendard = true,
  h1Track = "-0.03em",
  titleTrack = "-0.03em",
}) {
  const hrefs = [googleHref(google)];
  if (pretendard) hrefs.unshift(PRETENDARD_HREF);
  return {
    id,
    mood,
    label,
    displayKo,
    displayEn,
    bodyKo,
    bodyEn,
    familyDisplay: `'${displayEn}','${displayKo}',${PRETENDARD},${KO_SERIF_FB}`,
    familyBody: `'${bodyKo}','${bodyEn}',${PRETENDARD},${KO_SANS_FB}`,
    familyKicker: `'${bodyEn}','${displayKo}',${PRETENDARD},${KO_SANS_FB}`,
    familySpec: `'${bodyKo}','${bodyEn}',${PRETENDARD},ui-sans-serif,sans-serif`,
    hrefs,
    h1Track,
    titleTrack,
  };
}

/** @type {Record<string, object>} */
export const DETAIL_PAGE_TYPE_PAIRINGS = {
  cafe: pair({
    id: "cafe",
    mood: "warm-editorial",
    label: "카페 · 고운바탕 + Fraunces",
    displayKo: "Gowun Batang",
    displayEn: "Fraunces",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "Outfit",
    google: [
      "Gowun+Batang:wght@400;700",
      "Fraunces:wght@600;700",
      "IBM+Plex+Sans+KR:wght@400;500;600;700",
      "Outfit:wght@400;600",
    ],
  }),
  tea_cafe: pair({
    id: "tea_cafe",
    mood: "quiet-tea",
    label: "차 · 송명 + Cormorant",
    displayKo: "Song Myung",
    displayEn: "Cormorant Garamond",
    bodyKo: "Noto Sans KR",
    bodyEn: "Libre Baskerville",
    google: [
      "Song+Myung",
      "Cormorant+Garamond:wght@600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Libre+Baskerville:wght@400;700",
    ],
  }),
  restaurant: pair({
    id: "restaurant",
    mood: "appetite",
    label: "식당 · 함렛 + Playfair",
    displayKo: "Hahmlet",
    displayEn: "Playfair Display",
    bodyKo: "Noto Sans KR",
    bodyEn: "Karla",
    google: [
      "Hahmlet:wght@500;700",
      "Playfair+Display:wght@600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Karla:wght@400;600",
    ],
  }),
  snack: pair({
    id: "snack",
    mood: "packaged-food",
    label: "간식 · 주아 + DM Sans",
    displayKo: "Jua",
    displayEn: "DM Sans",
    bodyKo: "Noto Sans KR",
    bodyEn: "Nunito Sans",
    google: [
      "Jua",
      "DM+Sans:wght@400;600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Nunito+Sans:wght@400;600",
    ],
  }),
  grocery: pair({
    id: "grocery",
    mood: "harvest",
    label: "양곡 · 나눔명조 + Fraunces",
    displayKo: "Nanum Myeongjo",
    displayEn: "Fraunces",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "DM Sans",
    google: [
      "Nanum+Myeongjo:wght@400;700",
      "Fraunces:wght@600;700",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "DM+Sans:wght@400;600",
    ],
  }),
  salon: pair({
    id: "salon",
    mood: "refined",
    label: "살롱 · 노토세리프 + Cormorant",
    displayKo: "Noto Serif KR",
    displayEn: "Cormorant Garamond",
    bodyKo: "Noto Sans KR",
    bodyEn: "Inter",
    google: [
      "Noto+Serif+KR:wght@500;700",
      "Cormorant+Garamond:wght@600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Inter:wght@400;600",
    ],
  }),
  furniture: pair({
    id: "furniture",
    mood: "material",
    label: "가구 · 노토세리프 + Libre Baskerville",
    displayKo: "Noto Serif KR",
    displayEn: "Libre Baskerville",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "Newsreader",
    google: [
      "Noto+Serif+KR:wght@500;700",
      "Libre+Baskerville:wght@400;700",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "Newsreader:wght@400;600",
    ],
  }),
  flower: pair({
    id: "flower",
    mood: "soft",
    label: "꽃 · 고운돋움 + Fraunces",
    displayKo: "Gowun Dodum",
    displayEn: "Fraunces",
    bodyKo: "Noto Sans KR",
    bodyEn: "Nunito Sans",
    google: [
      "Gowun+Dodum",
      "Fraunces:wght@600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Nunito+Sans:wght@400;600",
    ],
  }),
  hospital: pair({
    id: "hospital",
    mood: "trust",
    label: "병원 · 노토세리프 + Source Serif",
    displayKo: "Noto Serif KR",
    displayEn: "Source Serif 4",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "IBM Plex Sans",
    google: [
      "Noto+Serif+KR:wght@500;600",
      "Source+Serif+4:wght@600;700",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "IBM+Plex+Sans:wght@400;500;600",
    ],
  }),
  lawyer: pair({
    id: "lawyer",
    mood: "formal",
    label: "법률 · 노토세리프 + Source Serif",
    displayKo: "Noto Serif KR",
    displayEn: "Source Serif 4",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "IBM Plex Sans",
    google: [
      "Noto+Serif+KR:wght@500;600",
      "Source+Serif+4:wght@600;700",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "IBM+Plex+Sans:wght@400;500;600",
    ],
  }),
  public: pair({
    id: "public",
    mood: "civic",
    label: "공공 · 고딕A1 + Source Serif",
    displayKo: "Gothic A1",
    displayEn: "Source Serif 4",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "IBM Plex Sans",
    google: [
      "Gothic+A1:wght@500;700",
      "Source+Serif+4:wght@600",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "IBM+Plex+Sans:wght@400;500",
    ],
  }),
  education: pair({
    id: "education",
    mood: "clear",
    label: "교육 · 고딕A1 + Outfit",
    displayKo: "Gothic A1",
    displayEn: "Outfit",
    bodyKo: "Noto Sans KR",
    bodyEn: "Inter",
    google: [
      "Gothic+A1:wght@500;700",
      "Outfit:wght@500;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Inter:wght@400;600",
    ],
  }),
  pension: pair({
    id: "pension",
    mood: "stay",
    label: "숙박 · 송명 + Cormorant",
    displayKo: "Song Myung",
    displayEn: "Cormorant Garamond",
    bodyKo: "Noto Sans KR",
    bodyEn: "Libre Baskerville",
    google: [
      "Song+Myung",
      "Cormorant+Garamond:wght@600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Libre+Baskerville:wght@400;700",
    ],
  }),
  craft: pair({
    id: "craft",
    mood: "handmade",
    label: "공방 · 고운바탕 + Instrument Serif",
    displayKo: "Gowun Batang",
    displayEn: "Instrument Serif",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "Karla",
    google: [
      "Gowun+Batang:wght@400;700",
      "Instrument+Serif",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "Karla:wght@400;600",
    ],
  }),
  construction: pair({
    id: "construction",
    mood: "site",
    label: "시공 · 고딕A1 + Space Grotesk",
    displayKo: "Gothic A1",
    displayEn: "Space Grotesk",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "Barlow",
    google: [
      "Gothic+A1:wght@500;700",
      "Space+Grotesk:wght@500;700",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "Barlow:wght@400;600",
    ],
  }),
  carwash: pair({
    id: "carwash",
    mood: "service",
    label: "세차 · IBM Plex + Barlow",
    displayKo: "IBM Plex Sans KR",
    displayEn: "Barlow",
    bodyKo: "Noto Sans KR",
    bodyEn: "Space Grotesk",
    google: [
      "IBM+Plex+Sans+KR:wght@500;700",
      "Barlow:wght@500;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Space+Grotesk:wght@400;600",
    ],
  }),
  saas: pair({
    id: "saas",
    mood: "product",
    label: "SaaS · 프레텐다드 + Outfit",
    displayKo: "Pretendard Variable",
    displayEn: "Outfit",
    bodyKo: "Pretendard Variable",
    bodyEn: "Inter",
    google: ["Outfit:wght@500;700", "Inter:wght@400;600"],
  }),
  marketing: pair({
    id: "marketing",
    mood: "brand",
    label: "마케팅 · 함렛 + Outfit",
    displayKo: "Hahmlet",
    displayEn: "Outfit",
    bodyKo: "Noto Sans KR",
    bodyEn: "Inter",
    google: [
      "Hahmlet:wght@500;700",
      "Outfit:wght@500;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Inter:wght@400;600",
    ],
  }),
  pet: pair({
    id: "pet",
    mood: "companion",
    label: "펫 · 고운돋움 + Nunito",
    displayKo: "Gowun Dodum",
    displayEn: "Nunito",
    bodyKo: "Noto Sans KR",
    bodyEn: "Nunito Sans",
    google: [
      "Gowun+Dodum",
      "Nunito:wght@600;700",
      "Noto+Sans+KR:wght@400;500;700",
      "Nunito+Sans:wght@400;600",
    ],
  }),
  pet_cafe: pair({
    id: "pet_cafe",
    mood: "pet-cafe",
    label: "펫카페 · 고운돋움 + Nunito",
    displayKo: "Gowun Dodum",
    displayEn: "Nunito",
    bodyKo: "IBM Plex Sans KR",
    bodyEn: "Outfit",
    google: [
      "Gowun+Dodum",
      "Nunito:wght@600;700",
      "IBM+Plex+Sans+KR:wght@400;500;700",
      "Outfit:wght@400;600",
    ],
  }),
  default: pair({
    id: "default",
    mood: "editorial",
    label: "기본 · 노토세리프 + Instrument Serif",
    displayKo: "Noto Serif KR",
    displayEn: "Instrument Serif",
    bodyKo: "Pretendard Variable",
    bodyEn: "Inter",
    google: [
      "Noto+Serif+KR:wght@500;700",
      "Instrument+Serif",
      "Inter:wght@400;600",
    ],
  }),
};

export function resolveDetailPageTypePairing(input = {}) {
  const key = resolveIndustryCategoryKey({
    industry: input.industry || input.industryLabel,
    topic: input.topic || input.productName,
    mainKeyword: input.mainKeyword || input.productName,
    brandName: input.brandName,
    storeFeatures: input.storeFeatures || input.features,
  });
  if (DETAIL_PAGE_TYPE_PAIRINGS[key]) return DETAIL_PAGE_TYPE_PAIRINGS[key];
  const stamped = input._meta?.typePairing?.id;
  if (stamped && DETAIL_PAGE_TYPE_PAIRINGS[stamped]) {
    return DETAIL_PAGE_TYPE_PAIRINGS[stamped];
  }
  return DETAIL_PAGE_TYPE_PAIRINGS.default;
}

export function summarizeTypePairing(pairing) {
  const p = pairing || DETAIL_PAGE_TYPE_PAIRINGS.default;
  return {
    id: p.id,
    mood: p.mood,
    label: p.label,
    displayKo: p.displayKo,
    displayEn: p.displayEn,
    bodyKo: p.bodyKo,
    bodyEn: p.bodyEn,
  };
}

export function typePairingImportCss(pairing) {
  const p = pairing || DETAIL_PAGE_TYPE_PAIRINGS.default;
  return p.hrefs.map((href) => `@import url('${href}');`).join("");
}

export function makeDetailPageTypeBox(pairing) {
  const p = pairing || DETAIL_PAGE_TYPE_PAIRINGS.default;
  return {
    ...DETAIL_PAGE_TYPE,
    family: p.familyBody,
    familyBody: p.familyBody,
    familyDisplay: p.familyDisplay,
    familyKicker: p.familyKicker,
    familySpec: p.familySpec,
    h1Track: p.h1Track,
    titleTrack: p.titleTrack,
    hrefs: p.hrefs,
    pairing: summarizeTypePairing(p),
  };
}
