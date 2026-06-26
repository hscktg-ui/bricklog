/**
 * 엔진 템플릿 스팸 SSOT — sovereign·delivery law 공용
 */
import { getBlogFullText } from "@/utils/qualityCheck";

export const ENGINE_SPAM_RES = [
  /덜\s*헷갈릴까요/,
  /대표\s*서비스/,
  /방문·상담/,
  /비교가\s*수월/,
  /비교하면\s*수월/,
  /목적별로\s*나눠/,
  /매장·상담에서\s*확인/,
  /왜\s*지금\s*는지/,
  /브랜드\s*자주\s*비교되는/,
  /비교\s*기준/,
  /기준이\s*조금씩\s*보였/,
  /공식\s*안내\s*기준/,
  /로컬\s*매장\s*운영/,
  /현장\s*쇼룸\s*현장/,
  /현장\s*매장\s*현장/,
  /근처\s*쇼룸/,
  /이\s*지역\s*브랜드/,
  /현장\s*쇼룸\s*근처/,
  /근처\s*매장\s*현장/,
  /단정해서\s*볼\s*일은\s*아닌/,
  /시즌\s*오픈은\s*말만\s*붙이면/,
  /초대장처럼\s*받아들이는/,
  /검색만\s*하다\s*보면\s*기준이\s*많아서/,
];

export function hasEngineSpamInText(text = "") {
  const full = String(text || "");
  return ENGINE_SPAM_RES.some((re) => re.test(full));
}

export function hasEngineSpamInPack(pack) {
  return hasEngineSpamInText(getBlogFullText(pack));
}
