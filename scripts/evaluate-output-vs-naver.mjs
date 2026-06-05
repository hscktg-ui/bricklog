/**
 * 사용자 출력 vs 네이버 모니터링 표본(1만 건) 비교 평가
 */
import { readFileSync } from "fs";
import { join } from "path";
import { analyzeNaverBlogSample } from "../lib/channel/naverBlogLearner.js";
import { scoreBriclogEngine } from "../lib/product/briclogEngineScore.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import {
  scoreNaverVoiceDensity,
  collectNaverWriteIssues,
} from "../lib/channel/naverBlogEngineRules.js";
import { scoreNaverBlogChannelFit } from "../lib/content/naverBlogChannelGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { splitKoreanSentences } from "../lib/content/v2AxisSentencePrune.js";

const INPUT = {
  brandName: "에이스침대",
  region: "파주",
  topic: "전시 소식",
  mainKeyword: "오피모 전시 소식",
  industry: "가구/침대",
};

const USER_TEXT = `에이스침대 파주 매장, 전시 소식 솔직후기

왜 전시 소식을 찾게 되는가

✔ 파주 솔직히 에이스침대 전시 소식 보러 직접 다녀왔어요.
파주 에이스침대 전시 소식 전시·체험 구성을 쇼룸에서 직접 확인해 보세요.
파주 에이스침대 매장에서 에이스침대 — 파주 매장 체험·행사 조건 조건을 당일 안내로 짚어 봤습니다.
설치 전 통로 확보·기존 침대·매트리스 처리(회수·철거) 방법을 정리해 두었어요.
체험 시 수면 자세·불편 요소를 메모해 가면 상담 효율이 올라갑니다.
헤드·다리 각도 조절, 무중력(제로지) 모드 등은 라인업마다 지원 범위가 다릅니다.
프레임 높이·헤드보드 유무·수납 옵션은 방 동선과 맞는지 함께 보세요.
에이스침대 전시 소식 라인업은 엔트리·미드·프리미엄 등 가격대별로 나뉘는 경우가 많습니다.
매트리스 단독·프레임+매트리스·모션 베이스 조합에 따라 체험 포인트가 달라집니다.
파주 매장에서 모델별 스펙·구성 차이를 표로 정리해 받으면 비교가 수월합니다.
동일 브랜드라도 매장·행사에 따라 체험 가능 모델이 다를 수 있어 사전 확인이 필요했어요.
행사 제품의 사후 지원이 동일한지 프로모션 조건과 함께 확인했어요.

전시 소식, 왜 지금 검색하게 되는지

브랜드 매장에서 이용을 직접 확인해 봤습니다.
전시 기간·대상 라인업은 당일 안내으로 짚어 봤습니다.
일부 혜택은 특정 카드·제휴·선착순 조건이 있을 수 있습니다.
파주 방문 전에 전화로 일정·주차를 확인하고 갔어요.
누웠을 때 체압 분산·지지감·뒤척임 시 소음·진동 전달을 10분 이상 체험해 보세요.
행사 기간·대상 모델·할인율·증정품은 당일 안내으로 최종 확인했어요.

비교할 때 막히는 지점

전시 소식 — 입력·공개 맥락을 바탕으로 한 운영 포인트. 브랜드 이용 관련 개요는 매장·공식 채널 기준으로 직접 짚어 봤습니다. 파주 에이스침대에서 전시 소식 조건을 당일 안내로 짚어 봤어요. 파주 매장 주차·대중교통·영업 시간·휴무일을 방문 전에 확인했어요. 체험만 하려면 예약이 필요한 매장이 있어 전화·온라인 예약 가능 여부를 보세요. 상담 대기 시간이 긴 주말·행사 기간에는 평일 방문이 수월한 경우가 많습니다. 파트너와 함께 체험할 경우 모션 작동 시 전달감도 함께 확인했어요. 파주 에이스침대에서 전시 소식 조건을 당일 안내로 짚어 봤어요. 교환·반품 가능 기간·조건(개봉·사용 흔적)은 계약서·안내 문서로 확인했어요.

파주 에이스침대, 선택지로 볼 때

방문·예약 전에 일정을 맞추기 쉬운 구조. 방문·문의 전 예산·일정·비교 항목을 정리하면 상담이 빨라집니다. 설치 소요 시간은 보통 1~2시간 내외이나 모델·현장 상황에 따라 달라집니다. 파주 에이스침대에서 전시 소식 조건을 당일 안내로 짚어 봤어요. 인기 모델은 행사 초반에 재고가 소진될 수 있어 예약·재고 문의를 추천드려요. 보증 범위(스프링·모터·리모컨 등)와 제외 항목을 구분해 안내받으세요.

파주에서 방문·결정 전에

왜 이용을 찾게 됐는지 — 방문·상담 때문에 상담 전에 기준부터 정리했습니다.
행사·재고·설치 일정은 시기에 따라 달라질 수 있습니다.
설치 일정과 통로·층간 이동 조건은 주문 전에 매장과 맞춰 봤습니다.
단단함·지지감·온열감 선호는 사람마다 달라 '인기 모델'만으로 결정하기 어렵습니다.
배송 가능 지역·층간 이동·엘리베이터 사용 가능 여부를 주문 전에 확인했어요.
A/S 접수 채널(매장·고객센터)과 처리 기간을 미리 알아두면 편합니다.

파주 에이스침대 매장에서 체험·행사 조건을 본인 기준에 맞춰 정리해 보시면 됩니다.`;

