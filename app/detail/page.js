import { redirect } from "next/navigation";

/** 상세페이지 고객 노출 중단 — 엔진/내부 테스트만 유지 */
export default function PublicDetailPage() {
  redirect("/");
}
