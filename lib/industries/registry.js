/**
 * 업종별 Specialized Engine 레지스트리
 */
import { SCENE_DATASETS } from "@/lib/scene/sceneEngine";

export const INDUSTRY_ENGINES = {
  flower: {
    key: "flower",
    label: "Flower Engine",
    scenes: SCENE_DATASETS.flower,
    emotion: ["감사", "기념", "계절"],
    cta: ["당일 픽업", "예약", "문의"],
    style: "warm-scene",
  },
  cafe: {
    key: "cafe",
    label: "Cafe Engine",
    scenes: SCENE_DATASETS.cafe,
    emotion: ["여유", "혼자", "대화"],
    cta: ["방문", "시즌 메뉴"],
    style: "lifestyle",
  },
  hospital: {
    key: "hospital",
    label: "Hospital Engine",
    scenes: SCENE_DATASETS.hospital,
    emotion: ["신뢰", "안심"],
    cta: ["예약", "문의"],
    style: "trust-calm",
  },
  furniture: {
    key: "furniture",
    label: "Furniture Engine",
    scenes: SCENE_DATASETS.furniture,
    emotion: ["공간", "체험"],
    cta: ["상담 예약", "방문"],
    style: "premium-trust",
  },
  carwash: {
    key: "carwash",
    label: "Automotive Engine",
    scenes: SCENE_DATASETS.carwash,
    emotion: ["깔끔", "시간절약"],
    cta: ["예약"],
    style: "practical",
  },
};

export function getIndustryEngine(industryKey) {
  return (
    INDUSTRY_ENGINES[industryKey] ||
    INDUSTRY_ENGINES.flower
  );
}