function parseUserPack(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const title = lines[0];
  const sections = [];
  let cur = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isHeading =
      !line.startsWith("✔") &&
      line.length < 45 &&
      !/[.!?]$/.test(line) &&
      !line.startsWith("#") &&
      !/^(파주|에이스)/.test(line);
    if (isHeading) {
      if (cur) sections.push(cur);
      cur = { heading: line, body: "" };
    } else if (cur) {
      cur.body += (cur.body ? "\n\n" : "") + line.replace(/^✔\s*/, "");
    }
  }
  if (cur) sections.push(cur);
  return { title, sections };
}

function avg(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function summarizeSubset(samples) {
  const n = samples.length;
  return {
    n,
    fieldRate: pct(samples.filter((s) => s.fieldHits > 0).length, n),
    voiceRate: pct(samples.filter((s) => s.voiceHits > 0).length, n),
    checklistRate: pct(samples.filter((s) => s.checklistHits > 0).length, n),
    titleGoodRate: pct(samples.filter((s) => s.titleGood).length, n),
    avgTitleLen: Math.round(avg(samples.map((s) => s.titleLen))),
    avgFieldHits: +avg(samples.map((s) => s.fieldHits)).toFixed(2),
    avgVoiceHits: +avg(samples.map((s) => s.voiceHits)).toFixed(2),
    avgScore: +avg(samples.map((s) => s.score)).toFixed(2),
  };
}

const jsonl = readFileSync(
  join(process.cwd(), "artifacts/naver-blog-learning/samples-latest.jsonl"),
  "utf8"
);
const all = jsonl.trim().split("\n").map((l) => JSON.parse(l));

const subsets = {
  전체: all,
  가구점: all.filter((s) => s.category === "가구점"),
  "침대·가구·쇼룸": all.filter((s) =>
    /침대|가구|매트리스|쇼룸|전시|에이스|시몬스|한샘|일룸|파주/i.test(
      `${s.query} ${s.title} ${s.snippet}`
    )
  ),
  "전시·행사": all.filter((s) =>
    /전시|행사|오픈|프로모|할인/i.test(`${s.query} ${s.title} ${s.snippet}`)
  ),
  파주: all.filter((s) => /파주/i.test(`${s.query} ${s.title} ${s.snippet}`)),
};

console.log("=== 네이버 모니터링 표본 평균 (samples-latest.jsonl) ===\n");
for (const [key, samples] of Object.entries(subsets)) {
  const s = summarizeSubset(samples);
  console.log(`[${key}] n=${s.n}`);
  console.log(
    `  현장성 ${s.fieldRate}% · 구어체 ${s.voiceRate}% · 체크리스트 ${s.checklistRate}% · 제목양호 ${s.titleGoodRate}% · 제목길이 ${s.avgTitleLen}자`
  );
  console.log(
    `  avg fieldHits ${s.avgFieldHits} · voiceHits ${s.avgVoiceHits} · score ${s.avgScore}`
  );
  const top = [...samples].sort((a, b) => b.score - a.score).slice(0, 3);
  if (top.length) {
    console.log("  상위 표본:");
    for (const t of top) {
      console.log(`    · ${t.title.slice(0, 55)} (score ${t.score})`);
    }
  }
  console.log("");
}

const pack = parseUserPack(USER_TEXT);
const full = getBlogFullText(pack);
const userSnippet = full.slice(0, 600);
const userNaver = analyzeNaverBlogSample({
  title: pack.title,
  snippet: userSnippet,
  query: "파주 에이스침대 전시 후기",
});

const belief = scoreHumanBelief(full, INPUT, pack);
const checklist = scoreChecklistVoice(full, pack);
const engine = scoreBriclogEngine(pack, { input: INPUT, ...INPUT });
const naverFit = scoreNaverBlogChannelFit(pack, { input: INPUT, ...INPUT });
const voiceHits = scoreNaverVoiceDensity(full);
const naverIssues = collectNaverWriteIssues(full, INPUT);

const sentences = splitKoreanSentences(full).filter(
  (s) => s.replace(/\s/g, "").length >= 8
);
const confirmEnds = sentences.filter((s) =>
  /(?:하세요|합니다|권합니다|됩니다|필요합니다|알아두면|보세요|받으세요)\.?$/i.test(
    s.trim()
  )
).length;
const repeatDayGuide = (full.match(/당일 안내(?:로)? 짚어 봤/g) || []).length;
const topicRepeat = (full.match(/전시 소식/g) || []).length;
const placeholderHits = [
  "입력·공개 맥락",
  "방문·예약 전에",
  "조건 조건",
  "이용을 직접 확인",
].filter((p) => full.includes(p));

const furnitureBench = summarizeSubset(subsets["침대·가구·쇼룸"]);
const categoryBench = summarizeSubset(subsets.가구점);

console.log("=== 사용자 출력 평가 ===\n");
console.log("제목:", pack.title, `(${pack.title.replace(/\s/g, "").length}자)`);
console.log("섹션:", pack.sections.length);
console.log("\n[네이버 표본 지표 — 스니펫 기준]");
console.log("  fieldHits:", userNaver.fieldHits, " voiceHits:", userNaver.voiceHits);
console.log("  checklistHits:", userNaver.checklistHits, " titleGood:", userNaver.titleGood);
console.log("  naverSampleScore:", userNaver.score);

console.log("\n[BRICLOG 엔진]");
console.log("  total:", engine.total, " pass:", engine.ok, " issues:", engine.issues.join(", ") || "none");
console.log("  belief:", belief.score, belief.ok);
console.log("  checklist ok:", checklist.ok, "templateHits:", checklist.templateHits, "confirmRatio:", checklist.confirmRatio.toFixed(2));
console.log("  naverFit:", naverFit.score, naverFit.ok, naverFit.issues.join(", ") || "none");
console.log("  voiceDensity:", voiceHits);

console.log("\n[구조적 결함]");
console.log("  확인/합니다체 문장:", confirmEnds, "/", sentences.length, `(${(confirmEnds / sentences.length * 100).toFixed(0)}%)`);
console.log("  '당일 안내 짚어' 반복:", repeatDayGuide);
console.log("  '전시 소식' 반복:", topicRepeat);
console.log("  플레이스홀더:", placeholderHits.join(", ") || "none");

console.log("\n=== 벤치마크 대비 갭 ===");
const userChecklistPct = checklist.ok ? 0 : Math.round(checklist.confirmRatio * 100);
console.log(
  `구어체 voiceRate: 표본 ${categoryBench.voiceRate}% (가구) vs 우리 voiceDensity ${voiceHits} hits`
);
console.log(
  `체크리스트: 표본 ${categoryBench.checklistRate}% vs 우리 confirm문장 ~${userChecklistPct}%`
);
console.log(
  `현장성 fieldRate: 표본 ${categoryBench.fieldRate}% vs belief ${belief.score} (목표 85+)`
);
console.log(
  `제목: 표본 avg ${categoryBench.avgTitleLen}자 · good ${categoryBench.titleGoodRate}% vs 우리 ${userNaver.titleGood ? "OK" : "FAIL"} ${pack.title.replace(/\s/g, "").length}자`
);

console.log("\n=== 엔진 문제 요약 ===");
const problems = [];
if (checklist.confirmRatio > 0.15) problems.push("coverage 슬롯→섹션 덤프 (체크리스트 문장 과다)");
if (repeatDayGuide >= 3) problems.push("reframe 템플릿 반복 (당일 안내 짚어 봤어요)");
if (topicRepeat >= 8) problems.push("주제 키워드 기계 반복");
if (placeholderHits.length) problems.push("플레이스홀더/메타 문구 잔존");
if (!belief.ok) problems.push("현장 경험 서사 부족 (belief 미달)");
if (confirmEnds / sentences.length > 0.2) problems.push("합니다/하세요체 혼재");
if (pack.sections.some((s) => /왜 .* 찾게 되는/.test(s.heading) && s.body.length > 400)) {
  problems.push("Signature 제목 + coverage 본문 혼합 (칼럼 아님)");
}
if (userNaver.checklistHits > 0) problems.push("네이버 표본 기준 checklistHits > 0");
for (const p of problems) console.log(" ·", p);
if (!problems.length) console.log(" · 주요 구조 문제 없음 — LLM 경로 품질만 추가 점검");
