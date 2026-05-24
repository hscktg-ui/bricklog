import * as cafe from "./cafe";
import * as defaultPrompts from "./default";
import * as flower from "./flower";
import * as furniture from "./furniture";
import * as hospital from "./hospital";

export const PROMPT_REGISTRY = {
  flower,
  hospital,
  furniture,
  cafe,
  default: defaultPrompts,
};

export const INDUSTRY_OPTIONS = [
  { value: "flower", label: "꽃집" },
  { value: "hospital", label: "병원·의원" },
  { value: "furniture", label: "가구·인테리어" },
  { value: "cafe", label: "카페" },
  { value: "default", label: "기타 (범용)" },
];

export function getPromptModule(key) {
  return PROMPT_REGISTRY[key] || PROMPT_REGISTRY.default;
}
