/**
 * Golden Dataset — 업종 적합도 (타 업종 어휘·과잉 주제)
 */
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

const FOREIGN_FOR_INDUSTRY = {
  flower_shop: [
    /알레르기\s*성분|원재료\s*표시|성분표|첨가물|전시\s*대|매트리스|프레임|쇼룸\s*체험|진료\s*접수/i,
  ],
  cafe: [
    /매트리스|프레임|전시\s*대|꽃다발|화환|진료\s*접수|입시\s*전략|캠페인\s*집행/i,
  ],
  tea_cafe: [/매트리스|꽃다발|진료\s*접수|입시\s*컨설/i],
  restaurant: [/매트리스|꽃다발|헤어\s*디자인|입시\s*상담/i],
  furniture: [/꽃다발|화환|무인\s*꽃|리본\s*포장|에스프레소|진료\s*과/i],
  hospital: [/꽃다발|매트리스|브런치|캠페인\s*기획/i],
  academy: [/매트리스|꽃다발|메뉴\s*판|진료\s*시간/i],
  marketing: [/매트리스|꽃다발|진료\s*접수|급여\s*방법/i],
  etc: [],
};

const OVERUSE_FOR_INDUSTRY = {
  flower_shop: [/원재료|성분|첨가물|알레르기/i],
  cafe: [/제품\s*구성|성분표|보관\s*조건|첨가물/i],
  tea_cafe: [/제품\s*구성|성분표|보관\s*조건/i],
  restaurant: [/매트리스|프레임/i],
  furniture: [/꽃\s*종류|화환/i],
};

/**
 * @param {string} full
 * @param {object} input
 */
export function scoreGoldenIndustryFit(full = "", input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const text = String(full || "");
  const foreign = FOREIGN_FOR_INDUSTRY[key] || FOREIGN_FOR_INDUSTRY.etc;
  const overuse = OVERUSE_FOR_INDUSTRY[key] || [];

  const foreignHits = [];
  for (const re of foreign) {
    if (re.test(text)) foreignHits.push(re.source);
  }

  let overuseCount = 0;
  for (const re of overuse) {
    const m = text.match(new RegExp(re.source, "g"));
    if (m) overuseCount += m.length;
  }

  let score = 100;
  score -= Math.min(40, foreignHits.length * 15);
  score -= Math.min(25, overuseCount * 8);

  return {
    score: Math.max(0, score),
    ok: score >= 88 && foreignHits.length === 0,
    industryKey: key,
    foreignHits,
    overuseCount,
  };
}
