import { ABSTRACT_INSTA_SAMPLES } from "./industryAbstractExamples";

export const INSTA_STYLE_HINTS = [
  "짧은 장면 한 줄 Hook",
  "1~2문장마다 줄바꿈",
  "블로그 장면·감정선을 캡션 리듬으로(요약·설명체 금지)",
  "이모지 2~5개(Hook·본문·마무리 포인트)",
];

const instaRhythm = ABSTRACT_INSTA_SAMPLES.flower.split("\n");
export const INSTA_RHYTHM_SAMPLE = {
  hook: instaRhythm[0] || "생각보다 꽃은",
  body: instaRhythm[1] || "기분을 빨리 바꾼다",
  ending: "",
};
