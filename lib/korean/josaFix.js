/**
 * 브랜드명·매장명 뒤 조사 자동 교정 — koreanOrthographyEngine 위임
 */
export {
  fixBrandJosa,
  fixBrokenCompoundJosa,
  fixTokenJosa,
  hasHangulBatchim as hasJongseong,
  pickObjectParticle,
  pickSubjectParticle,
  pickTopicParticle,
} from "@/lib/korean/koreanOrthographyEngine";
