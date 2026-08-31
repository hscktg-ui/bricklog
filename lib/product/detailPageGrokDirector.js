/**
 * 상세 듀얼 디렉터.
 * GPT-5.6 = 칸 카피·사실. Grok = 860 광고 캔버스 아트·비전.
 * Grok 키 없으면 GPT 비전만 쓰고, 아트는 스토리보드 폴백.
 */
import { callGrokChat, isGrokConfigured, GROK_VISION_MODEL } from "@/lib/llm/grokClient";
import { parseOpenAIJson } from "@/lib/prompts/parseResponse";
import { DETAIL_PAGE_MALL_SEQUENCE } from "@/lib/product/detailPageRankingPlaybook";

export const DETAIL_PAGE_DIRECTOR_VERSION = "detail-gpt-grok-director-v1";

const ALLOWED_COMPOSITIONS = Object.freeze([
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
  "listing",
]);

const ART_SYSTEM = [
  "You are a Korean ecommerce art director for 860px Smartstore/Coupang detail canvases.",
  "GPT already wrote the Korean copy. You do not invent facts, prices, certifications, or reviews.",
  "Each canvas is an advertisement plate, not a website section. No cards, buttons, FAQ, navbar.",
  "Photos have no Korean, prices, or UI. Type sits on top in HTML.",
  "Sequence is fixed: hook > info > listing > ingredient > material > spec > package > shipping > notice.",
  "Pick a different composition per canvas from the allowed list.",
  'JSON only: {"frames":[{"type":"hero","beat":"hook","composition":"dramatic_hero","imageCoverage":0.88,"photoHint":"steaming rice bowl","note":""}]}',
].join("\n");

function allowedComposition(value) {
  return ALLOWED_COMPOSITIONS.includes(value) ? value : "";
}

export function isDirectedDetailPack(pack = {}) {
  const mode = pack?._meta?.mode || "";
  return (
    pack?._meta?.edited === true ||
    pack?._meta?.director?.gpt === true ||
    pack?._meta?.director?.grok === true ||
    mode === "llm" ||
    mode === "llm-edited" ||
    mode === "directed"
  );
}

export async function stampGrokArtOnPack(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { pack, skipped: "no_sections", grok: false };
  }
  if (!isGrokConfigured()) {
    return {
      pack: stampDirectorMeta(pack, { gpt: pack._meta?.mode === "llm", grok: false, skip: "no_grok" }),
      skipped: "no_grok",
      grok: false,
    };
  }

  try {
    const raw = await callGrokChat(
      [
        { role: "system", content: ART_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            productName: input.productName || pack.productName,
            brandName: input.brandName || pack.brandName,
            mall: DETAIL_PAGE_MALL_SEQUENCE.map((s) => `${s.beat}:${s.they}`),
            compositions: ALLOWED_COMPOSITIONS,
            sections: pack.sections.map((s) => ({
              type: s.type,
              title: s.title,
              kicker: s.kicker,
              body: s.body,
            })),
          }),
        },
      ],
      { maxTokens: 1600, temperature: 0.35 }
    );
    const parsed = parseOpenAIJson(raw) || {};
    const frames = Array.isArray(parsed.frames) ? parsed.frames : [];
    const byType = Object.fromEntries(
      frames
        .filter((f) => f?.type)
        .map((f) => [f.type, f])
    );
    const sections = pack.sections.map((s) => {
      const art = byType[s.type];
      if (!art) return s;
      const composition = allowedComposition(art.composition);
      return {
        ...s,
        composition: composition || s.composition,
        purpose: art.beat || s.purpose,
        imageBrief: art.photoHint
          ? { ...(s.imageBrief || {}), prompt: art.photoHint, grok: true }
          : s.imageBrief,
        grokNote: String(art.note || "").slice(0, 160),
      };
    });
    return {
      pack: stampDirectorMeta(
        { ...pack, sections },
        { gpt: true, grok: true, frames: frames.length }
      ),
      grok: true,
      skipped: "",
    };
  } catch (err) {
    return {
      pack: stampDirectorMeta(pack, {
        gpt: pack._meta?.mode === "llm",
        grok: false,
        skip: String(err?.message || err).slice(0, 80),
      }),
      grok: false,
      skipped: "grok_error",
    };
  }
}

function stampDirectorMeta(pack, director) {
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      director: {
        version: DETAIL_PAGE_DIRECTOR_VERSION,
        gpt: director.gpt === true,
        grok: director.grok === true,
        skip: director.skip || "",
        frames: director.frames || 0,
      },
    },
  };
}

export async function reviewDetailPageWithGrok(args = {}) {
  if (!isGrokConfigured()) {
    return { looked: false, skip: "no_grok", ok: false, score: 0 };
  }
  const hero = args.heroDataUrl;
  if (!hero) return { looked: false, skip: "no_image", ok: false, score: 0 };
  const parts = [
    {
      type: "text",
      text: [
        "스마트스토어 860 상세 아트디렉터다. 글을 읽지 말고 화면을 본다.",
        `상품 ${args.productName || ""}.`,
        "웹페이지·카드·FAQ처럼 보이면 실패. 몰 상세 이미지 스택이면 통과.",
        "후킹>정보>나열>재료>원료>스펙>패키지>배송>필수정보 순이 보이는지 본다.",
        'JSON: {"score":0-100,"pass":true,"issues":[],"note":""}',
      ].join(" "),
    },
    { type: "image_url", image_url: { url: hero } },
  ];
  if (args.midDataUrl && args.midDataUrl !== hero) {
    parts.push({ type: "image_url", image_url: { url: args.midDataUrl } });
  }
  const raw = await callGrokChat(
    [
      {
        role: "system",
        content:
          "You are a Korean shopping-mall detail-page art director. Judge the screenshot, not the HTML source.",
      },
      { role: "user", content: parts },
    ],
    { model: GROK_VISION_MODEL, maxTokens: 700, temperature: 0.2 }
  );
  const parsed = parseOpenAIJson(raw) || {};
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  return {
    looked: true,
    skip: "",
    ok: score >= 90 && parsed.pass !== false,
    score,
    issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 6) : [],
    note: String(parsed.note || "").slice(0, 240),
    model: GROK_VISION_MODEL,
  };
}
