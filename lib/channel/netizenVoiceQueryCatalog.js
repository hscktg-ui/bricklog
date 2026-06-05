/**
 * 네티즌·스레드·커뮤니티 말투 학습용 검색 쿼리
 */

export const NETIZEN_LEARN_QUERIES = [
  "스레드 후기 솔직",
  "threads 체험 후기",
  "쓰레드 추천 말투",
  "스레드 맛집 후기",
  "스레드 카페 후기",
  "인스타 스레드 후기",
  "네이버 카페 솔직 후기",
  "커뮤니티 후기 말투",
  "네티즌 후기 구어체",
  "MZ 말투 후기",
  "신조어 말투 블로그",
  "요즘 말투 후기",
  "구어체 후기 블로그",
  "솔직히 말하면 후기",
  "개인적으로 추천",
  "내돈내산 솔직",
  "직접 가봤는데 후기",
  "생각보다 괜찮",
  "의외로 만족 후기",
  "해보니까 추천",
  "가보니까 솔직",
  "써보니까 후기",
  "근데 진짜 괜찮",
  "완전 만족 후기",
  "레전드 맛집 후기",
  "찐맛집 후기",
  "스레드 가구 후기",
  "스레드 병원 후기",
  "커뮤니티 맛집 추천",
  "블로그 구어체 후기",
  "해요체 후기 솔직",
  "더라구요 후기",
  "다녀왔는데 솔직",
  "방문 후기 구어",
  "체험 후기 말투",
  "로컬 맛집 솔직 후기",
  "동네 카페 후기 솔직",
  "쇼핑 후기 솔직",
  "전시 후기 솔직",
];

export function buildNetizenLearnQueries(limit = 48) {
  return NETIZEN_LEARN_QUERIES.slice(0, Math.max(8, limit));
}

export function queryNetizenHint(query = "") {
  const q = String(query || "");
  if (/스레드|threads|쓰레드/i.test(q)) return "threads";
  if (/인스타|릴스|피드/.test(q)) return "instagram";
  if (/카페|커뮤니티|네이버\s*카페/.test(q)) return "community";
  if (/MZ|신조어|요즘\s*말투/.test(q)) return "slang";
  if (/맛집|음식|식당/.test(q)) return "음식점";
  if (/카페|커피/.test(q)) return "카페";
  if (/가구|침대|전시/.test(q)) return "가구점";
  return "netizen";
}
