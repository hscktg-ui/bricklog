/**
 * 상세페이지 디자이너가 페이지 이미지를 본다.
 * HTML 마커 점수가 아니라 860 스크린샷을 보고 출고를 판정한다.
 */
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { parseOpenAIJson } from "@/lib/prompts/parseResponse";
import { inspectDetailPageScreenshots } from "@/lib/qa/detailPagePageImage";

export const DETAIL_PAGE_DESIGNER_VISION_VERSION = "gollaboda-designer-vision-v2";
export const DETAIL_PAGE_DESIGNER_VISION_MIN = 90;

export const DETAIL_PAGE_IMAGE_DESIGNER = Object.freeze({
  id: "d01",
  name: "한지민",
  title: "롱페이지 아트디렉터",
  job: "스마트스토어 상세페이지 디자이너",
});

const SYSTEM = [
  "당신은 스마트스토어·쿠팡 상세페이지 디자이너다. 글을 읽지 말고 이미지를 본다.",
  "이 화면은 860px 상세다. 첫 컷은 첫눈, 둘째가 있으면 중간 스크롤.",
  "출고 OK: 깨진 칸 없음, 첫눈에 상품 사진, 글자 벽이 아님, 가짜 후기·모델컷·지금 바로 구매 없음. 점수는 90 이상이어야 출고.",
  "감점하면 안 되는 것: 가격·혜택·강한 CTA 없음(약한 안내가 맞다), 없는 연출컷·밥 클로즈업 요구, 막히는 점부터 시작하는 카피, 같은 포장을 크롭만 다르게 쓰는 것.",
  "감점하는 것: 컷마다 포장 디자인이 다른 상품처럼 보임.",
  "상세는 이미지여야 한다. 카피만 있는 나열이면 실패.",
  'JSON만: {"score":0-100,"pass":true,"firstGlance":true,"isImageNotEssay":true,"issues":[],"note":""}',
].join("\n");

function toDataUrl(raw) {
  if (!raw) return "";
  if (typeof raw === "string" && raw.startsWith("data:image")) return raw;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    return `data:image/png;base64,${raw.toString("base64")}`;
  }
  return "";
}

function clipDataUrl(url, maxChars = 1_800_000) {
  if (!url) return "";
  if (url.length <= maxChars) return url;
  return "";
}

/**
 * @param {{ screenshots?: object, productName?: string, brandName?: string }} args
 */
export async function reviewDetailPageDesignerImage(args = {}) {
  const screenshots = args.screenshots || {};
  const inspected = inspectDetailPageScreenshots(screenshots);
  if (!inspected.ok) {
    return {
      version: DETAIL_PAGE_DESIGNER_VISION_VERSION,
      looked: false,
      skip: "no_page_image",
      ok: false,
      score: 0,
      designer: DETAIL_PAGE_IMAGE_DESIGNER,
      inspected,
    };
  }
  if (!isOpenAIConfigured()) {
    return {
      version: DETAIL_PAGE_DESIGNER_VISION_VERSION,
      looked: false,
      skip: "no_openai",
      ok: false,
      score: 0,
      designer: DETAIL_PAGE_IMAGE_DESIGNER,
      inspected,
    };
  }

  const hero = clipDataUrl(toDataUrl(screenshots.hero || screenshots.full));
  const mid = clipDataUrl(toDataUrl(screenshots.mid || (screenshots.full === screenshots.hero ? "" : screenshots.full)));
  if (!hero) {
    return {
      version: DETAIL_PAGE_DESIGNER_VISION_VERSION,
      looked: false,
      skip: "image_too_large",
      ok: false,
      score: 0,
      designer: DETAIL_PAGE_IMAGE_DESIGNER,
      inspected,
    };
  }

  const parts = [
    {
      type: "text",
      text: [
        `${DETAIL_PAGE_IMAGE_DESIGNER.job} ${DETAIL_PAGE_IMAGE_DESIGNER.name}.`,
        `상품 ${args.productName || ""} · 브랜드 ${args.brandName || ""}.`,
        "이 이미지를 상세로 출고해도 되는지 본다.",
      ].join(" "),
    },
    { type: "image_url", image_url: { url: hero } },
  ];
  if (mid && mid !== hero) {
    parts.push({ type: "image_url", image_url: { url: mid } });
  }

  const raw = await callOpenAIChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: parts },
    ],
    { maxTokens: 700, temperature: 0.2 }
  );
  const parsed = parseOpenAIJson(raw) || {};
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 6)
    : [];
  const ok =
    score >= DETAIL_PAGE_DESIGNER_VISION_MIN &&
    parsed.isImageNotEssay !== false &&
    parsed.firstGlance !== false;

  return {
    version: DETAIL_PAGE_DESIGNER_VISION_VERSION,
    looked: true,
    skip: "",
    ok,
    score,
    pass: ok,
    firstGlance: parsed.firstGlance === true,
    isImageNotEssay: parsed.isImageNotEssay !== false,
    issues,
    note: String(parsed.note || "").slice(0, 280),
    designer: DETAIL_PAGE_IMAGE_DESIGNER,
    inspected,
  };
}
