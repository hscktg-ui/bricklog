/** 사용자-facing 장애 안내 (기술명 노출 금지) */

export const SERVICE_ERRORS = {
  ai_generate:
    "AI 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  ai_busy:
    "지금은 생성 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  db_save:
    "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  db_load:
    "불러오기에 실패했습니다. 새로고침 후 다시 시도해 주세요.",
  search_fail:
    "참고 정보를 가져오지 못했습니다. 입력을 조금 더 채운 뒤 「다시 받기」를 눌러 주세요.",
  asset_saved_summary_fail:
    "브랜드 자료는 저장되었지만 요약 생성에 실패했습니다. 다시 요약할 수 있습니다.",
  quota_exceeded:
    "오늘 생성 가능 횟수를 모두 사용했습니다. 내일 다시 시도해 주세요.",
  upload_fail:
    "참고 자료 등록에 실패했습니다. 파일 형식을 확인한 뒤 다시 시도해 주세요.",
  login_required: "로그인이 필요합니다.",
  unknown: "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

export function mapServiceError(code, fallback) {
  return SERVICE_ERRORS[code] || fallback || SERVICE_ERRORS.unknown;
}
