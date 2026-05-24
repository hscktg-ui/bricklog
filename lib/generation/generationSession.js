/** 생성 중 TIP·트렌드 등 부가 UI 일시 중지 */
export const GENERATION_ACTIVE_EVENT = "briclog-generation-active";

export function setGenerationSessionActive(active) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GENERATION_ACTIVE_EVENT, { detail: { active: !!active } })
  );
}
